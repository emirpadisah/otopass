import "server-only";

import { domainRecordName } from "@/lib/domain-name";

const VERCEL_API = "https://api.vercel.com";
const LEGACY_APEX_VALUE = "76.76.21.21";
const LEGACY_CNAME_VALUE = "cname.vercel-dns-0.com";

type UnknownRecord = Record<string, unknown>;

export type DomainDnsRecord = {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
};

export type VercelDomainSnapshot = {
  status: "pending" | "misconfigured" | "verified";
  verification: DomainDnsRecord[];
  dnsRecords: DomainDnsRecord[];
};

export class VercelDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "VercelDomainError";
  }
}

function getConfig() {
  const token = process.env.VERCEL_API_TOKEN?.trim() || process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  if (!token || !projectId || !teamId) {
    throw new VercelDomainError("NOT_CONFIGURED", "Custom domain service is not configured.");
  }
  return { token, projectId, teamId };
}

export function isVercelDomainServiceConfigured(): boolean {
  return Boolean(
    (process.env.VERCEL_API_TOKEN?.trim() || process.env.VERCEL_TOKEN?.trim()) &&
      process.env.VERCEL_PROJECT_ID?.trim() &&
      process.env.VERCEL_TEAM_ID?.trim(),
  );
}

async function vercelRequest<T extends UnknownRecord>(path: string, init?: RequestInit): Promise<T> {
  const { token } = getConfig();
  const response = await fetch(`${VERCEL_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as UnknownRecord;

  if (!response.ok) {
    const error = payload.error && typeof payload.error === "object" ? payload.error as UnknownRecord : payload;
    const code = typeof error.code === "string" ? error.code : "VERCEL_API_ERROR";
    const message = typeof error.message === "string" ? error.message : "Vercel domain request failed.";
    throw new VercelDomainError(code, message, response.status);
  }

  return payload as T;
}

function projectDomainPath(hostname?: string) {
  const { projectId, teamId } = getConfig();
  const base = `/v9/projects/${encodeURIComponent(projectId)}/domains`;
  return `${base}${hostname ? `/${encodeURIComponent(hostname)}` : ""}?teamId=${encodeURIComponent(teamId)}`;
}

function extractRecommendedValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const ranked = [...value].sort((left, right) => {
      const leftRank = typeof left === "object" && left && typeof (left as UnknownRecord).rank === "number" ? (left as UnknownRecord).rank as number : 99;
      const rightRank = typeof right === "object" && right && typeof (right as UnknownRecord).rank === "number" ? (right as UnknownRecord).rank as number : 99;
      return leftRank - rightRank;
    });
    for (const item of ranked) {
      const result = extractRecommendedValue(item);
      if (result) return result;
    }
  }
  if (value && typeof value === "object") {
    const record = value as UnknownRecord;
    for (const key of ["value", "recommendedValue", "target"]) {
      const result = extractRecommendedValue(record[key]);
      if (result) return result;
    }
  }
  return null;
}

function parseVerification(value: unknown): DomainDnsRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as UnknownRecord;
    if (row.type !== "TXT" || typeof row.domain !== "string" || typeof row.value !== "string") return [];
    return [{ type: "TXT" as const, name: row.domain, value: row.value }];
  });
}

async function getProjectDomain(hostname: string): Promise<UnknownRecord> {
  return vercelRequest<UnknownRecord>(projectDomainPath(hostname));
}

async function getDomainConfiguration(hostname: string): Promise<UnknownRecord> {
  const { teamId } = getConfig();
  return vercelRequest<UnknownRecord>(
    `/v6/domains/${encodeURIComponent(hostname)}/config?teamId=${encodeURIComponent(teamId)}`,
  );
}

export async function addVercelProjectDomain(hostname: string): Promise<void> {
  const { projectId, teamId } = getConfig();
  try {
    await vercelRequest<UnknownRecord>(
      `/v10/projects/${encodeURIComponent(projectId)}/domains?teamId=${encodeURIComponent(teamId)}`,
      { method: "POST", body: JSON.stringify({ name: hostname }) },
    );
  } catch (error) {
    if (
      error instanceof VercelDomainError &&
      ["not_modified", "domain_already_in_use", "alias_in_use"].includes(error.code)
    ) {
      await getProjectDomain(hostname);
      return;
    }
    throw error;
  }
}

export async function inspectVercelProjectDomain(hostname: string): Promise<VercelDomainSnapshot> {
  const [projectDomain, configuration] = await Promise.all([
    getProjectDomain(hostname),
    getDomainConfiguration(hostname),
  ]);
  const apexName = typeof projectDomain.apexName === "string" ? projectDomain.apexName : null;
  const accessVerified = projectDomain.verified === true;
  const misconfigured = configuration.misconfigured !== false;
  const isApex = apexName ? hostname === apexName : false;
  const recommendedValue = isApex
    ? extractRecommendedValue(configuration.recommendedIPv4) || LEGACY_APEX_VALUE
    : extractRecommendedValue(configuration.recommendedCNAME) || LEGACY_CNAME_VALUE;

  return {
    status: !accessVerified ? "pending" : misconfigured ? "misconfigured" : "verified",
    verification: accessVerified ? [] : parseVerification(projectDomain.verification),
    dnsRecords: [{
      type: isApex ? "A" : "CNAME",
      name: domainRecordName(hostname, apexName),
      value: recommendedValue,
    }],
  };
}

export async function verifyVercelProjectDomain(hostname: string): Promise<VercelDomainSnapshot> {
  try {
    await vercelRequest<UnknownRecord>(`${projectDomainPath(hostname).replace("?", "/verify?")}`, { method: "POST" });
  } catch (error) {
    if (!(error instanceof VercelDomainError) || ![400, 403].includes(error.status ?? 0)) throw error;
  }
  return inspectVercelProjectDomain(hostname);
}

export async function removeVercelProjectDomain(hostname: string): Promise<void> {
  try {
    await vercelRequest<UnknownRecord>(projectDomainPath(hostname), { method: "DELETE" });
  } catch (error) {
    if (error instanceof VercelDomainError && error.status === 404) return;
    throw error;
  }
}

export function getFriendlyDomainError(error: unknown): string {
  if (!(error instanceof VercelDomainError)) return "Alan adı işlemi tamamlanamadı.";
  if (error.code === "NOT_CONFIGURED") return "Alan adı servisi henüz yapılandırılmadı.";
  if (["forbidden", "domain_already_in_use", "alias_in_use"].includes(error.code)) {
    return "Bu alan adı başka bir hesapta kullanılıyor olabilir. DNS sahiplik doğrulamasını kontrol edin.";
  }
  if (error.code === "custom_domain_needs_upgrade") return "Özel alan adı sınırına ulaşıldı. Sistem yöneticinizle iletişime geçin.";
  if (error.status === 429) return "Alan adı servisi yoğun. Birkaç dakika sonra yeniden deneyin.";
  return "Alan adı yapılandırılamadı. DNS bilgilerini kontrol edip yeniden deneyin.";
}
