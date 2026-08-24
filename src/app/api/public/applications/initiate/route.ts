import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isLocalDataMode } from "@/lib/data-mode";
import {
  APPLICATIONS_BUCKET,
  createFinalizeToken,
  createReferenceCode,
  hashFinalizeToken,
  sanitizeUploadName,
} from "@/lib/public-applications";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import {
  createRequestId,
  getClientIp,
  getRequestHostname,
  hasTrustedMutationOrigin,
  PRIVATE_NO_STORE_HEADERS,
  readJsonBody,
} from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { parseApplicationPayload, PRIVACY_NOTICE_VERSION, validatePhotoDescriptors } from "@/lib/validation/application";

const MAX_INITIATE_BODY_BYTES = 64 * 1024;
const requestSchema = z.object({
  application: z.unknown(),
  files: z.unknown(),
  turnstileToken: z.string().max(4096).default(""),
  website: z.string().max(200).optional().default(""),
});

type ServiceClient = SupabaseClient<Database>;
type DealerIdentity = { id: string; slug: string };
type UploadItem = {
  id: string;
  sessionId: string;
  path: string;
  name: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  size: number;
  sortOrder: number;
};

async function createSignedUploads(supabase: ServiceClient, items: UploadItem[]) {
  return Promise.all(items.map(async (item) => {
    const { data, error } = await supabase.storage.from(APPLICATIONS_BUCKET).createSignedUploadUrl(item.path, { upsert: false });
    if (error) throw error;
    return { path: item.path, token: data.token };
  }));
}

async function findDealer(supabase: ServiceClient, slug: string): Promise<DealerIdentity | null> {
  const { data, error } = await supabase
    .from("dealers")
    .select("id, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data as DealerIdentity | null;
}

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers);
  try {
    if (isLocalDataMode()) {
      return NextResponse.json({ error: "Başvuru bu ortamda başlatılamıyor.", requestId }, { status: 409 });
    }
    if (!hasTrustedMutationOrigin(request.headers)) {
      return NextResponse.json({ error: "İstek kaynağı doğrulanamadı.", requestId }, { status: 403 });
    }

    const parsed = requestSchema.parse(await readJsonBody(request, MAX_INITIATE_BODY_BYTES));
    if (parsed.website.trim()) {
      return NextResponse.json({ ok: true, dropped: true, requestId }, { headers: PRIVATE_NO_STORE_HEADERS });
    }
    const application = parseApplicationPayload(parsed.application);
    const customDealerSlug = request.headers.get("x-custom-dealer-slug");
    if (customDealerSlug && customDealerSlug !== application.dealer_slug) {
      return NextResponse.json({ error: "Başvuru adresi doğrulanamadı.", requestId }, { status: 403 });
    }
    const files = validatePhotoDescriptors(parsed.files);
    const ip = getClientIp(request.headers);

    const ipAllowed = await consumeRateLimit(ip, {
      scope: "public-initiate-ip",
      limit: 30,
      windowSeconds: 300,
    });
    if (!ipAllowed) {
      return NextResponse.json({ error: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.", requestId }, { status: 429 });
    }

    const captchaValid = await verifyTurnstile(parsed.turnstileToken, ip, getRequestHostname(request.headers) ?? undefined);
    if (!captchaValid) return NextResponse.json({ error: "Doğrulama tamamlanamadı.", requestId }, { status: 400 });

    const supabase = createSupabaseServiceClient();
    const dealer = await findDealer(supabase, application.dealer_slug);
    if (!dealer) return NextResponse.json({ error: "Galeri başvuru kabul etmiyor.", requestId }, { status: 404 });

    const contactAllowed = await consumeRateLimit(`${ip}:${application.owner_phone}`, {
      scope: `public-form-contact:${dealer.slug}`,
      limit: 3,
      windowSeconds: 300,
    });
    if (!contactAllowed) {
      return NextResponse.json({ error: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.", requestId }, { status: 429 });
    }

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
      engine_info: application.engine_info,
      model_year: application.model_year,
      km: application.km,
      fuel_type: application.fuel_type,
      transmission: application.transmission,
      tramer_info: application.tramer_info,
      damage_info: application.damage_info,
      body_condition: application.body_condition,
      reference_code: referenceCode,
      privacy_version: PRIVACY_NOTICE_VERSION,
      privacy_acknowledged_at: now,
      submitted_at: null,
      photo_paths: [],
    });
    if (applicationError) throw applicationError;

    const { error: sessionError } = await supabase.from("upload_sessions").insert({
      id: sessionId,
      application_id: applicationId,
      finalize_token_hash: hashFinalizeToken(finalizeToken),
    });
    if (sessionError) {
      await supabase.from("applications").delete().eq("id", applicationId);
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
        throw itemsError;
      }
    }

    try {
      const uploads = await createSignedUploads(supabase, items);
      return NextResponse.json(
        { sessionId, finalizeToken, uploads, requestId },
        { headers: PRIVATE_NO_STORE_HEADERS },
      );
    } catch (error) {
      await supabase.from("applications").delete().eq("id", applicationId);
      throw error;
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { requestId, endpoint: "public-initiate" } });
    return NextResponse.json({ error: "Başvuru başlatılamadı. Lütfen tekrar deneyin.", requestId }, { status: 400 });
  }
}
