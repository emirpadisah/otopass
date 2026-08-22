export const DEALER_ASSET_BUCKET = "dealer-assets";
export const DEALER_LOGO_PREFIX = `${DEALER_ASSET_BUCKET}/`;

export function getManagedDealerLogoPath(value: string | null | undefined): string | null {
  if (!value?.startsWith(DEALER_LOGO_PREFIX)) return null;
  const path = value.slice(DEALER_LOGO_PREFIX.length);
  return path && !path.includes("..") ? path : null;
}

export function getDealerLogoSrc(
  dealer: { id: string; logo_url: string | null; updated_at?: string },
): string | null {
  if (!dealer.logo_url) return null;
  const revision = dealer.updated_at ? `?v=${encodeURIComponent(dealer.updated_at)}` : "";
  return `/api/public/dealers/${encodeURIComponent(dealer.id)}/logo${revision}`;
}
