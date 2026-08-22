import { randomBytes } from "crypto";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const domainCache = new Map<string, { slug: string | null; expiresAt: number }>();

function getRequestHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return (forwardedHost || request.headers.get("host") || request.nextUrl.hostname)
    .split(":")[0]
    .toLowerCase()
    .replace(/\.$/, "");
}

function isPlatformHostname(hostname: string): boolean {
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost") || hostname.endsWith(".vercel.app")) return true;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return false;
  try {
    return new URL(siteUrl).hostname.toLowerCase() === hostname;
  } catch {
    return false;
  }
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
    const slug = typeof row?.dealer_slug === "string" ? row.dealer_slug : null;
    domainCache.set(hostname, { slug, expiresAt: Date.now() + (slug ? 60_000 : 10_000) });
    return slug;
  } catch {
    return null;
  }
}

async function getRewriteUrl(request: NextRequest, url?: string, anonKey?: string): Promise<URL | null> {
  if (!url || !anonKey || request.method !== "GET") return null;
  const pathname = request.nextUrl.pathname;
  if (pathname !== "/" && pathname !== "/privacy") return null;
  const hostname = getRequestHostname(request);
  if (isPlatformHostname(hostname)) return null;
  const slug = await resolveCustomDomainSlug(hostname, url, anonKey);
  if (!slug) return null;
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
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", buildCsp(nonce));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const rewriteUrl = await getRewriteUrl(request, url, anonKey);
  if (rewriteUrl) {
    requestHeaders.set("x-custom-domain", getRequestHostname(request));
  }
  const createResponse = () => rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  let response = createResponse();

  if (url && anonKey) {
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
