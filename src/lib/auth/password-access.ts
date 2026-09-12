import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "./session";
import { getRequestAccessContext } from "./access-context";
import { hasRequiredAssurance } from "./mfa-policy";
import { isLocalDataMode } from "@/lib/data-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requirePasswordChangeAccess() {
  const user = await requireAuthenticatedUser();
  if (isLocalDataMode()) return user;
  const context = await getRequestAccessContext();
  if (context && hasRequiredAssurance(context.assurance, context.mfaExempt)) return user;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error("Hesap güvenliği doğrulanamadı.");
  // First-password bootstrap is allowed before the first factor is enrolled.
  if (data.all.some((factor) => factor.status === "verified")) {
    redirect("/login/mfa/setup?next=password");
  }
  return user;
}
