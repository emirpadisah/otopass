import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ claims: vi.fn(), context: vi.fn(), email: vi.fn(), mfaExempt: vi.fn(), factors: vi.fn(), signOut: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/data-mode", () => ({ isLocalDataMode: () => false }));
vi.mock("@/lib/local/auth", () => ({ getLocalSessionUser: vi.fn(), signOutLocalUser: vi.fn() }));
vi.mock("@/lib/local/store", () => ({ readLocalData: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: {
  getClaims: mocks.claims, signOut: mocks.signOut, mfa: { listFactors: mocks.factors },
} }) }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({
  rpc: (name: string) => name === "get_email_verification_status" ? mocks.email() : name === "get_mfa_exemption_status" ? mocks.mfaExempt() : ({ maybeSingle: mocks.context }),
}) }));

import { getProtectedAccessContext } from "../src/lib/auth/access-context";
import { requireAuthenticatedUser, requireUser } from "../src/lib/auth/session";
import { requireAdminAccess } from "../src/lib/auth/roles";
import { requirePasswordChangeAccess } from "../src/lib/auth/password-access";
import { hasRequiredAssurance } from "../src/lib/auth/mfa-policy";
afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.email.mockResolvedValue({ data: true, error: null });
  mocks.claims.mockResolvedValue({ data: { claims: { sub: "actor", aal: "aal2" } }, error: null });
  mocks.context.mockResolvedValue({ data: { user_id: "actor", is_active: true, must_change_password: false, roles: ["admin"] }, error: null });
  mocks.mfaExempt.mockResolvedValue({ data: false, error: null });
  mocks.factors.mockResolvedValue({ data: { all: [] }, error: null });
});

describe("MFA server and data boundaries", () => {
  it("allows AAL2 access without claiming email proof while rollout is deferred", async () => {
    vi.stubEnv("OTOPASS_EMAIL_VERIFICATION_REQUIRED", "false");
    expect(await getProtectedAccessContext()).toMatchObject({ emailVerified: false, user: { id: "actor" } });
    await expect(requireUser()).resolves.toMatchObject({ id: "actor" });
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it("keeps MFA, active-account and password boundaries when email is deferred", async () => {
    vi.stubEnv("OTOPASS_EMAIL_VERIFICATION_REQUIRED", "false");
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "actor", aal: "aal1" } }, error: null });
    expect(await getProtectedAccessContext()).toBeNull();
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login/mfa/setup");
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "actor", aal: "aal2" } }, error: null });
    mocks.context.mockResolvedValue({ data: { user_id: "actor", is_active: true, must_change_password: true, roles: ["admin"] }, error: null });
    expect(await getProtectedAccessContext()).toBeNull();
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login/change-password");
    mocks.context.mockResolvedValue({ data: { user_id: "actor", is_active: false, roles: ["admin"] }, error: null });
    expect(await getProtectedAccessContext()).toBeNull();
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login?reason=inactive");
  });
  it.each([false, null, undefined])("blocks missing email evidence %s even with AAL2", async (verified) => {
    mocks.email.mockResolvedValue({ data: verified, error: null });
    expect(await getProtectedAccessContext()).toBeNull();
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login/verify-email");
    await expect(requirePasswordChangeAccess()).rejects.toThrow("REDIRECT:/login/verify-email");
  });
  it("fails closed if the email evidence lookup is unavailable", async () => {
    mocks.email.mockResolvedValue({ data: true, error: new Error("offline") });
    await expect(getProtectedAccessContext()).rejects.toThrow("E-posta doğrulama durumu alınamadı");
  });
  it.each(["aal1", undefined, "local", "aal3"])("rejects untrusted/insufficient assurance %s for panels and data", async (aal) => {
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "actor", aal } }, error: null });
    expect(await getProtectedAccessContext()).toBeNull();
    await expect(requireAdminAccess()).rejects.toThrow("REDIRECT:/login/mfa/setup");
    expect(await requireAuthenticatedUser()).toEqual({ id: "actor", email: null });
  });
  it("rejects failed JWT verification even if the payload claims AAL2", async () => {
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "actor", aal: "aal2" } }, error: new Error("invalid signature") });
    expect(await getProtectedAccessContext()).toBeNull();
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it("allows verified AAL2 admin access", async () => {
    expect(await requireAdminAccess()).toEqual(["admin"]);
    expect((await getProtectedAccessContext())?.user.id).toBe("actor");
  });
  it("allows the explicitly exempt demo account at AAL1", async () => {
    vi.stubEnv("OTOPASS_EMAIL_VERIFICATION_REQUIRED", "false");
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "actor", aal: "aal1" } }, error: null });
    mocks.mfaExempt.mockResolvedValue({ data: true, error: null });
    expect(await getProtectedAccessContext()).toMatchObject({ mfaExempt: true, user: { id: "actor" } });
    await expect(requireUser()).resolves.toMatchObject({ id: "actor" });
  });
  it("keeps password-change restrictions on data access even with AAL2", async () => {
    mocks.context.mockResolvedValue({ data: { user_id: "actor", is_active: true, must_change_password: true, roles: ["admin"] }, error: null });
    expect(await getProtectedAccessContext()).toBeNull();
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login/change-password");
  });
  it("rejects inactive accounts even with AAL2", async () => {
    mocks.context.mockResolvedValue({ data: { user_id: "actor", is_active: false, roles: ["admin"] }, error: null });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login?reason=inactive");
    expect(mocks.signOut).toHaveBeenCalled();
  });
  it("requires enrolled MFA before password replacement at AAL1", async () => {
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "actor", aal: "aal1" } }, error: null });
    mocks.factors.mockResolvedValue({ data: { all: [{ status: "verified" }] }, error: null });
    await expect(requirePasswordChangeAccess()).rejects.toThrow("REDIRECT:/login/mfa/setup?next=password");
  });
  it("allows first-password bootstrap but fails closed on factor lookup failure", async () => {
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "actor", aal: "aal1" } }, error: null });
    await expect(requirePasswordChangeAccess()).resolves.toMatchObject({ id: "actor" });
    mocks.factors.mockResolvedValue({ data: null, error: new Error("offline") });
    await expect(requirePasswordChangeAccess()).rejects.toThrow("Hesap güvenliği doğrulanamadı");
  });
  it("does not accept local assurance in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    try { expect(hasRequiredAssurance("local")).toBe(false); } finally { vi.unstubAllEnvs(); }
  });
});
