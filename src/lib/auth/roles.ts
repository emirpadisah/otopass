import { cache } from "react";
import { redirect } from "next/navigation";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalSessionUser } from "@/lib/local/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { hasDealerRole, resolveRouteForRoles } from "@/lib/auth/route";
import type { AuthRedirectTarget, UserRole } from "@/lib/types";

export const getCurrentUserRoles = cache(async (): Promise<UserRole[]> => {
  if (isLocalDataMode()) {
    return (await getLocalSessionUser())?.roles ?? [];
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser();

  if (userErr || !user) return [];

  const serviceClient = createSupabaseServiceClient();
  const { data: profile } = await serviceClient.from("user_profiles").select("is_active").eq("user_id", user.id).maybeSingle();
  if (profile?.is_active === false) return [];
  const { data, error } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error || !data) return [];
  const roles = data.map((row) => row.role as UserRole);
  if (roles.some((role) => role.startsWith("dealer_"))) {
    const { data: membership } = await serviceClient.from("dealer_users").select("dealer_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!membership) return roles.filter((role) => !role.startsWith("dealer_"));
    const { data: dealer } = await serviceClient.from("dealers").select("is_active").eq("id", membership.dealer_id).maybeSingle();
    if (dealer?.is_active === false) return roles.filter((role) => !role.startsWith("dealer_"));
  }
  return roles;
});

export async function resolvePostLoginRoute(): Promise<AuthRedirectTarget> {
  return resolveRouteForRoles(await getCurrentUserRoles());
}

export async function requireAdminAccess(): Promise<void> {
  const roles = await getCurrentUserRoles();
  if (!roles.some((role) => role === "admin" || role === "super_admin")) {
    redirect("/");
  }
  if (!isLocalDataMode()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== "aal2") redirect("/login/mfa/setup");
  }
}

export async function requireDealerAccess(): Promise<void> {
  const roles = await getCurrentUserRoles();
  if (!hasDealerRole(roles)) {
    redirect("/");
  }
}

export async function requireSuperAdminAccess(): Promise<void> {
  const roles = await getCurrentUserRoles();
  if (!roles.includes("super_admin")) redirect("/admin");
}
