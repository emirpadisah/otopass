import { cookies, headers } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  const headerBag = await headers();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Prefer Next's RequestCookies API when available
          if (typeof cookieStore.get === "function") {
            return cookieStore.get(name)?.value;
          }

          // Fallback: parse raw cookie header
          const cookieHeader = headerBag.get("cookie") || "";
          const match = cookieHeader.split("; ").find((c: string) => c.startsWith(name + "="));
          if (!match) return undefined;
          return decodeURIComponent(match.split("=").slice(1).join("="));
        },
        set(name: string, value: string, options: CookieOptions) {
          if (typeof cookieStore.set === "function") {
            cookieStore.set({ name, value, ...options });
            return;
          }
          // No-op fallback when running in an environment that doesn't support setting cookies here
        },
        remove(name: string, options: CookieOptions) {
          if (typeof cookieStore.delete === "function") {
            cookieStore.delete(name);
            return;
          }
          if (typeof cookieStore.set === "function") {
            cookieStore.set({ name, value: "", ...options });
            return;
          }
          // No-op fallback
        },
      },
    }
  );
}
