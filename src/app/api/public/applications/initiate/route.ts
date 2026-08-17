import * as Sentry from "@sentry/nextjs";
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
import { createRequestId, getClientIp } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { parseApplicationPayload, PRIVACY_NOTICE_VERSION, validatePhotoDescriptors } from "@/lib/validation/application";

const requestSchema = z.object({
  application: z.unknown(),
  files: z.unknown(),
  turnstileToken: z.string().default(""),
  website: z.string().optional().default(""),
});

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

    const allowed = await consumeRateLimit(`${ip}:${application.owner_email}`, {
      scope: `public-form:${application.dealer_slug}`,
      limit: 3,
      windowSeconds: 300,
    });
    if (!allowed) return NextResponse.json({ error: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.", requestId }, { status: 429 });

    const supabase = createSupabaseServiceClient();
    const { data: dealer, error: dealerError } = await supabase
      .from("dealers")
      .select("*")
      .eq("slug", application.dealer_slug)
      .eq("is_active", true)
      .maybeSingle();
    if (dealerError) throw dealerError;
    if (!dealer) return NextResponse.json({ error: "Galeri başvuru kabul etmiyor.", requestId }, { status: 404 });

    const applicationId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const finalizeToken = createFinalizeToken();
    const referenceCode = createReferenceCode();
    const now = new Date().toISOString();

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

    const items = files.map((file, index) => ({
      id: crypto.randomUUID(),
      session_id: sessionId,
      object_path: `${dealer.slug}/${applicationId}/${index}-${crypto.randomUUID()}-${sanitizeUploadName(file.name)}.webp`,
      original_name: file.name,
      content_type: file.contentType,
      expected_size: file.size,
      sort_order: index,
    }));

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("upload_items").insert(items);
      if (itemsError) {
        await supabase.from("applications").delete().eq("id", applicationId);
        throw itemsError;
      }
    }

    const uploads = await Promise.all(items.map(async (item) => {
      const { data, error } = await supabase.storage.from(APPLICATIONS_BUCKET).createSignedUploadUrl(item.object_path, { upsert: false });
      if (error) throw error;
      return { path: item.object_path, token: data.token };
    }));

    return NextResponse.json({ sessionId, finalizeToken, uploads, requestId });
  } catch (error) {
    Sentry.captureException(error, { tags: { requestId, endpoint: "public-initiate" } });
    return NextResponse.json({ error: "Başvuru başlatılamadı. Lütfen tekrar deneyin.", requestId }, { status: 400 });
  }
}
