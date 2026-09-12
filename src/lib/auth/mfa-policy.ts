export type SessionAssurance = "aal1" | "aal2" | "local" | null;

export function hasRequiredAssurance(assurance: SessionAssurance, mfaExempt = false): boolean {
  return mfaExempt || assurance === "aal2" || (assurance === "local" && process.env.NODE_ENV !== "production");
}

export function getVerifiedAssurance(claims: { aal?: unknown } | null | undefined): SessionAssurance {
  return claims?.aal === "aal2" ? "aal2" : claims?.aal === "aal1" ? "aal1" : null;
}
