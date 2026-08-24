import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SITE_ORIGIN,
  isPlatformHostname,
  resolvePublicSiteOrigin,
} from "@/lib/site-url";

describe("public site URL", () => {
  it("uses the otoköprü production origin as the safe fallback", () => {
    expect(resolvePublicSiteOrigin()).toBe(PRODUCTION_SITE_ORIGIN);
    expect(resolvePublicSiteOrigin("not-a-url")).toBe(PRODUCTION_SITE_ORIGIN);
    expect(resolvePublicSiteOrigin("javascript:alert(1)")).toBe(PRODUCTION_SITE_ORIGIN);
  });

  it("normalizes configured HTTP origins", () => {
    expect(resolvePublicSiteOrigin(" https://www.otokopru.com/path ")).toBe("https://www.otokopru.com");
    expect(resolvePublicSiteOrigin("http://localhost:3000/form/test")).toBe("http://localhost:3000");
  });

  it.each([
    "otokopru.com",
    "www.otokopru.com",
    "localhost",
    "127.0.0.1",
    "preview.vercel.app",
  ])("recognizes %s as a platform hostname", (hostname) => {
    expect(isPlatformHostname(hostname)).toBe(true);
  });

  it("keeps dealer-owned domains outside the platform hostname set", () => {
    expect(isPlatformHostname("basvuru.galeri.com")).toBe(false);
  });
});
