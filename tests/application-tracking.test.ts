import { describe, expect, it } from "vitest";
import { normalizeTrackingReference } from "../src/lib/application-tracking";

describe("application status tracking", () => {
  it("accepts existing and longer OTP references", () => {
    expect(normalizeTrackingReference(" otp-20260924-abc12345 ")).toBe("OTP-20260924-ABC12345");
    expect(normalizeTrackingReference(`otp-20260924-${"a".repeat(24)}`)).toBe(`OTP-20260924-${"A".repeat(24)}`);
    expect(normalizeTrackingReference("OTP-20260924-ABC12345/../../")).toBeNull();
    expect(normalizeTrackingReference("ABC-20260924-ABC12345")).toBeNull();
    expect(normalizeTrackingReference("OTP-20260924-ZZZZZZZZ")).toBeNull();
  });
});
