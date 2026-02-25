import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseServiceEnv } from "./env";

// Must only be used on the server side (contains service role key).
export function createSupabaseServiceClient(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();
  return createClient<Database>(url, serviceRoleKey);
}
