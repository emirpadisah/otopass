import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AuthRedirectTarget, UserRole } from "@/lib/types";

function isDealerRole(role: UserRole): boolean {
  return role === "dealer_owner" || role === "dealer_manager" || role === "dealer_viewer";
}

export const getCurrentUserRoles = cache(async (): Promise<UserRole[]> => {
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
  const roles = await getCurrentUserRoles();
  if (roles.some((role) => role === "admin" || role === "super_admin")) return "/admin";
  if (roles.some(isDealerRole)) return "/dealer";
  return "/login";
}

export async function requireAdminAccess(): Promise<void> {
  const roles = await getCurrentUserRoles();
  if (!roles.some((role) => role === "admin" || role === "super_admin")) {
    redirect("/");
  }
}

export async function requireDealerAccess(): Promise<void> {
  const roles = await getCurrentUserRoles();
  if (!roles.some(isDealerRole)) {
    redirect("/");
  }
}
