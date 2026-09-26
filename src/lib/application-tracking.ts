export function normalizeTrackingReference(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return /^OTP-\d{8}-(?:[A-F0-9]{8}|[A-F0-9]{24})$/.test(normalized) ? normalized : null;
}
