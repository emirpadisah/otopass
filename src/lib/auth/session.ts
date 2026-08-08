import { redirect } from "next/navigation";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalSessionUser } from "@/lib/local/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  return user;
}
