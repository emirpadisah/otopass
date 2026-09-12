import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ create: vi.fn(), write: vi.fn(), remove: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/data-mode", () => ({ isLocalDataMode: () => false }));
vi.mock("@/lib/local/auth", () => ({ createLocalUser: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({
  auth: { admin: { createUser: m.create, deleteUser: m.remove } },
  from: () => ({ upsert: m.write, insert: m.write }),
}) }));
import { createUserByAdmin } from "../src/lib/supabase/auth";
afterEach(() => vi.unstubAllEnvs());
beforeEach(() => { vi.resetAllMocks(); m.create.mockResolvedValue({ data: { user: { id: "new-user" } }, error: null }); m.write.mockResolvedValue({ error: null }); });
it("creates an unconfirmed account without granting ownership evidence", async () => {
  await createUserByAdmin({ email: "new@security.test", password: "StrongPassword123!", fullName: "Test", role: "dealer_manager", dealerId: "dealer-a" });
  expect(m.create).toHaveBeenCalledWith({ email: "new@security.test", password: "StrongPassword123!", email_confirm: false });
  expect(m.write).toHaveBeenCalledWith(expect.objectContaining({ must_change_password: true }), expect.anything());
});
it("preserves temporary-password onboarding when email rollout is deferred", async () => {
  vi.stubEnv("OTOPASS_EMAIL_VERIFICATION_REQUIRED", "false");
  await createUserByAdmin({ email: "new@security.test", password: "StrongPassword123!", fullName: "Test", role: "dealer_manager", dealerId: "dealer-a" });
  expect(m.create).toHaveBeenCalledWith({ email: "new@security.test", password: "StrongPassword123!", email_confirm: true });
  expect(m.write).toHaveBeenCalledWith(expect.objectContaining({ must_change_password: true }), expect.anything());
  expect(m.remove).not.toHaveBeenCalled();
});
