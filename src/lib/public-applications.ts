import { createHash, randomBytes } from "crypto";

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

export function sanitizeUploadName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return (stem.replace(/-+/g, "-").replace(/^-|-$/g, "") || "photo").slice(0, 64);
}
