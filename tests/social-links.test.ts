import { describe, expect, it } from "vitest";
import { isSocialPlatform, normalizeSocialLink, parseSocialLinksInput } from "@/lib/social-links";

describe("social links", () => {
  it("normalizes supported platform links", () => {
    expect(normalizeSocialLink({ platform: "instagram", url: "instagram.com/otokopru" })).toEqual({
      platform: "instagram",
      url: "https://instagram.com/otokopru",
    });
  });

  it("rejects links that do not match the selected platform", () => {
    expect(() => normalizeSocialLink({ platform: "youtube", url: "https://example.com/channel" })).toThrow("YouTube");
  });

  it("supports named custom links and rejects duplicate platforms", () => {
    expect(parseSocialLinksInput(JSON.stringify([
      { platform: "other", label: "Sahibinden", url: "https://example.com" },
    ]))[0]).toEqual({ platform: "other", label: "Sahibinden", url: "https://example.com" });

    expect(() => parseSocialLinksInput(JSON.stringify([
      { platform: "facebook", url: "https://facebook.com/a" },
      { platform: "facebook", url: "https://facebook.com/b" },
    ]))).toThrow("yalnızca bir kez");
  });

  it("does not expose removed platform options", () => {
    for (const platform of ["spotify", "linkedin", "discord", "twitch", "pinterest", "snapchat", "telegram"]) {
      expect(isSocialPlatform(platform)).toBe(false);
    }
  });
});
