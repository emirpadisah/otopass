export type GoogleMeasurementIds = {
  analyticsId: string | null;
  adsId: string | null;
};

type GoogleMeasurementEnvironment = Readonly<Record<string, string | undefined>>;

const GA4_ID_PATTERN = /^G-[A-Z0-9]+$/;
const GOOGLE_ADS_ID_PATTERN = /^AW-[0-9]+$/;

export function getGoogleMeasurementIds(environment: GoogleMeasurementEnvironment = process.env): GoogleMeasurementIds {
  const analyticsCandidate = environment.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim().toUpperCase() ?? "";
  const adsCandidate = environment.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim().toUpperCase() ?? "";
  return {
    analyticsId: GA4_ID_PATTERN.test(analyticsCandidate) ? analyticsCandidate : null,
    adsId: GOOGLE_ADS_ID_PATTERN.test(adsCandidate) ? adsCandidate : null,
  };
}

export function hasGoogleMeasurementIds(environment: GoogleMeasurementEnvironment = process.env): boolean {
  const ids = getGoogleMeasurementIds(environment);
  return Boolean(ids.analyticsId || ids.adsId);
}
