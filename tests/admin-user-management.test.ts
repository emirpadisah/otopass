import { describe, expect, it } from "vitest";
import { canAssignRole, canUpdateUserAccess, getPasswordChangeRestriction, getUserDeletionRestriction } from "../src/lib/auth/admin-user-management";

const actorUserId = "00000000-0000-4000-8000-000000000001";
const targetUserId = "00000000-0000-4000-8000-000000000002";

describe("admin user management policy", () => {
  it("blocks both ends of the demote-reset-promote chain", () => {
    expect(canUpdateUserAccess(["admin"], ["admin"], "dealer_manager")).toBe(false);
    expect(canUpdateUserAccess(["admin"], ["dealer_manager"], "admin")).toBe(false);
    expect(canAssignRole(["admin"], "admin")).toBe(false);
  });
  it("allows dealer access management without peer control", () => {
    expect(canUpdateUserAccess(["admin"], ["dealer_viewer"], "dealer_manager")).toBe(true);
    expect(canUpdateUserAccess(["admin"], ["dealer_viewer", "admin"], "dealer_manager")).toBe(false);
    expect(canUpdateUserAccess(["super_admin"], ["admin"], "dealer_manager")).toBe(true);
    expect(canAssignRole(["dealer_owner"], "dealer_manager")).toBe(false);
  });
  it("rejects dealer password replacement by a normal admin even during role changes", () => {
    expect(getPasswordChangeRestriction({
      actorUserId,
      actorRoles: ["admin"],
      targetUserId,
      targetRoles: ["dealer_owner"],
    })).toBe("PASSWORD_REQUIRES_SUPER_ADMIN");
  });

  it("requires a super admin for privileged account passwords", () => {
    expect(getPasswordChangeRestriction({
      actorUserId,
      actorRoles: ["admin"],
      targetUserId,
      targetRoles: ["admin"],
    })).toBe("PRIVILEGED_TARGET");
  });

  it("prevents self deletion", () => {
    expect(getUserDeletionRestriction({
      actorUserId,
      actorRoles: ["super_admin"],
      targetUserId: actorUserId,
      targetRoles: ["super_admin"],
      superAdminCount: 2,
    })).toBe("SELF_DELETE");
  });

  it("prevents deleting the last super admin", () => {
    expect(getUserDeletionRestriction({
      actorUserId,
      actorRoles: ["super_admin"],
      targetUserId,
      targetRoles: ["super_admin"],
      superAdminCount: 1,
    })).toBe("LAST_SUPER_ADMIN");
  });
});
