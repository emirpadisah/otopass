import type { UserRole } from "@/lib/types";

type CredentialPolicyInput = {
  actorUserId: string;
  actorRoles: UserRole[];
  targetUserId: string;
  targetRoles: UserRole[];
};

export type PasswordChangeRestriction = "SELF_PASSWORD_CHANGE" | "PRIVILEGED_TARGET" | null;
export type UserDeletionRestriction =
  | "DELETE_REQUIRES_SUPER_ADMIN"
  | "SELF_DELETE"
  | "LAST_SUPER_ADMIN"
  | null;

export function getPasswordChangeRestriction({
  actorUserId,
  actorRoles,
  targetUserId,
  targetRoles,
}: CredentialPolicyInput): PasswordChangeRestriction {
  if (actorUserId === targetUserId) return "SELF_PASSWORD_CHANGE";

  const actorIsSuperAdmin = actorRoles.includes("super_admin");
  const targetIsPrivileged = targetRoles.some((role) => role === "admin" || role === "super_admin");
  return targetIsPrivileged && !actorIsSuperAdmin ? "PRIVILEGED_TARGET" : null;
}

export function getUserDeletionRestriction({
  actorUserId,
  actorRoles,
  targetUserId,
  targetRoles,
  superAdminCount,
}: CredentialPolicyInput & { superAdminCount: number }): UserDeletionRestriction {
  if (!actorRoles.includes("super_admin")) return "DELETE_REQUIRES_SUPER_ADMIN";
  if (actorUserId === targetUserId) return "SELF_DELETE";
  if (targetRoles.includes("super_admin") && superAdminCount <= 1) return "LAST_SUPER_ADMIN";
  return null;
}
