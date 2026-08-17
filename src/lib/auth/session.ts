import { redirect } from "next/navigation";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalSessionUser } from "@/lib/local/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function requireUser() {
  if (isLocalDataMode()) {
    const user = await getLocalSessionUser();
    if (!user) redirect("/login");
    return user;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const service = createSupabaseServiceClient();
  const { data: profile } = await service.from("user_profiles").select("is_active").eq("user_id", user.id).maybeSingle();
  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    redirect("/login?reason=inactive");
  }
  return user;
}
