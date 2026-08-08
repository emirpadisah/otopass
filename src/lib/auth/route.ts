import type { AuthRedirectTarget, UserRole } from "@/lib/types";

function isDealerRole(role: UserRole): boolean {
  return role === "dealer_owner" || role === "dealer_manager" || role === "dealer_viewer";
}

export function resolveRouteForRoles(roles: UserRole[]): AuthRedirectTarget {
  if (roles.some((role) => role === "admin" || role === "super_admin")) return "/admin";
  if (roles.some(isDealerRole)) return "/dealer";
  return "/login";
}

export function hasDealerRole(roles: UserRole[]): boolean {
  return roles.some(isDealerRole);
}

export function canManageDealerMembership(role: string): boolean {
  return role === "owner" || role === "manager";
}
