import { describe, expect, it } from "vitest";
import { domainRecordName, normalizeCustomDomain } from "@/lib/domain-name";

describe("normalizeCustomDomain", () => {
  it("normalizes hostnames and pasted URLs", () => {
    expect(normalizeCustomDomain("  HTTPS://Basvuru.Example.COM/path  ")).toBe("basvuru.example.com");
  });

  it("supports international domain names through ASCII normalization", () => {
    expect(normalizeCustomDomain("başvuru.örnek.com")).toBe("xn--bavuru-xjb.xn--rnek-4qa.com");
  });

  it.each(["localhost", "127.0.0.1", "*.example.com", "sample.vercel.app", "invalid"])(
    "rejects unsupported hostname %s",
    (hostname) => expect(() => normalizeCustomDomain(hostname)).toThrow(),
  );
});

describe("domainRecordName", () => {
  it("uses @ for apex records", () => {
    expect(domainRecordName("example.com", "example.com")).toBe("@");
  });

  it("uses the relative host for subdomains", () => {
    expect(domainRecordName("basvuru.example.com", "example.com")).toBe("basvuru");
  });
});
