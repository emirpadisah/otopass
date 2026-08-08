import { describe, it, expect } from "vitest";
import { canManageDealerMembership, resolveRouteForRoles } from "../src/lib/auth/route";

describe("auth redirect resolver", () => {
  it("routes admin roles to /admin", () => {
    expect(resolveRouteForRoles(["admin"])).toBe("/admin");
    expect(resolveRouteForRoles(["super_admin"])).toBe("/admin");
  });

  it("routes dealer roles to /dealer", () => {
    expect(resolveRouteForRoles(["dealer_owner"])).toBe("/dealer");
  });

  it("routes unknown roles to /login", () => {
    expect(resolveRouteForRoles([])).toBe("/login");
  });

  it("allows dealer writes only for owner and manager memberships", () => {
    expect(canManageDealerMembership("owner")).toBe(true);
    expect(canManageDealerMembership("manager")).toBe(true);
    expect(canManageDealerMembership("viewer")).toBe(false);
  });
});
