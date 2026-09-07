export type OfferLink = { offer_id: string; token_hash: string; message: string; expires_at: string; response: string | null; responded_at: string | null };
export function normalizeMatch(value: string | null) { return (value ?? "").normalize("NFKC").toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, ""); }
export function normalizePhone(value: string | null) { const digits = (value ?? "").replace(/\D/g, ""); return digits.length >= 10 ? digits.slice(-10) : ""; }
export function validOfferToken(token: string) { return /^[a-f0-9]{64}$/.test(token); }
