import { cache } from "react";
import { redirect } from "next/navigation";
import { getRequestAccessContext } from "@/lib/auth/access-context";
import { requireUser } from "@/lib/auth/session";
import { hasDealerRole, resolveRouteForRoles } from "@/lib/auth/route";
import type { AuthRedirectTarget, UserRole } from "@/lib/types";

export const getCurrentUserRoles = cache(async (): Promise<UserRole[]> => {
  const context = await getRequestAccessContext();
  if (!context?.isActive) return [];
  if (context.roles.some((role) => role.startsWith("dealer_")) && !context.dealerId) {
    return context.roles.filter((role) => !role.startsWith("dealer_"));
  }
  return context.roles;
});

export async function resolvePostLoginRoute(): Promise<AuthRedirectTarget> {
  return resolveRouteForRoles(await getCurrentUserRoles());
}

async function getRolesForProtectedPanel(): Promise<UserRole[]> {
  await requireUser();
  const context = await getRequestAccessContext();
  if (context?.mustChangePassword) redirect("/login/change-password");
  return getCurrentUserRoles();
}

export async function requireAdminAccess(): Promise<UserRole[]> {
  const roles = await getRolesForProtectedPanel();
  if (!roles.some((role) => role === "admin" || role === "super_admin")) {
    redirect("/");
  }
  return roles;
}

export async function requireDealerAccess(): Promise<void> {
  const roles = await getRolesForProtectedPanel();
  if (!hasDealerRole(roles)) {
    redirect("/");
  }
}

export async function requireSuperAdminAccess(): Promise<void> {
  const roles = await getRolesForProtectedPanel();
  if (!roles.includes("super_admin")) redirect("/admin");
}
