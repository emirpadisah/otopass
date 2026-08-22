import { timingSafeEqual } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  APPLICATIONS_BUCKET,
  hashFinalizeToken,
  verifyLegacyFinalizeToken,
} from "@/lib/public-applications";
import { createRequestId } from "@/lib/security/request";
import { isDuplicateKey, isMissingColumn } from "@/lib/supabase/schema-compat";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/database.types";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILES,
  MAX_FILE_SIZE,
  parseApplicationPayload,
  validatePhotoDescriptors,
} from "@/lib/validation/application";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  finalizeToken: z.string().min(32).max(32_768),
});

const legacyPayloadSchema = z.object({
  version: z.literal(1),
  expiresAt: z.number().int().positive(),
  sessionId: z.string().uuid(),
  applicationId: z.string().uuid(),
  referenceCode: z.string().min(8).max(64),
  dealer: z.object({
    id: z.string().uuid(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  }),
  application: z.unknown(),
  files: z.array(z.object({
    path: z.string().min(1).max(512),
    name: z.string().min(1).max(180),
    contentType: z.enum(ACCEPTED_IMAGE_TYPES),
    size: z.number().int().positive().max(MAX_FILE_SIZE),
  })).max(MAX_FILES),
});

type StoredItem = { path: string; size: number; contentType: string };

function matchesToken(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashFinalizeToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function verifyStoredFiles(items: StoredItem[]): Promise<boolean> {
  if (items.length === 0) return true;
  const supabase = createSupabaseServiceClient();
  const folder = items[0].path.split("/").slice(0, -1).join("/");
  const { data: storedFiles, error } = await supabase.storage.from(APPLICATIONS_BUCKET).list(folder, { limit: MAX_FILES + 5 });
  if (error) throw error;

  return items.every((item) => {
    const fileName = item.path.split("/").at(-1);
    const stored = storedFiles.find((candidate) => candidate.name === fileName);
    const size = Number(stored?.metadata?.size ?? -1);
    const mime = String(stored?.metadata?.mimetype ?? stored?.metadata?.type ?? "");
    return Boolean(stored && size === item.size && (!mime || mime === item.contentType));
  });
}

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers);
  try {
    const body = requestSchema.parse(await request.json());
    const supabase = createSupabaseServiceClient();

    if (body.finalizeToken.startsWith("legacy.")) {
      const verified = verifyLegacyFinalizeToken(body.finalizeToken);
      const payloadResult = legacyPayloadSchema.safeParse(verified);
      if (!payloadResult.success) {
        return NextResponse.json({ error: "Yükleme oturumu geçersiz veya süresi dolmuş.", requestId }, { status: 403 });
      }
      const payload = payloadResult.data;
      if (payload.sessionId !== body.sessionId || payload.expiresAt <= Date.now()) {
        return NextResponse.json({ error: "Yükleme oturumu geçersiz veya süresi dolmuş.", requestId }, { status: 403 });
      }

      const application = parseApplicationPayload(payload.application);
      const expectedPrefix = `${payload.dealer.slug}/${payload.applicationId}/`;
      if (
        application.dealer_slug !== payload.dealer.slug
        || payload.files.some((file) => !file.path.startsWith(expectedPrefix))
      ) {
        return NextResponse.json({ error: "Yükleme oturumu geçersiz.", requestId }, { status: 403 });
      }
      validatePhotoDescriptors(payload.files.map(({ name, contentType, size }) => ({ name, contentType, size })));

      const { data: dealer, error: dealerError } = await supabase
        .from("dealers")
        .select("id, slug")
        .eq("id", payload.dealer.id)
        .eq("slug", payload.dealer.slug)
        .maybeSingle();
      if (dealerError) throw dealerError;
      if (!dealer) return NextResponse.json({ error: "Galeri artık başvuru kabul etmiyor.", requestId }, { status: 404 });

      const storedItems = payload.files.map((file) => ({
        path: file.path,
        size: file.size,
        contentType: file.contentType,
      }));
      if (!(await verifyStoredFiles(storedItems))) {
        return NextResponse.json({ error: "Fotoğraf yüklemesi doğrulanamadı.", requestId }, { status: 400 });
      }

      const legacyInsert: Database["public"]["Tables"]["applications"]["Insert"] = {
        id: payload.applicationId,
        dealer_id: payload.dealer.id,
        dealer_slug: payload.dealer.slug,
        owner_name: application.owner_name,
        owner_phone: application.owner_phone,
        brand: application.brand,
        model: application.model,
        vehicle_package: application.vehicle_package,
        model_year: application.model_year,
        km: application.km,
        fuel_type: application.fuel_type,
        transmission: application.transmission,
        tramer_info: application.tramer_info,
        damage_info: application.damage_info,
        body_condition: application.body_condition,
        photo_paths: payload.files.map((file) => file.path),
      };
      let { error: insertError } = await supabase.from("applications").insert(legacyInsert);
      if (insertError && isMissingColumn(insertError, "body_condition")) {
        delete legacyInsert.body_condition;
        ({ error: insertError } = await supabase.from("applications").insert(legacyInsert));
      }
      if (insertError && isMissingColumn(insertError, "vehicle_package")) {
        delete legacyInsert.vehicle_package;
        ({ error: insertError } = await supabase.from("applications").insert(legacyInsert));
      }
      if (insertError && isDuplicateKey(insertError)) {
        const { data: existing, error: existingError } = await supabase
          .from("applications")
          .select("id, dealer_id")
          .eq("id", payload.applicationId)
          .maybeSingle();
        if (existingError) throw existingError;
        if (existing?.dealer_id === payload.dealer.id) {
          return NextResponse.json({ ok: true, referenceCode: payload.referenceCode, requestId });
        }
      }
      if (insertError) {
        await supabase.storage.from(APPLICATIONS_BUCKET).remove(payload.files.map((file) => file.path));
        throw insertError;
      }

      const { error: logError } = await supabase.from("activity_log").insert({
        dealer_id: payload.dealer.id,
        application_id: payload.applicationId,
        action: "APPLICATION_CREATED",
        metadata: { reference_code: payload.referenceCode, schema_mode: "legacy" },
      });
      if (logError) Sentry.captureException(logError, { tags: { requestId, endpoint: "public-finalize-audit" } });

      return NextResponse.json({ ok: true, referenceCode: payload.referenceCode, requestId });
    }

    const { data: session, error: sessionError } = await supabase
      .from("upload_sessions")
      .select("*")
      .eq("id", body.sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session || session.status !== "pending" || new Date(session.expires_at) <= new Date() || !matchesToken(body.finalizeToken, session.finalize_token_hash)) {
      return NextResponse.json({ error: "Yükleme oturumu geçersiz veya süresi dolmuş.", requestId }, { status: 403 });
    }

    const { data: items, error: itemsError } = await supabase
      .from("upload_items")
      .select("*")
      .eq("session_id", body.sessionId)
      .order("sort_order");
    if (itemsError) throw itemsError;

    const storedItems = (items ?? []).map((item) => ({
      path: item.object_path,
      size: item.expected_size,
      contentType: item.content_type,
    }));
    if (!(await verifyStoredFiles(storedItems))) {
      return NextResponse.json({ error: "Fotoğraf yüklemesi doğrulanamadı.", requestId }, { status: 400 });
    }

    const paths = storedItems.map((item) => item.path);
    const { data: application, error: finalizeError } = await supabase.rpc("finalize_public_application", {
      p_session_id: body.sessionId,
      p_photo_paths: paths,
    });
    if (finalizeError) throw finalizeError;

    return NextResponse.json({ ok: true, referenceCode: application.reference_code, requestId });
  } catch (error) {
    Sentry.captureException(error, { tags: { requestId, endpoint: "public-finalize" } });
    return NextResponse.json({ error: "Başvuru tamamlanamadı. Lütfen tekrar deneyin.", requestId }, { status: 400 });
  }
}
