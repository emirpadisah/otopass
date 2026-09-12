import { redirect } from "next/navigation";
import { isLocalDataMode } from "@/lib/data-mode";
import { passesEmailGate } from "./email-policy";
import { signOutLocalUser } from "@/lib/local/auth";
import { getProtectedAccessContext, getRequestAccessContext } from "@/lib/auth/access-context";
import { hasRequiredAssurance } from "./mfa-policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getActiveSessionUser() {
  const context = await getProtectedAccessContext();
  return context?.isActive ? context.user : null;
}

// Only the login, password bootstrap and MFA screens may use this weaker guard.
export async function requireAuthenticatedUser() {
  const context = await getRequestAccessContext();
  if (!context) redirect("/login");
  if (!context.isActive) {
    if (isLocalDataMode()) await signOutLocalUser();
    else await (await createSupabaseServerClient()).auth.signOut();
    redirect("/login?reason=inactive");
  }
  if (!passesEmailGate(context.emailVerified)) redirect("/login/verify-email");
  return context.user;
}

export async function requireAAL2() {
  const user = await requireAuthenticatedUser();
  const context = await getRequestAccessContext();
  if (!context || !hasRequiredAssurance(context.assurance, context.mfaExempt)) redirect("/login/mfa/setup");
  return user;
}

export async function requireUser() {
  const user = await requireAAL2();
  const context = await getRequestAccessContext();
  if (context?.mustChangePassword) redirect("/login/change-password");
  return user;
}
