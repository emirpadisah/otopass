import "server-only";

// Explicit deployment opt-out while SMTP is deferred. Missing/invalid values
// keep verification required; this switch never grants database exemptions.
export function isEmailVerificationRequired(): boolean {
  return process.env.OTOPASS_EMAIL_VERIFICATION_REQUIRED?.trim().toLowerCase() !== "false";
}

export function passesEmailGate(verified: boolean): boolean {
  return !isEmailVerificationRequired() || verified === true;
}
