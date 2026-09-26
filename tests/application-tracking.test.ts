import { describe, expect, it } from "vitest";
import { createTrackingKey, hashTrackingKey, normalizeTrackingKey, normalizeTrackingReference } from "../src/lib/application-tracking";

describe("application status tracking", () => {
  it("accepts only normalized application references", () => {
    expect(normalizeTrackingReference(" otp-20260924-abc12345 ")).toBe("OTP-20260924-ABC12345");
    expect(normalizeTrackingReference("OTP-20260924-ABC12345/../../")).toBeNull();
  });

  it("generates independent 128-bit keys and hashes the canonical value", () => {
    const keys = new Set(Array.from({ length: 100 }, createTrackingKey));
    expect(keys.size).toBe(100);
    for (const key of keys) {
      expect(key).toMatch(/^[A-F0-9]{4}(?:-[A-F0-9]{4}){7}$/);
      const canonical = normalizeTrackingKey(key);
      expect(canonical).not.toBeNull();
      expect(hashTrackingKey(canonical!)).toMatch(/^[a-f0-9]{64}$/);
      expect(normalizeTrackingKey(` ${key.toLowerCase()} `)).toBe(canonical);
    }
  });

  it("rejects malformed or shortened keys", () => {
    expect(normalizeTrackingKey("ABC-123")).toBeNull();
    expect(normalizeTrackingKey("G".repeat(32))).toBeNull();
    expect(normalizeTrackingKey("A".repeat(32) + "/../../")).toBeNull();
    expect(hashTrackingKey("A".repeat(32))).not.toBe(hashTrackingKey("B".repeat(32)));
  });
});
