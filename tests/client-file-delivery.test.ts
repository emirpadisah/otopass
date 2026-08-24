import { describe, expect, it } from "vitest";
import { detectMobilePlatform } from "../src/lib/client-file-delivery";

describe("mobile file delivery platform detection", () => {
  it("detects iPhone and iPadOS desktop mode as iOS", () => {
    expect(detectMobilePlatform({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    })).toBe("ios");

    expect(detectMobilePlatform({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
      platform: "MacIntel",
      maxTouchPoints: 5,
    })).toBe("ios");
  });

  it("separates Android from desktop browsers", () => {
    expect(detectMobilePlatform({
      userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9)",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    })).toBe("android");

    expect(detectMobilePlatform({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      platform: "Win32",
      maxTouchPoints: 0,
    })).toBe("other");
  });
});
