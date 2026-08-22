import { describe, expect, it } from "vitest";
import { getDealerLogoSrc, getManagedDealerLogoPath } from "@/lib/dealer-branding";

describe("dealer branding", () => {
  it("only treats dealer-assets paths as managed", () => {
    expect(getManagedDealerLogoPath("dealer-assets/dealer-1/logo.webp")).toBe("dealer-1/logo.webp");
    expect(getManagedDealerLogoPath("https://example.com/logo.png")).toBeNull();
    expect(getManagedDealerLogoPath("dealer-assets/../secret")).toBeNull();
  });

  it("builds a revisioned same-origin public logo URL", () => {
    expect(getDealerLogoSrc({
      id: "dealer-1",
      logo_url: "dealer-assets/dealer-1/logo.webp",
      updated_at: "2026-08-22T12:00:00.000Z",
    })).toBe("/api/public/dealers/dealer-1/logo?v=2026-08-22T12%3A00%3A00.000Z");
  });
});
