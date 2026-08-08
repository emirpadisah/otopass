import { describe, expect, it } from "vitest";
import { validatePasswordPolicy } from "../src/lib/validation/password";
import { hashLocalPassword, verifyLocalPassword } from "../src/lib/local/store";

describe("password validation and local hashing", () => {
  it("enforces length and character-class requirements", () => {
    expect(() => validatePasswordPolicy("Short1A")).toThrow("en az 12 karakter");
    expect(() => validatePasswordPolicy("onlylowercase123")).toThrow("büyük harf");
    expect(() => validatePasswordPolicy("Valid.Password123")).not.toThrow();
  });

  it("verifies only the password used to create a local hash", () => {
    const hash = hashLocalPassword("Valid.Password123", "fixed-test-salt");
    expect(verifyLocalPassword("Valid.Password123", hash)).toBe(true);
    expect(verifyLocalPassword("Wrong.Password123", hash)).toBe(false);
  });
});
