import { createHash, randomBytes } from "crypto";

export function normalizeTrackingReference(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return /^OTP-[A-Z0-9-]{8,40}$/.test(normalized) ? normalized : null;
}

export function createTrackingKey(): string {
  return randomBytes(16).toString("hex").toUpperCase().match(/.{4}/g)!.join("-");
}

export function normalizeTrackingKey(value: string): string | null {
  const normalized = value.trim().replace(/[\s-]/g, "").toUpperCase();
  return /^[A-F0-9]{32}$/.test(normalized) ? normalized : null;
}

export function hashTrackingKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
