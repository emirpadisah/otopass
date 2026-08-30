import { describe, expect, it } from "vitest";
import { buildCsp, createSanitizedRequestHeaders, shouldRefreshAuthSession } from "../src/proxy";

describe("proxy auth refresh routing", () => {
  it.each([
    "/admin",
    "/admin/users",
    "/dealer",
    "/dealer/applications/123",
    "/login/change-password",
    "/login/reset-password",
    "/login/mfa/setup",
    "/api/admin/export/users",
    "/api/dealer/logo",
    "/api/applications/123/photos",
  ])("refreshes the session for protected path %s", (pathname) => {
    expect(shouldRefreshAuthSession(pathname)).toBe(true);
  });

  it.each(["/", "/login", "/privacy", "/form/test-galeri", "/api/health"])(
    "skips the Supabase auth round-trip for public path %s",
    (pathname) => {
      expect(shouldRefreshAuthSession(pathname)).toBe(false);
    },
  );

  it("removes spoofable internal routing headers and installs the request nonce", () => {
    const headers = createSanitizedRequestHeaders(new Headers({
      "x-auth-user-id": "spoofed",
      "x-custom-domain": "evil.example",
      "x-custom-dealer-slug": "evil",
    }), "test-nonce");

    expect(headers.get("x-auth-user-id")).toBeNull();
    expect(headers.get("x-custom-domain")).toBeNull();
    expect(headers.get("x-custom-dealer-slug")).toBeNull();
    expect(headers.get("x-nonce")).toBe("test-nonce");
    expect(headers.get("content-security-policy")).toContain("'nonce-test-nonce'");
  });

  it("allows Google measurement endpoints only when measurement is configured", () => {
    const disabledCsp = buildCsp("nonce", { analyticsId: null, adsId: null });
    expect(disabledCsp).not.toContain("googletagmanager.com");

    const analyticsCsp = buildCsp("nonce", { analyticsId: "G-TEST1234", adsId: null });
    expect(analyticsCsp).toContain("https://www.googletagmanager.com");
    expect(analyticsCsp).toContain("https://*.google-analytics.com");
    expect(analyticsCsp).not.toContain("https://www.googleadservices.com");

    const adsCsp = buildCsp("nonce", { analyticsId: null, adsId: "AW-123456789" });
    expect(adsCsp).toContain("https://www.googletagmanager.com");
    expect(adsCsp).toContain("https://www.googleadservices.com");
  });
});
