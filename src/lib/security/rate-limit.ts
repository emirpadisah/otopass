import { createHmac } from "crypto";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalLatestFormSubmit, registerLocalFormSubmit } from "@/lib/local/repository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isMissingFunction } from "@/lib/supabase/schema-compat";

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
  if (error && isMissingFunction(error, "consume_rate_limit")) {
    const cutoff = new Date(Date.now() - rule.windowSeconds * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("form_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", keyHash)
      .eq("dealer_slug", rule.scope)
      .gte("created_at", cutoff);
    if (countError) throw countError;
    if ((count ?? 0) >= rule.limit) return false;

    const { error: insertError } = await supabase
      .from("form_rate_limits")
      .insert({ ip_hash: keyHash, dealer_slug: rule.scope });
    if (insertError) throw insertError;
    return true;
  }
  if (error) throw error;
  return data === true;
}
