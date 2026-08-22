import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { canManageDealerMembership } from "@/lib/auth/route";
import { requireUser } from "@/lib/auth/session";
import { DEALER_ASSET_BUCKET, DEALER_LOGO_PREFIX, getManagedDealerLogoPath } from "@/lib/dealer-branding";
import { isLocalDataMode } from "@/lib/data-mode";
import { getDealerForCurrentUser } from "@/lib/supabase/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_LOGO_SIZE = 2 * 1024 * 1024;

function detectImage(bytes: Uint8Array): { contentType: string; extension: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { contentType: "image/png", extension: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

async function getContext() {
  const actor = await requireUser();
  const membership = await getDealerForCurrentUser();
  if (!membership || !canManageDealerMembership(membership.role)) return null;
  return { actor, membership, service: createSupabaseServiceClient() };
}

export async function POST(request: Request) {
  if (isLocalDataMode()) return NextResponse.json({ error: "Logo yükleme production ortamında kullanılabilir." }, { status: 409 });
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Bu işlem için yetkiniz bulunmuyor." }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Logo dosyası seçin." }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_LOGO_SIZE) {
    return NextResponse.json({ error: "Logo en fazla 2 MB olabilir." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = detectImage(bytes);
  if (!image) return NextResponse.json({ error: "Yalnız JPG, PNG veya WebP logo yükleyebilirsiniz." }, { status: 400 });

  const { actor, membership, service } = context;
  const { data: dealer, error: dealerError } = await service
    .from("dealers")
    .select("logo_url")
    .eq("id", membership.dealer_id)
    .eq("is_active", true)
    .maybeSingle();
  if (dealerError || !dealer) return NextResponse.json({ error: "Galeri bulunamadı." }, { status: 404 });

  const objectPath = `${membership.dealer_id}/logo-${randomUUID()}.${image.extension}`;
  const { error: uploadError } = await service.storage.from(DEALER_ASSET_BUCKET).upload(objectPath, bytes, {
    contentType: image.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: "Logo yüklenemedi." }, { status: 500 });

  const storedValue = `${DEALER_LOGO_PREFIX}${objectPath}`;
  const { error: updateError } = await service.from("dealers").update({ logo_url: storedValue }).eq("id", membership.dealer_id);
  if (updateError) {
    await service.storage.from(DEALER_ASSET_BUCKET).remove([objectPath]);
    return NextResponse.json({ error: "Logo galeri profiline bağlanamadı." }, { status: 500 });
  }

  const previousPath = getManagedDealerLogoPath(dealer.logo_url);
  if (previousPath && previousPath !== objectPath) {
    await service.storage.from(DEALER_ASSET_BUCKET).remove([previousPath]);
  }
  await service.from("activity_log").insert({
    actor_user_id: actor.id,
    dealer_id: membership.dealer_id,
    action: "DEALER_LOGO_UPDATED",
    metadata: { content_type: image.contentType, size: bytes.byteLength },
  });
  revalidatePath("/dealer", "layout");

  return NextResponse.json({
    ok: true,
    logoUrl: `/api/public/dealers/${membership.dealer_id}/logo?v=${encodeURIComponent(randomUUID())}`,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  if (isLocalDataMode()) return NextResponse.json({ error: "Logo yönetimi production ortamında kullanılabilir." }, { status: 409 });
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Bu işlem için yetkiniz bulunmuyor." }, { status: 403 });
  const { actor, membership, service } = context;
  const { data: dealer } = await service.from("dealers").select("logo_url").eq("id", membership.dealer_id).maybeSingle();
  if (!dealer) return NextResponse.json({ error: "Galeri bulunamadı." }, { status: 404 });

  const { error } = await service.from("dealers").update({ logo_url: null }).eq("id", membership.dealer_id);
  if (error) return NextResponse.json({ error: "Logo kaldırılamadı." }, { status: 500 });

  const objectPath = getManagedDealerLogoPath(dealer.logo_url);
  if (objectPath) await service.storage.from(DEALER_ASSET_BUCKET).remove([objectPath]);
  await service.from("activity_log").insert({
    actor_user_id: actor.id,
    dealer_id: membership.dealer_id,
    action: "DEALER_LOGO_REMOVED",
    metadata: {},
  });
  revalidatePath("/dealer", "layout");
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
