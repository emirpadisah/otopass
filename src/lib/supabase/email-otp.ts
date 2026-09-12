import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

// A fresh, anonymous client per operation. OTP sessions never enter browser
// cookies or the cached service-role client.
export function createEmailOtpClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
