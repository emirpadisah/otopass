import { NextResponse } from "next/server";
import { DEALER_ASSET_BUCKET, getManagedDealerLogoPath } from "@/lib/dealer-branding";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function safeLegacyLogoUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dealerId: string }> },
) {
  const { dealerId } = await params;
  const service = createSupabaseServiceClient();
  const { data: dealer, error } = await service
    .from("dealers")
    .select("logo_url")
    .eq("id", dealerId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !dealer?.logo_url) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const objectPath = getManagedDealerLogoPath(dealer.logo_url);
  if (!objectPath) {
    const legacyUrl = safeLegacyLogoUrl(dealer.logo_url);
    return legacyUrl
      ? NextResponse.redirect(legacyUrl, 307)
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!objectPath.startsWith(`${dealerId}/`)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error: downloadError } = await service.storage.from(DEALER_ASSET_BUCKET).download(objectPath);
  if (downloadError || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const contentType = ["image/jpeg", "image/png", "image/webp"].includes(data.type) ? data.type : "application/octet-stream";
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
