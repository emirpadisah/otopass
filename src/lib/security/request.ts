const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first && first.length <= 128 ? first : null;
}

export function getClientIp(headers: Headers): string {
  return firstHeaderValue(headers.get("x-vercel-forwarded-for"))
    || firstHeaderValue(headers.get("x-forwarded-for"))
    || firstHeaderValue(headers.get("x-real-ip"))
    || "0.0.0.0";
}

export function getRequestHostname(headers: Headers): string | null {
  const value = firstHeaderValue(headers.get("x-forwarded-host"))
    || firstHeaderValue(headers.get("host"));
  if (!value) return null;

  try {
    return new URL(`https://${value}`).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

export function hasTrustedMutationOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const hostname = getRequestHostname(headers);
  if (!origin || !hostname) return false;

  try {
    const parsed = new URL(origin);
    const allowedProtocol = process.env.NODE_ENV === "production"
      ? parsed.protocol === "https:"
      : parsed.protocol === "http:" || parsed.protocol === "https:";
    return allowedProtocol && parsed.hostname.toLowerCase().replace(/\.$/, "") === hostname;
  } catch {
    return false;
  }
}

export function createRequestId(headers: Headers): string {
  const candidate = headers.get("x-request-id")?.trim();
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : crypto.randomUUID();
}

export function hasJsonContentType(request: Request): boolean {
  return request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

export function isRequestBodyWithinLimit(request: Request, maxBytes: number): boolean {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return true;
  if (!/^\d+$/.test(rawLength)) return false;
  return Number(rawLength) <= maxBytes;
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  if (!hasJsonContentType(request) || !isRequestBodyWithinLimit(request, maxBytes)) {
    throw new Error("INVALID_REQUEST_BODY");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_REQUEST_BODY");
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;
