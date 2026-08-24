import { cache } from "react";
import { redirect } from "next/navigation";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalSessionUser } from "@/lib/local/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getActiveSessionUser } from "@/lib/auth/session";
import { hasDealerRole, resolveRouteForRoles } from "@/lib/auth/route";
import type { AuthRedirectTarget, UserRole } from "@/lib/types";

export const getCurrentUserRoles = cache(async (): Promise<UserRole[]> => {
  if (isLocalDataMode()) {
    return (await getLocalSessionUser())?.roles ?? [];
  }

  const user = await getActiveSessionUser();
  if (!user) return [];

  const serviceClient = createSupabaseServiceClient();
  const { data, error } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error || !data) return [];
  const roles = data.map((row) => row.role as UserRole);
  if (roles.some((role) => role.startsWith("dealer_"))) {
    const { data: membership, error: membershipError } = await serviceClient.from("dealer_users").select("dealer_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (membershipError || !membership) return roles.filter((role) => !role.startsWith("dealer_"));
    const { data: dealer, error: dealerError } = await serviceClient.from("dealers").select("is_active").eq("id", membership.dealer_id).maybeSingle();
    if (dealerError || dealer?.is_active !== true) return roles.filter((role) => !role.startsWith("dealer_"));
  }
  return roles;
});

export async function resolvePostLoginRoute(): Promise<AuthRedirectTarget> {
  return resolveRouteForRoles(await getCurrentUserRoles());
}

export async function requireAdminAccess(): Promise<UserRole[]> {
  const roles = await getCurrentUserRoles();
  if (!roles.some((role) => role === "admin" || role === "super_admin")) {
    redirect("/");
  }
  return roles;
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
