import { describe, expect, it } from "vitest";
import { createSanitizedRequestHeaders, shouldRefreshAuthSession } from "../src/proxy";

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
});
