import { randomBytes } from "crypto";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSiteOrigin, isPlatformHostname } from "@/lib/site-url";

const domainCache = new Map<string, { slug: string | null; expiresAt: number }>();

export function shouldRefreshAuthSession(pathname: string): boolean {
  return pathname === "/admin"
    || pathname.startsWith("/admin/")
    || pathname === "/dealer"
    || pathname.startsWith("/dealer/")
    || pathname === "/login/change-password"
    || pathname === "/login/reset-password"
    || pathname === "/login/mfa/setup"
    || pathname.startsWith("/api/admin/")
    || pathname.startsWith("/api/dealer/")
    || pathname.startsWith("/api/applications/");
}

export function createSanitizedRequestHeaders(source: Headers, nonce: string): Headers {
  const requestHeaders = new Headers(source);
  requestHeaders.delete("x-custom-domain");
  requestHeaders.delete("x-custom-dealer-slug");
  requestHeaders.delete("x-auth-user-id");
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", buildCsp(nonce));
  return requestHeaders;
}

function getRequestHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return (forwardedHost || request.headers.get("host") || request.nextUrl.hostname)
    .split(":")[0]
    .toLowerCase()
    .replace(/\.$/, "");
}

async function resolveCustomDomainSlug(hostname: string, url: string, anonKey: string): Promise<string | null> {
  const cached = domainCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.slug;

  try {
    const response = await fetch(`${url}/rest/v1/rpc/resolve_dealer_domain`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_hostname: hostname }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("DOMAIN_LOOKUP_FAILED");
    const payload = await response.json() as unknown;
    const row = Array.isArray(payload) && payload[0] && typeof payload[0] === "object" ? payload[0] as { dealer_slug?: unknown } : null;
    const candidate = typeof row?.dealer_slug === "string" ? row.dealer_slug : null;
    const slug = candidate && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate) ? candidate : null;
    if (domainCache.size >= 500) {
      const now = Date.now();
      for (const [key, value] of domainCache) {
        if (value.expiresAt <= now) domainCache.delete(key);
      }
      if (domainCache.size >= 500) domainCache.delete(domainCache.keys().next().value as string);
    }
    domainCache.set(hostname, { slug, expiresAt: Date.now() + (slug ? 60_000 : 10_000) });
    return slug;
  } catch {
    return null;
  }
}

function getRewriteUrl(request: NextRequest, slug: string | null): URL | null {
  if (!slug || request.method !== "GET") return null;
  const pathname = request.nextUrl.pathname;
  if (pathname !== "/" && pathname !== "/privacy") return null;
  const destination = request.nextUrl.clone();
  destination.pathname = pathname === "/privacy" ? `/form/${slug}/privacy` : `/form/${slug}`;
  return destination;
}

function buildCsp(nonce: string): string {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  const developmentEval = process.env.NODE_ENV === "production" ? "" : "'unsafe-eval'";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${developmentEval} https://challenges.cloudflare.com`.replace(/\s+/g, " "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin} https://challenges.cloudflare.com https://*.ingest.sentry.io`.trim(),
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64");
  const requestHeaders = createSanitizedRequestHeaders(request.headers, nonce);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const hostname = getRequestHostname(request);
  let customDealerSlug: string | null = null;
  if (!isPlatformHostname(hostname)) {
    customDealerSlug = url && anonKey ? await resolveCustomDomainSlug(hostname, url, anonKey) : null;
    const publicPage = request.method === "GET" && (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/privacy");
    const publicLogo = request.method === "GET" && /^\/api\/public\/dealers\/[0-9a-f-]+\/logo$/i.test(request.nextUrl.pathname);
    const publicApplication = request.method === "POST" && [
      "/api/public/applications/initiate",
      "/api/public/applications/finalize",
    ].includes(request.nextUrl.pathname);
    if (!customDealerSlug || (!publicPage && !publicLogo && !publicApplication)) {
      if (request.method === "GET" && !request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.redirect(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, getPublicSiteOrigin()), 307);
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    requestHeaders.set("x-custom-domain", hostname);
    requestHeaders.set("x-custom-dealer-slug", customDealerSlug);
  }
  const rewriteUrl = getRewriteUrl(request, customDealerSlug);
  const createResponse = () => rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  let response = createResponse();

  if (url && anonKey && shouldRefreshAuthSession(request.nextUrl.pathname)) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = createResponse();
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getClaims();
  }

  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("x-request-id", request.headers.get("x-request-id") || crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
