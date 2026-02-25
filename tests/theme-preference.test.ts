import { describe, expect, it } from "vitest";
import { resolveThemePreference } from "../src/components/theme-provider";

describe("theme preference resolver", () => {
  it("uses stored preference when available", () => {
    expect(resolveThemePreference("dark", true)).toBe("dark");
    expect(resolveThemePreference("light", false)).toBe("light");
  });

  it("falls back to system preference when storage is missing", () => {
    expect(resolveThemePreference(null, true)).toBe("light");
    expect(resolveThemePreference(null, false)).toBe("dark");
  });
});
