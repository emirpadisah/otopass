import { createHmac } from "crypto";
import { isLocalDataMode } from "@/lib/data-mode";
import { consumeLocalRateLimit } from "@/lib/local/repository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type RateLimitRule = { scope: string; limit: number; windowSeconds: number };

function secret(): string {
  const value = process.env.RATE_LIMIT_HMAC_SECRET?.trim();
  if (value && (process.env.NODE_ENV !== "production" || value.length >= 32)) return value;
  if (process.env.NODE_ENV === "production") throw new Error("RATE_LIMIT_HMAC_SECRET is required in production.");
  return "otopass-development-rate-limit-secret";
}

export function hashRateLimitKey(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<boolean> {
  if (!/^[a-z0-9][a-z0-9:_-]{0,127}$/i.test(rule.scope)) throw new Error("Invalid rate-limit scope.");
  if (!Number.isInteger(rule.limit) || rule.limit < 1 || rule.limit > 10_000) throw new Error("Invalid rate-limit limit.");
  if (!Number.isInteger(rule.windowSeconds) || rule.windowSeconds < 1 || rule.windowSeconds > 86_400) {
    throw new Error("Invalid rate-limit window.");
  }
  const keyHash = hashRateLimitKey(key || "unknown");
  if (isLocalDataMode()) {
    const dealerSlug = rule.scope.startsWith("public-form:") ? rule.scope.slice("public-form:".length) : rule.scope;
    return consumeLocalRateLimit(keyHash, dealerSlug, rule.limit, rule.windowSeconds);
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

export async function consumeLoginRateLimits(ip: string, account: string): Promise<boolean> {
  if (isLocalDataMode()) {
    const [ipAllowed, accountAllowed] = await Promise.all([
      consumeRateLimit(ip, { scope: "login-ip", limit: 30, windowSeconds: 900 }),
      consumeRateLimit(account, { scope: "login-account", limit: 8, windowSeconds: 900 }),
    ]);
    return ipAllowed && accountAllowed;
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("consume_login_rate_limits", {
    p_ip_hash: hashRateLimitKey(ip || "unknown"),
    p_account_hash: hashRateLimitKey(account),
  });
  if (error) throw error;
  const result = data?.[0];
  return result?.ip_allowed === true && result.account_allowed === true;
}
