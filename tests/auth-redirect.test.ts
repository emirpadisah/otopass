import { describe, it, expect } from "vitest";
import type { UserRole } from "../src/lib/types";

function resolveRoute(roles: UserRole[]) {
  if (roles.includes("admin") || roles.includes("super_admin")) return "/admin";
  if (roles.some((r) => r.startsWith("dealer_"))) return "/dealer";
  return "/login";
}

describe("auth redirect resolver", () => {
  it("routes admin roles to /admin", () => {
    expect(resolveRoute(["admin"])).toBe("/admin");
    expect(resolveRoute(["super_admin"])).toBe("/admin");
  });

  it("routes dealer roles to /dealer", () => {
    expect(resolveRoute(["dealer_owner"])).toBe("/dealer");
  });

  it("routes unknown roles to /login", () => {
    expect(resolveRoute([])).toBe("/login");
  });
});
