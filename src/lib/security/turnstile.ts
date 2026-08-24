type TurnstileResponse = { success: boolean; hostname?: string; action?: string; "error-codes"?: string[] };

export async function verifyTurnstile(token: string, ip: string, expectedHostname?: string): Promise<boolean> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!siteKey && !secret) return true;
  if (!siteKey || !secret) throw new Error("Turnstile site and secret keys must be configured together.");
  if (!token) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return false;
  const result = (await response.json()) as TurnstileResponse;
  if (!result.success) return false;
  if (result.action && result.action !== "public_application") return false;
  return !expectedHostname || !result.hostname || result.hostname.toLowerCase() === expectedHostname.toLowerCase();
}
