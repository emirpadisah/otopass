import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { ApplicationInput } from "@/lib/types";

export const APPLICATIONS_BUCKET = "applications";

export function createReferenceCode(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `OTP-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function createFinalizeToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashFinalizeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type LegacyUploadItem = {
  path: string;
  name: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  size: number;
};

export type LegacyFinalizePayload = {
  version: 1;
  expiresAt: number;
  sessionId: string;
  applicationId: string;
  referenceCode: string;
  dealer: { id: string; slug: string };
  application: ApplicationInput;
  files: LegacyUploadItem[];
};

function finalizeSigningSecret(): string {
  const secret = process.env.APPLICATION_UPLOAD_HMAC_SECRET?.trim()
    || process.env.RATE_LIMIT_HMAC_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Application upload signing secret is not configured.");
  return secret;
}

export function createLegacyFinalizeToken(payload: LegacyFinalizePayload, secret = finalizeSigningSecret()): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(`pol-car:legacy-upload:v1:${encoded}`).digest("base64url");
  return `legacy.${encoded}.${signature}`;
}

export function verifyLegacyFinalizeToken(token: string, secret = finalizeSigningSecret()): unknown | null {
  const [prefix, encoded, signature, extra] = token.split(".");
  if (prefix !== "legacy" || !encoded || !signature || extra) return null;

  const expected = createHmac("sha256", secret).update(`pol-car:legacy-upload:v1:${encoded}`).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.toString("base64url") !== signature) return null;
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

export function sanitizeUploadName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return (stem.replace(/-+/g, "-").replace(/^-|-$/g, "") || "photo").slice(0, 64);
}
