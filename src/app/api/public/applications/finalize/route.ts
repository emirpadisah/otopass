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
  readJsonBody,
} from "@/lib/security/request";
import { getSupabaseServiceEnv } from "@/lib/supabase/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { hasMatchingImageSignature, MAX_FILES } from "@/lib/validation/application";

const MAX_FINALIZE_BODY_BYTES = 8 * 1024;
const requestSchema = z.object({
  sessionId: z.string().uuid(),
  finalizeToken: z.string().length(43).regex(/^[A-Za-z0-9_-]+$/),
});

type StoredItem = { path: string; size: number; contentType: string };

function matchesToken(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashFinalizeToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function readStoredSignature(path: string): Promise<Uint8Array> {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();
  const response = await fetch(
    `${url}/storage/v1/object/authenticated/${encodeURIComponent(APPLICATIONS_BUCKET)}/${encodeObjectPath(path)}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Range: "bytes=0-31",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    },
  );
  if (!response.ok || !response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const { value } = await reader.read();
  await reader.cancel();
  return (value ?? new Uint8Array()).slice(0, 32);
}

async function verifyStoredFiles(items: StoredItem[]): Promise<boolean> {
  if (items.length === 0) return false;
  if (items.length > MAX_FILES) return false;
  const supabase = createSupabaseServiceClient();
  const folder = items[0].path.split("/").slice(0, -1).join("/");
  if (!folder || items.some((item) => !item.path.startsWith(`${folder}/`))) return false;

  const { data: storedFiles, error } = await supabase.storage
    .from(APPLICATIONS_BUCKET)
    .list(folder, { limit: MAX_FILES + 5 });
  if (error) throw error;

  for (const item of items) {
    const fileName = item.path.split("/").at(-1);
    const stored = storedFiles.find((candidate) => candidate.name === fileName);
    const size = Number(stored?.metadata?.size ?? -1);
    const mime = String(stored?.metadata?.mimetype ?? stored?.metadata?.type ?? "");
    if (!stored || size !== item.size || (mime && mime !== item.contentType)) return false;

  }
  const signatures = await Promise.all(items.map((item) => readStoredSignature(item.path)));
  return signatures.every((signature, index) => hasMatchingImageSignature(signature, items[index].contentType));
}

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers);
  try {
    if (!hasTrustedMutationOrigin(request.headers)) {
      return NextResponse.json(
        { error: "İstek kaynağı doğrulanamadı.", requestId },
        { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    const body = requestSchema.parse(await readJsonBody(request, MAX_FINALIZE_BODY_BYTES));
    const ip = getClientIp(request.headers);
    const [ipAllowed, sessionAllowed] = await Promise.all([
      consumeRateLimit(ip, { scope: "public-finalize-ip", limit: 30, windowSeconds: 300 }),
      consumeRateLimit(`${ip}:${body.sessionId}`, { scope: "public-finalize-session", limit: 8, windowSeconds: 300 }),
    ]);
    if (!ipAllowed || !sessionAllowed) {
      return NextResponse.json(
        { error: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.", requestId },
        { status: 429, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    const supabase = createSupabaseServiceClient();
    const { data: session, error: sessionError } = await supabase
      .from("upload_sessions")
      .select("id, status, expires_at, finalize_token_hash")
      .eq("id", body.sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (
      !session
      || session.status !== "pending"
      || new Date(session.expires_at) <= new Date()
      || !matchesToken(body.finalizeToken, session.finalize_token_hash)
    ) {
      return NextResponse.json(
        { error: "Yükleme oturumu geçersiz veya süresi dolmuş.", requestId },
        { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from("upload_items")
      .select("object_path, expected_size, content_type, sort_order")
      .eq("session_id", body.sessionId)
      .order("sort_order");
    if (itemsError) throw itemsError;

    const storedItems = (items ?? []).map((item) => ({
      path: item.object_path,
      size: item.expected_size,
      contentType: item.content_type,
    }));
    if (!(await verifyStoredFiles(storedItems))) {
      return NextResponse.json(
        { error: "Fotoğraf yüklemesi doğrulanamadı.", requestId },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    const { data: application, error: finalizeError } = await supabase.rpc("finalize_public_application", {
      p_session_id: body.sessionId,
      p_photo_paths: storedItems.map((item) => item.path),
    });
    if (finalizeError) throw finalizeError;

    return NextResponse.json(
      { ok: true, referenceCode: application.reference_code, requestId },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    Sentry.captureException(error, { tags: { requestId, endpoint: "public-finalize" } });
    return NextResponse.json(
      { error: "Başvuru tamamlanamadı. Lütfen tekrar deneyin.", requestId },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}
