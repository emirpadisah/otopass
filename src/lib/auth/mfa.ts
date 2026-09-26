import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { isLocalDataMode } from "@/lib/data-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const needsMfaVerification = cache(async (): Promise<boolean> => {
  if (isLocalDataMode()) return false;

  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) redirect("/login");

  // Passing the token makes Supabase fetch the current verified factors instead
  // of relying on the potentially stale user object stored in the cookie.
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(session.access_token);
  if (error || !data) throw error ?? new Error("MFA durumu doğrulanamadı.");
  return data.currentLevel !== "aal2" && data.nextLevel === "aal2";
});

export async function requireCompletedMfa(): Promise<void> {
  if (await needsMfaVerification()) redirect("/login/mfa/verify");
}
