import "server-only";

import { createHash, timingSafeEqual } from "crypto";

export function timingSafeSecretEqual(actual: string | null, expected: string): boolean {
  if (!actual || !expected) return false;
  const actualHash = createHash("sha256").update(actual).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}
