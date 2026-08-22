const LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeCustomDomain(input: string): string {
  const value = input.trim();
  if (!value) throw new Error("DOMAIN_REQUIRED");
  if (value.includes("*")) throw new Error("WILDCARD_NOT_ALLOWED");

  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw new Error("INVALID_DOMAIN");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const labels = hostname.split(".");
  const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
  const isIpv6 = hostname.includes(":");

  if (
    !hostname ||
    hostname.length > 253 ||
    labels.length < 2 ||
    labels.some((label) => !LABEL_PATTERN.test(label)) ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".vercel.app") ||
    isIpv4 ||
    isIpv6
  ) {
    throw new Error("INVALID_DOMAIN");
  }

  return hostname;
}

export function domainRecordName(hostname: string, apexName: string | null): string {
  if (!apexName || hostname === apexName) return "@";
  const suffix = `.${apexName}`;
  return hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : hostname;
}
