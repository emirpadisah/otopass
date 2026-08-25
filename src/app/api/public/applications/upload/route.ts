import { timingSafeEqual } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { APPLICATIONS_BUCKET, hashFinalizeToken } from "@/lib/public-applications";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import {
  createRequestId,
  getClientIp,
  hasTrustedMutationOrigin,
  PRIVATE_NO_STORE_HEADERS,
} from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { validatePhotoContent, validatePhotoFiles } from "@/lib/validation/application";

const MAX_COMPRESSED_PHOTO_BYTES = 3 * 1024 * 1024;
const requestSchema = z.object({
  sessionId: z.string().uuid(),
  finalizeToken: z.string().length(43).regex(/^[A-Za-z0-9_-]+$/),
  path: z.string().trim().min(1).max(1024),
});

function matchesToken(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashFinalizeToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function errorResponse(error: string, requestId: string, status: number) {
  return NextResponse.json({ error, requestId }, { status, headers: PRIVATE_NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers);
  try {
    if (!hasTrustedMutationOrigin(request.headers)) {
      return errorResponse("İstek kaynağı doğrulanamadı.", requestId, 403);
    }

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_COMPRESSED_PHOTO_BYTES + 64 * 1024) {
      return errorResponse("Fotoğraf boyutu çok büyük.", requestId, 413);
    }

    const formData = await request.formData();
    const parsed = requestSchema.parse({
      sessionId: formData.get("sessionId"),
      finalizeToken: formData.get("finalizeToken"),
      path: formData.get("path"),
    });
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_COMPRESSED_PHOTO_BYTES) {
      return errorResponse("Fotoğraf yüklenemedi. Lütfen daha küçük bir fotoğraf seçin.", requestId, 400);
    }

    validatePhotoFiles([file]);
    await validatePhotoContent([file]);

    const ip = getClientIp(request.headers);
    const allowed = await consumeRateLimit(`${ip}:${parsed.sessionId}`, {
      scope: "public-upload-session",
      limit: 20,
      windowSeconds: 300,
    });
    if (!allowed) {
      return errorResponse("Çok fazla yükleme denemesi yapıldı. Lütfen daha sonra tekrar deneyin.", requestId, 429);
    }

    const supabase = createSupabaseServiceClient();
    const { data: session, error: sessionError } = await supabase
      .from("upload_sessions")
      .select("status, expires_at, finalize_token_hash")
      .eq("id", parsed.sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (
      !session
      || session.status !== "pending"
      || new Date(session.expires_at) <= new Date()
      || !matchesToken(parsed.finalizeToken, session.finalize_token_hash)
    ) {
      return errorResponse("Yükleme oturumu geçersiz veya süresi dolmuş.", requestId, 403);
    }

    const { data: item, error: itemError } = await supabase
      .from("upload_items")
      .select("object_path, expected_size, content_type")
      .eq("session_id", parsed.sessionId)
      .eq("object_path", parsed.path)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item || item.expected_size !== file.size || item.content_type !== file.type) {
      return errorResponse("Fotoğraf yükleme bilgileri doğrulanamadı.", requestId, 400);
    }

    const { error: uploadError } = await supabase.storage
      .from(APPLICATIONS_BUCKET)
      .upload(item.object_path, file, {
        cacheControl: "3600",
        contentType: file.type,
        // A signed upload can reach Storage even if the mobile browser loses its response.
        // This retry is limited to the caller's pending upload item and safely replaces that same file.
        upsert: true,
      });
    if (uploadError) throw uploadError;

    return NextResponse.json({ ok: true, requestId }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    Sentry.captureException(error, { tags: { requestId, endpoint: "public-upload" } });
    return errorResponse("Fotoğraf yüklenemedi. İnternet bağlantınızı kontrol edip yeniden deneyin.", requestId, 400);
  }
}
