import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ limit: vi.fn(), send: vi.fn(), resend: vi.fn(), verify: vi.fn(), signOut: vi.fn(), rpc: vi.fn(), local: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/security/request", () => ({ getClientIp: () => "192.0.2.1" }));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit: m.limit }));
vi.mock("@/lib/data-mode", () => ({ isLocalDataMode: m.local }));
vi.mock("@/lib/supabase/email-otp", () => ({ createEmailOtpClient: () => ({ auth: {
  signInWithOtp: m.send, resend: m.resend, verifyOtp: m.verify, signOut: m.signOut,
} }) }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({ rpc: m.rpc }) }));
import { sendEmailVerification, verifyEmailCode } from "../src/app/login/verify-email/actions";

const initial = { error: null, success: null };
afterEach(() => vi.unstubAllEnvs());
function form(email = "User@security.test", token = "12345678") {
  const data = new FormData(); data.set("email", email); data.set("token", token); return data;
}
beforeEach(() => {
  vi.resetAllMocks(); m.local.mockReturnValue(false); m.limit.mockResolvedValue(true);
  m.rpc.mockImplementation(async (name: string) => ({ data: name === "get_email_challenge_kind" ? "email" : null, error: null }));
  m.send.mockResolvedValue({ error: null }); m.resend.mockResolvedValue({ error: null });
  m.signOut.mockResolvedValue({ error: null });
  m.verify.mockResolvedValue({ data: { session: { access_token: "never-return-this" }, user: {
    id: "verified-user", email: "user@security.test", email_confirmed_at: "2026-09-08T12:00:00Z",
  } }, error: null });
});
describe("email ownership challenges", () => {
  it("does not contact Auth or write evidence when rollout is deferred", async () => {
    vi.stubEnv("OTOPASS_EMAIL_VERIFICATION_REQUIRED", "false");
    expect((await sendEmailVerification(initial, form())).error).toBeTruthy();
    expect((await verifyEmailCode(initial, form())).error).toBeTruthy();
    for (const fn of [m.limit, m.rpc, m.send, m.resend, m.verify, m.signOut]) expect(fn).not.toHaveBeenCalled();
  });
  it("uses an OTP for new accounts already confirmed by Auth but lacking ownership proof", async () => {
    expect((await sendEmailVerification(initial, form())).success).toBeTruthy();
    expect(m.send).toHaveBeenCalledWith({ email: "user@security.test", options: { shouldCreateUser: false } });
    expect(m.resend).not.toHaveBeenCalled();
  });
  it("sends confirmation to unconfirmed admin-created users without enabling signup", async () => {
    m.rpc.mockResolvedValue({ data: "signup", error: null });
    await sendEmailVerification(initial, form());
    expect(m.resend).toHaveBeenCalledWith({ email: "user@security.test", type: "signup" });
    expect(m.send).not.toHaveBeenCalled();
  });
  it("does not disclose missing accounts or provider delivery errors", async () => {
    const normal = await sendEmailVerification(initial, form());
    m.rpc.mockResolvedValue({ data: null, error: null });
    expect(await sendEmailVerification(initial, form())).toEqual(normal);
    m.rpc.mockResolvedValue({ data: "email", error: null }); m.send.mockResolvedValue({ error: { code: "smtp_error" } });
    expect(await sendEmailVerification(initial, form())).toEqual(normal);
  });
  it("blocks sends and guesses before the Auth API when rate limited", async () => {
    m.limit.mockResolvedValue(false);
    expect((await sendEmailVerification(initial, form())).error).toBeTruthy();
    expect((await verifyEmailCode(initial, form())).error).toBeTruthy();
    expect(m.send).not.toHaveBeenCalled(); expect(m.verify).not.toHaveBeenCalled();
  });
  it("fails closed on rate-limit storage failure", async () => {
    m.limit.mockRejectedValue(new Error("offline"));
    expect((await verifyEmailCode(initial, form())).error).toBeTruthy();
    expect(m.verify).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
  });
  it.each(["wrong", "12345", "12345678901", "", "<script>"])("rejects malformed code %s without an Auth request", async (token) => {
    expect((await verifyEmailCode(initial, form(undefined, token))).error).toBeTruthy(); expect(m.verify).not.toHaveBeenCalled();
  });
  it.each(["expired", "replayed", "incorrect"])("does not record ownership when GoTrue rejects %s code", async (reason) => {
    m.verify.mockResolvedValue({ data: { user: null, session: null }, error: new Error(reason) });
    expect((await verifyEmailCode(initial, form())).error).toBeTruthy(); expect(m.rpc).not.toHaveBeenCalledWith("record_email_verification", expect.anything());
  });
  it("records only the OTP-verified identity and returns no session or token", async () => {
    const data = form(); data.set("userId", "attacker-chosen"); data.set("email_confirmed", "true");
    const result = await verifyEmailCode(initial, data);
    expect(result.error).toBeNull();
    expect(m.rpc).toHaveBeenCalledWith("record_email_verification", {
      p_user_id: "verified-user", p_email: "user@security.test", p_confirmed_at: "2026-09-08T12:00:00Z",
    });
    expect(JSON.stringify(result)).not.toContain("never-return-this");
    expect(m.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("rejects mismatched email and closes the ephemeral session", async () => {
    expect((await verifyEmailCode(initial, form("other@security.test"))).error).toBeTruthy();
    expect(m.rpc).not.toHaveBeenCalledWith("record_email_verification", expect.anything()); expect(m.signOut).toHaveBeenCalled();
  });
  it("requires provider confirmation, not just a returned user", async () => {
    m.verify.mockResolvedValue({ data: { session: {}, user: { id: "u", email: "user@security.test" } }, error: null });
    expect((await verifyEmailCode(initial, form())).error).toBeTruthy(); expect(m.rpc).not.toHaveBeenCalledWith("record_email_verification", expect.anything());
  });
  it("fails closed if the evidence transaction fails and still closes the session", async () => {
    m.rpc.mockImplementation(async (name: string) => name === "get_email_challenge_kind"
      ? { data: "email", error: null }
      : { data: null, error: { message: "EMAIL_VERIFICATION_REJECTED" } });
    expect((await verifyEmailCode(initial, form())).error).toBeTruthy(); expect(m.signOut).toHaveBeenCalled();
  });
  it("leaves exempt existing accounts untouched on send and verification requests", async () => {
    m.rpc.mockResolvedValue({ data: null, error: null });
    await sendEmailVerification(initial, form());
    await verifyEmailCode(initial, form());
    expect(m.send).not.toHaveBeenCalled(); expect(m.resend).not.toHaveBeenCalled();
    expect(m.verify).not.toHaveBeenCalled(); expect(m.signOut).not.toHaveBeenCalled();
    expect(m.rpc).not.toHaveBeenCalledWith("record_email_verification", expect.anything());
  });
});
