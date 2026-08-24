export const PRODUCTION_SITE_ORIGIN = "https://www.otokopru.com";

const PLATFORM_HOSTNAMES = new Set(["otokopru.com", "www.otokopru.com"]);

export function resolvePublicSiteOrigin(value?: string | null): string {
  if (!value?.trim()) return PRODUCTION_SITE_ORIGIN;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return PRODUCTION_SITE_ORIGIN;
    return url.origin;
  } catch {
    return PRODUCTION_SITE_ORIGIN;
  }
}

export function getPublicSiteOrigin(): string {
  return resolvePublicSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
}

export function isPlatformHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (
    !normalized
    || normalized === "localhost"
    || normalized === "127.0.0.1"
    || normalized.endsWith(".localhost")
    || normalized.endsWith(".vercel.app")
    || PLATFORM_HOSTNAMES.has(normalized)
  ) {
    return true;
  }

  return new URL(getPublicSiteOrigin()).hostname === normalized;
}
