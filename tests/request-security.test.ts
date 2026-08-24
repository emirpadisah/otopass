import { describe, expect, it } from "vitest";
import {
  createRequestId,
  getClientIp,
  hasTrustedMutationOrigin,
  readJsonBody,
} from "../src/lib/security/request";

describe("request security helpers", () => {
  it("uses the Vercel-controlled client IP header first", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.4",
      "x-forwarded-for": "198.51.100.9",
    });
    expect(getClientIp(headers)).toBe("203.0.113.4");
  });

  it("requires an exact same-host mutation origin", () => {
    const trusted = new Headers({ host: "www.otokopru.com", origin: "https://www.otokopru.com" });
    const untrusted = new Headers({ host: "www.otokopru.com", origin: "https://evil.example" });
    expect(hasTrustedMutationOrigin(trusted)).toBe(true);
    expect(hasTrustedMutationOrigin(untrusted)).toBe(false);
  });

  it("rejects oversized and non-JSON request bodies", async () => {
    const oversized = new Request("https://www.otokopru.com/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(32) }),
    });
    await expect(readJsonBody(oversized, 8)).rejects.toThrow("REQUEST_BODY_TOO_LARGE");

    const text = new Request("https://www.otokopru.com/api", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    });
    await expect(readJsonBody(text, 8)).rejects.toThrow("INVALID_REQUEST_BODY");
  });

  it("does not reflect malformed request IDs", () => {
    expect(createRequestId(new Headers({ "x-request-id": "<script>alert(1)</script>" }))).toMatch(/^[0-9a-f-]{36}$/);
  });
});
