import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashTrackingKey, normalizeTrackingKey, normalizeTrackingReference } from "@/lib/application-tracking";
import { isLocalDataMode } from "@/lib/data-mode";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createRequestId, getClientIp, getRequestHostname, hasTrustedMutationOrigin, PRIVATE_NO_STORE_HEADERS, readJsonBody } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const requestSchema = z.object({
  referenceCode: z.string().max(64),
  trackingKey: z.string().max(80),
  turnstileToken: z.string().max(4096),
});

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers);
  const headers = PRIVATE_NO_STORE_HEADERS;
  const invalid = () => NextResponse.json({ error: "Referans veya takip anahtarı geçersiz.", requestId }, { status: 400, headers });
  try {
    if (isLocalDataMode()) return NextResponse.json({ error: "Başvuru takibi şu anda kullanılamıyor.", requestId }, { status: 503, headers });
    if (process.env.NODE_ENV === "production" && (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY)) {
      return NextResponse.json({ error: "Başvuru takibi şu anda kullanılamıyor.", requestId }, { status: 503, headers });
    }
    if (!hasTrustedMutationOrigin(request.headers)) return NextResponse.json({ error: "İstek kaynağı doğrulanamadı.", requestId }, { status: 403, headers });
    const body = requestSchema.parse(await readJsonBody(request, 8 * 1024));
    const referenceCode = normalizeTrackingReference(body.referenceCode);
    const trackingKey = normalizeTrackingKey(body.trackingKey);
    if (!referenceCode || !trackingKey) return invalid();
    const ip = getClientIp(request.headers);
    const [ipAllowed, pairAllowed] = await Promise.all([
      consumeRateLimit(ip, { scope: "tracking-key-ip", limit: 20, windowSeconds: 900 }),
      consumeRateLimit(`${ip}:${referenceCode}`, { scope: "tracking-key-pair", limit: 10, windowSeconds: 900 }),
    ]);
    if (!ipAllowed || !pairAllowed) return NextResponse.json({ error: "Çok fazla deneme yapıldı. Daha sonra tekrar deneyin.", requestId }, { status: 429, headers });
    if (!(await verifyTurnstile(body.turnstileToken, ip, getRequestHostname(request.headers) ?? undefined, "tracking_verify"))) {
      return NextResponse.json({ error: "Doğrulama tamamlanamadı.", requestId }, { status: 400, headers });
    }

    const service = createSupabaseServiceClient();
    const { data: applicationId, error: verifyError } = await service.rpc("verify_application_tracking_key", {
      p_reference_code: referenceCode,
      p_key_hash: hashTrackingKey(trackingKey),
    });
    if (verifyError) throw verifyError;
    if (!applicationId) return invalid();

    const { data: application, error: lookupError } = await service
      .from("applications")
      .select("reference_code, brand, model, status, updated_at")
      .eq("id", applicationId)
      .not("submitted_at", "is", null)
      .is("purged_at", null)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!application) return invalid();

    return NextResponse.json({
      ok: true,
      application: {
        referenceCode: application.reference_code,
        vehicle: `${application.brand} ${application.model}`,
        status: application.status,
        updatedAt: application.updated_at,
      },
      requestId,
    }, { headers });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "tracking-verify", requestId } });
    return invalid();
  }
}
