import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseServiceEnv } from "./env";

let serviceClient: SupabaseClient<Database> | null = null;

// Must only be used on the server side (contains service role key).
export function createSupabaseServiceClient(): SupabaseClient<Database> {
  if (serviceClient) return serviceClient;

  const { url, serviceRoleKey } = getSupabaseServiceEnv();
  serviceClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return serviceClient;
}
