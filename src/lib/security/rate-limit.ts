import { createHash } from "crypto";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalLatestFormSubmit, registerLocalFormSubmit } from "@/lib/local/repository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const COOLDOWN_SECONDS = 30;

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function checkFormCooldown(ip: string, dealerSlug: string): Promise<boolean> {
  const ipHash = hashIp(ip || "unknown");

  if (isLocalDataMode()) {
    const createdAt = await getLocalLatestFormSubmit(ipHash, dealerSlug);
    if (!createdAt) return true;
    return (Date.now() - new Date(createdAt).getTime()) / 1000 >= COOLDOWN_SECONDS;
  }

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("form_rate_limits")
    .select("created_at")
    .eq("ip_hash", ipHash)
    .eq("dealer_slug", dealerSlug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return true;

  const seconds = (Date.now() - new Date(data.created_at).getTime()) / 1000;
  return seconds >= COOLDOWN_SECONDS;
}

export async function registerFormSubmit(ip: string, dealerSlug: string): Promise<void> {
  const ipHash = hashIp(ip || "unknown");

  if (isLocalDataMode()) {
    await registerLocalFormSubmit(ipHash, dealerSlug);
    return;
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("form_rate_limits").insert({
    ip_hash: ipHash,
    dealer_slug: dealerSlug,
  });
  if (error) throw error;
}
