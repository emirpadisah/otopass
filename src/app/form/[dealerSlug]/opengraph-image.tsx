import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DEALER_ASSET_BUCKET, getManagedDealerLogoPath } from "@/lib/dealer-branding";
import { getDealerBySlug } from "@/lib/supabase/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const alt = "Galeri araç başvuru formu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const fallbackLogo = await readFile(join(process.cwd(), "public/images/otokopru-logo.png"));
const fallbackLogoDataUrl = `data:image/png;base64,${fallbackLogo.toString("base64")}`;

async function getDealerLogoDataUrl(logoUrl: string | null): Promise<string | null> {
  const objectPath = getManagedDealerLogoPath(logoUrl);
  if (!objectPath) return null;

  const service = createSupabaseServiceClient();
  const { data, error } = await service.storage.from(DEALER_ASSET_BUCKET).download(objectPath);
  if (error || !data) return null;

  const contentType = ["image/jpeg", "image/png", "image/webp"].includes(data.type)
    ? data.type
    : "image/png";
  const bytes = Buffer.from(await data.arrayBuffer());
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

export default async function DealerOpenGraphImage({
  params,
}: {
  params: Promise<{ dealerSlug: string }>;
}) {
  const { dealerSlug } = await params;
  const dealer = await getDealerBySlug(dealerSlug).catch(() => null);
  const dealerLogo = dealer ? await getDealerLogoDataUrl(dealer.logo_url).catch(() => null) : null;
  const logoSrc = dealerLogo ?? fallbackLogoDataUrl;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", color: "#111827" }}>
      <div style={{ display: "flex", width: 840, height: 430, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" width="760" height="350" style={{ width: 760, height: 350, objectFit: "contain" }} />
        {!dealerLogo ? <div style={{ marginTop: 8, fontSize: 58, fontWeight: 800, lineHeight: 1 }}>otoköprü</div> : null}
      </div>
    </div>,
    size,
  );
}
