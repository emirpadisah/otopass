import { describe, expect, it } from "vitest";
import { getGoogleMeasurementIds, hasGoogleMeasurementIds } from "../src/lib/google-measurement-config";

describe("Google measurement configuration", () => {
  it("normalizes valid GA4 and Google Ads identifiers", () => {
    const environment = {
      NEXT_PUBLIC_GA_MEASUREMENT_ID: " g-ab12cd34 ",
      NEXT_PUBLIC_GOOGLE_ADS_ID: " aw-123456789 ",
    };

    expect(getGoogleMeasurementIds(environment)).toEqual({
      analyticsId: "G-AB12CD34",
      adsId: "AW-123456789",
    });
    expect(hasGoogleMeasurementIds(environment)).toBe(true);
  });

  it("rejects malformed identifiers and keeps measurement disabled", () => {
    const environment = {
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "UA-LEGACY",
      NEXT_PUBLIC_GOOGLE_ADS_ID: "AW-NOT-NUMERIC",
    };

    expect(getGoogleMeasurementIds(environment)).toEqual({ analyticsId: null, adsId: null });
    expect(hasGoogleMeasurementIds(environment)).toBe(false);
  });
});
