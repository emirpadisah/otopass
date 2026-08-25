import { describe, expect, it } from "vitest";
import { getPasswordChangeRestriction, getUserDeletionRestriction } from "../src/lib/auth/admin-user-management";

const actorUserId = "00000000-0000-4000-8000-000000000001";
const targetUserId = "00000000-0000-4000-8000-000000000002";

describe("admin user management policy", () => {
  it("allows an admin to set a dealer user's password", () => {
    expect(getPasswordChangeRestriction({
      actorUserId,
      actorRoles: ["admin"],
      targetUserId,
      targetRoles: ["dealer_owner"],
    })).toBeNull();
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
