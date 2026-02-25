import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

let client: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!client) {
    const { url, anonKey } = getSupabasePublicEnv();
    client = createBrowserClient<Database>(
      url,
      anonKey
    );
  }

  return client;
}
