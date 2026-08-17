import { timingSafeEqual } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { APPLICATIONS_BUCKET, hashFinalizeToken } from "@/lib/public-applications";
import { createRequestId } from "@/lib/security/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const requestSchema = z.object({ sessionId: z.string().uuid(), finalizeToken: z.string().min(32).max(256) });

function matchesToken(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashFinalizeToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers);
  try {
    const body = requestSchema.parse(await request.json());
    const supabase = createSupabaseServiceClient();
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

    const paths = (items ?? []).map((item) => item.object_path);
    if (paths.length > 0) {
      const folder = paths[0].split("/").slice(0, -1).join("/");
      const { data: storedFiles, error: listError } = await supabase.storage.from(APPLICATIONS_BUCKET).list(folder, { limit: 20 });
      if (listError) throw listError;
      for (const item of items ?? []) {
        const fileName = item.object_path.split("/").at(-1);
        const stored = storedFiles.find((candidate) => candidate.name === fileName);
        const size = Number(stored?.metadata?.size ?? -1);
        const mime = String(stored?.metadata?.mimetype ?? stored?.metadata?.type ?? "");
        if (!stored || size !== item.expected_size || (mime && mime !== item.content_type)) {
          return NextResponse.json({ error: "Fotoğraf yüklemesi doğrulanamadı.", requestId }, { status: 400 });
        }
      }
    }

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
