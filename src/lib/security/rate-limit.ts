import { createHmac } from "crypto";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalLatestFormSubmit, registerLocalFormSubmit } from "@/lib/local/repository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type RateLimitRule = { scope: string; limit: number; windowSeconds: number };

function secret(): string {
  const value = process.env.RATE_LIMIT_HMAC_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("RATE_LIMIT_HMAC_SECRET is required in production.");
  return "otopass-development-rate-limit-secret";
}

export function hashRateLimitKey(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<boolean> {
  const keyHash = hashRateLimitKey(key || "unknown");
  if (isLocalDataMode()) {
    const dealerSlug = rule.scope.startsWith("public-form:") ? rule.scope.slice("public-form:".length) : rule.scope;
    const lastSubmit = await getLocalLatestFormSubmit(keyHash, dealerSlug);
    const allowed = !lastSubmit || Date.now() - new Date(lastSubmit).getTime() >= rule.windowSeconds * 1000;
    if (allowed) await registerLocalFormSubmit(keyHash, dealerSlug);
    return allowed;
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_scope: rule.scope,
    p_key_hash: keyHash,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });
  if (error) throw error;
  return data === true;
}
