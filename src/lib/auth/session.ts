import { redirect } from "next/navigation";
import { isLocalDataMode } from "@/lib/data-mode";
import { signOutLocalUser } from "@/lib/local/auth";
import { getRequestAccessContext } from "@/lib/auth/access-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getActiveSessionUser() {
  const context = await getRequestAccessContext();
  return context?.isActive ? context.user : null;
}

export async function requireUser() {
  const context = await getRequestAccessContext();
  if (!context) redirect("/login");
  if (!context.isActive) {
    if (isLocalDataMode()) await signOutLocalUser();
    else await (await createSupabaseServerClient()).auth.signOut();
    redirect("/login?reason=inactive");
  }
  return context.user;
}
