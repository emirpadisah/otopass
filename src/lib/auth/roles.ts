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
  const { data, error } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error || !data) return [];
  return data.map((row) => row.role as UserRole);
});

export async function resolvePostLoginRoute(): Promise<AuthRedirectTarget> {
  return resolveRouteForRoles(await getCurrentUserRoles());
}

export async function requireAdminAccess(): Promise<void> {
  const roles = await getCurrentUserRoles();
  if (!roles.some((role) => role === "admin" || role === "super_admin")) {
    redirect("/");
  }
}

export async function requireDealerAccess(): Promise<void> {
  const roles = await getCurrentUserRoles();
  if (!hasDealerRole(roles)) {
    redirect("/");
  }
}
