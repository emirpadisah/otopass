import { afterEach, describe, expect, it } from "vitest";
import { verifyTurnstile } from "../src/lib/security/turnstile";

const originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const originalSecret = process.env.TURNSTILE_SECRET_KEY;

afterEach(() => {
  if (originalSiteKey === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey;
  if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalSecret;
});

describe("Turnstile configuration", () => {
  it("allows submissions when the optional integration is not configured", async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(verifyTurnstile("", "127.0.0.1")).resolves.toBe(true);
  });

  it("rejects partial configuration", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(verifyTurnstile("", "127.0.0.1")).rejects.toThrow("configured together");
  });
});
