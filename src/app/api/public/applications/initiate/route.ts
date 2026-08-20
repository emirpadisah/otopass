import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isLocalDataMode } from "@/lib/data-mode";
import {
  APPLICATIONS_BUCKET,
  createFinalizeToken,
  createLegacyFinalizeToken,
  createReferenceCode,
  hashFinalizeToken,
  sanitizeUploadName,
  type LegacyUploadItem,
} from "@/lib/public-applications";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createRequestId, getClientIp } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import type { Database } from "@/lib/supabase/database.types";
import { isMissingColumn, isMissingRelation, type DatabaseErrorLike } from "@/lib/supabase/schema-compat";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { parseApplicationPayload, PRIVACY_NOTICE_VERSION, validatePhotoDescriptors } from "@/lib/validation/application";

const requestSchema = z.object({
  application: z.unknown(),
  files: z.unknown(),
  turnstileToken: z.string().default(""),
  website: z.string().optional().default(""),
});

type ServiceClient = SupabaseClient<Database>;
type DealerIdentity = { id: string; slug: string };
type UploadItem = LegacyUploadItem & { id: string; sessionId: string; sortOrder: number };

function errorText(error: { message?: string } | null): string {
  return error?.message?.toLowerCase() ?? "";
}

async function ensureApplicationsBucket(supabase: ServiceClient): Promise<void> {
  const { data: bucket, error } = await supabase.storage.getBucket(APPLICATIONS_BUCKET);
  if (bucket) return;
  if (error && !errorText(error).includes("not found") && !errorText(error).includes("does not exist")) throw error;

  const { error: createError } = await supabase.storage.createBucket(APPLICATIONS_BUCKET, {
    public: false,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (createError && !errorText(createError).includes("already exists") && !errorText(createError).includes("duplicate")) {
    throw createError;
  }
}

async function createSignedUploads(supabase: ServiceClient, items: UploadItem[]) {
  return Promise.all(items.map(async (item) => {
    const { data, error } = await supabase.storage.from(APPLICATIONS_BUCKET).createSignedUploadUrl(item.path, { upsert: false });
    if (error) throw error;
    return { path: item.path, token: data.token };
  }));
}

function requiresLegacyApplicationSchema(error: DatabaseErrorLike | null): boolean {
  return ["owner_email", "reference_code", "privacy_version", "privacy_acknowledged_at", "submitted_at"]
    .some((column) => isMissingColumn(error, column));
}

async function findDealer(supabase: ServiceClient, slug: string): Promise<{ dealer: DealerIdentity | null; legacy: boolean }> {
  const activeResult = await supabase.from("dealers").select("id, slug").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!activeResult.error) return { dealer: activeResult.data as DealerIdentity | null, legacy: false };
  if (!isMissingColumn(activeResult.error, "is_active")) throw activeResult.error;

  const legacyResult = await supabase.from("dealers").select("id, slug").eq("slug", slug).maybeSingle();
  if (legacyResult.error) throw legacyResult.error;
  return { dealer: legacyResult.data as DealerIdentity | null, legacy: true };
}

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers);
  try {
    if (isLocalDataMode()) {
      return NextResponse.json({ error: "Local başvurular ayrı endpoint kullanır.", requestId }, { status: 409 });
    }

    const parsed = requestSchema.parse(await request.json());
    if (parsed.website.trim()) return NextResponse.json({ ok: true, dropped: true, requestId });
    const application = parseApplicationPayload(parsed.application);
    const files = validatePhotoDescriptors(parsed.files);
    const ip = getClientIp(request.headers);

    const captchaValid = await verifyTurnstile(parsed.turnstileToken, ip);
    if (!captchaValid) return NextResponse.json({ error: "Doğrulama tamamlanamadı.", requestId }, { status: 400 });

    const allowed = await consumeRateLimit(`${ip}:${application.owner_phone}`, {
      scope: `public-form:${application.dealer_slug}`,
      limit: 3,
      windowSeconds: 300,
    });
    if (!allowed) return NextResponse.json({ error: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.", requestId }, { status: 429 });

    const supabase = createSupabaseServiceClient();
    const dealerResult = await findDealer(supabase, application.dealer_slug);
    if (!dealerResult.dealer) return NextResponse.json({ error: "Galeri başvuru kabul etmiyor.", requestId }, { status: 404 });
    const dealer = dealerResult.dealer;

    await ensureApplicationsBucket(supabase);

    const applicationId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const referenceCode = createReferenceCode();
    const now = new Date().toISOString();
    const items: UploadItem[] = files.map((file, index) => ({
      id: crypto.randomUUID(),
      sessionId,
      path: `${dealer.slug}/${applicationId}/${index}-${crypto.randomUUID()}-${sanitizeUploadName(file.name)}.webp`,
      name: file.name,
      contentType: file.contentType,
      size: file.size,
      sortOrder: index,
    }));

    const legacyResponse = async () => {
      const finalizeToken = createLegacyFinalizeToken({
        version: 1,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        sessionId,
        applicationId,
        referenceCode,
        dealer,
        application,
        files: items.map(({ path, name, contentType, size }) => ({ path, name, contentType, size })),
      });
      const uploads = await createSignedUploads(supabase, items);
      return NextResponse.json({ sessionId, finalizeToken, uploads, requestId });
    };

    let useLegacySchema = dealerResult.legacy;
    if (!useLegacySchema) {
      const probe = await supabase.from("upload_sessions").select("id").limit(1);
      if (probe.error && isMissingRelation(probe.error, "upload_sessions")) useLegacySchema = true;
      else if (probe.error) throw probe.error;
    }
    if (useLegacySchema) return legacyResponse();

    const finalizeToken = createFinalizeToken();
    const { error: applicationError } = await supabase.from("applications").insert({
      id: applicationId,
      dealer_id: dealer.id,
      dealer_slug: dealer.slug,
      owner_name: application.owner_name,
      owner_phone: application.owner_phone,
      owner_email: application.owner_email,
      brand: application.brand,
      model: application.model,
      vehicle_package: application.vehicle_package,
      model_year: application.model_year,
      km: application.km,
      fuel_type: application.fuel_type,
      transmission: application.transmission,
      tramer_info: application.tramer_info,
      damage_info: application.damage_info,
      reference_code: referenceCode,
      privacy_version: PRIVACY_NOTICE_VERSION,
      privacy_acknowledged_at: now,
      submitted_at: null,
      photo_paths: [],
    });
    if (applicationError && requiresLegacyApplicationSchema(applicationError)) return legacyResponse();
    if (applicationError) throw applicationError;

    const { error: sessionError } = await supabase.from("upload_sessions").insert({
      id: sessionId,
      application_id: applicationId,
      finalize_token_hash: hashFinalizeToken(finalizeToken),
    });
    if (sessionError) {
      await supabase.from("applications").delete().eq("id", applicationId);
      if (isMissingRelation(sessionError, "upload_sessions")) return legacyResponse();
      throw sessionError;
    }

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("upload_items").insert(items.map((item) => ({
        id: item.id,
        session_id: item.sessionId,
        object_path: item.path,
        original_name: item.name,
        content_type: item.contentType,
        expected_size: item.size,
        sort_order: item.sortOrder,
      })));
      if (itemsError) {
        await supabase.from("applications").delete().eq("id", applicationId);
        if (isMissingRelation(itemsError, "upload_items")) return legacyResponse();
        throw itemsError;
      }
    }

    try {
      const uploads = await createSignedUploads(supabase, items);
      return NextResponse.json({ sessionId, finalizeToken, uploads, requestId });
    } catch (error) {
      await supabase.from("applications").delete().eq("id", applicationId);
      throw error;
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { requestId, endpoint: "public-initiate" } });
    return NextResponse.json({ error: "Başvuru başlatılamadı. Lütfen tekrar deneyin.", requestId }, { status: 400 });
  }
}
