import { cache } from "react";
import { redirect } from "next/navigation";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalSessionUser } from "@/lib/local/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const getSessionState = cache(async () => {
  if (isLocalDataMode()) {
    const user = await getLocalSessionUser();
    return { user, inactive: false };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, inactive: false };
  const service = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from("user_profiles")
    .select("is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  return { user, inactive: profile?.is_active !== true };
});

export async function getActiveSessionUser() {
  const state = await getSessionState();
  return state.inactive ? null : state.user;
}

export async function requireUser() {
  const state = await getSessionState();
  if (!state.user) redirect("/login");
  if (state.inactive) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login?reason=inactive");
  }
  return state.user;
}
