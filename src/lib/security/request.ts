export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "0.0.0.0";
}

export function createRequestId(headers: Headers): string {
  return headers.get("x-request-id") || crypto.randomUUID();
}
