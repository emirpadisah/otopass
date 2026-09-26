import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: {
    cookies: { setAll: (cookies: { name: string; value: string; options: { path: string } }[]) => void };
  }) => ({
    auth: {
      getClaims: async () => {
        options.cookies.setAll([
          { name: "sb-test-auth-token", value: "new-token", options: { path: "/" } },
        ]);
        return { data: { claims: { sub: "user-id" } }, error: null };
      },
    },
  }),
}));

import { proxy } from "../src/proxy";

describe("proxy auth cookie forwarding", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forwards the refreshed cookie to the route and to the browser", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    const request = new NextRequest("https://www.otokopru.com/dealer/applications/123", {
      headers: { cookie: "sb-test-auth-token=old-token; preference=dark" },
    });

    const response = await proxy(request);

    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-test-auth-token=new-token");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("preference=dark");
    expect(response.headers.get("x-middleware-request-cookie")).not.toContain("old-token");
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("new-token");
  });
});
