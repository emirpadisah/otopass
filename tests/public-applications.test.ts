import { describe, expect, it } from "vitest";
import {
  createFinalizeToken,
  createReferenceCode,
  hashFinalizeToken,
  sanitizeUploadName,
} from "../src/lib/public-applications";

describe("public application upload tokens", () => {
  it("creates fixed-length, URL-safe, non-reusable random tokens", () => {
    const first = createFinalizeToken();
    const second = createFinalizeToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(hashFinalizeToken(first)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("creates bounded references and storage-safe file stems", () => {
    expect(createReferenceCode(new Date("2026-08-24T00:00:00Z"))).toMatch(/^OTP-20260824-[A-F0-9]{8}$/);
    expect(sanitizeUploadName("../../arac fotoğrafı<script>.jpg")).toBe("arac-fotog-raf-script");
    expect(sanitizeUploadName("x".repeat(200))).toHaveLength(64);
  });
});
