import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalData } from "../src/lib/local/store";

const mocks = vi.hoisted(() => ({ context: vi.fn(), read: vi.fn(), mutate: vi.fn(), local: vi.fn(), server: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/access-context", () => ({ getRequestAccessContext: mocks.context }));
vi.mock("@/lib/local/store", () => ({ readLocalData: mocks.read, mutateLocalData: mocks.mutate }));
vi.mock("@/lib/data-mode", () => ({ isLocalDataMode: mocks.local }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.server }));

import { addApplicationFollowup, completeApplicationFollowup, getDueFollowups, listApplicationFollowups } from "../src/lib/supabase/followups";

const appId = "20000000-0000-4000-8000-000000000001";
let data: LocalData;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.local.mockReturnValue(true);
  mocks.context.mockResolvedValue({ isActive: true, mustChangePassword: false, dealerId: "dealer-a", membershipRole: "manager", user: { id: "user-a" } });
  data = { applications: [{ id: appId, dealer_id: "dealer-a", status: "pending", submitted_at: "2026-01-01", brand: "Renault", model: "Clio" }], application_followups: [] } as unknown as LocalData;
  mocks.read.mockImplementation(async () => data);
  mocks.mutate.mockImplementation(async (mutation: (draft: LocalData) => unknown) => mutation(data));
});

describe("followup access and lifecycle", () => {
  it("persists internal notes without an offer or reminder", async () => {
    await addApplicationFollowup({ applicationId: appId, note: "Telefonla görüşüldü", reminderAt: null });
    expect(await listApplicationFollowups(appId)).toHaveLength(1);
    expect(data.application_followups[0].created_by).toBe("user-a");
  });
  it.each([null, { isActive: false, dealerId: "dealer-a" }, { isActive: true, dealerId: "dealer-a", mustChangePassword: true }, { isActive: true, dealerId: "dealer-a", membershipRole: "viewer" }])("rejects unauthorized mutation before touching storage", async (context) => {
    mocks.context.mockResolvedValue(context);
    await expect(addApplicationFollowup({ applicationId: appId, note: "Test", reminderAt: null })).rejects.toThrow();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("rejects cross-dealer notes and reminder completion", async () => {
    data.applications[0].dealer_id = "dealer-b";
    await expect(addApplicationFollowup({ applicationId: appId, note: "Test", reminderAt: null })).rejects.toThrow("yetkiniz");
    expect(await listApplicationFollowups(appId)).toEqual([]);
    data.application_followups.push({ id: "note-b", application_id: appId, reminder_at: "2026-01-01T00:00:00Z", note: "Private" } as LocalData["application_followups"][number]);
    expect((await getDueFollowups()).total).toBe(0);
    await expect(completeApplicationFollowup("note-b")).rejects.toThrow("yetkiniz");
  });
  it("shows only due reminders and supports idempotent completion", async () => {
    await addApplicationFollowup({ applicationId: appId, note: "Geri ara", reminderAt: new Date(Date.now() + 86_400_000).toISOString() });
    expect((await getDueFollowups()).total).toBe(0);
    const followup = data.application_followups[0];
    followup.reminder_at = "2026-01-01T00:00:00Z";
    expect((await getDueFollowups()).total).toBe(1);
    await completeApplicationFollowup(followup.id);
    const completed = followup.completed_at;
    const laterActivity = new Date(Date.parse(completed!) + 60_000).toISOString();
    data.applications[0].updated_at = laterActivity;
    await completeApplicationFollowup(followup.id);
    expect(followup.completed_at).toBe(completed);
    expect(data.applications[0].updated_at).toBe(laterActivity);
    expect((await getDueFollowups()).total).toBe(0);
    expect(await listApplicationFollowups(appId)).toHaveLength(1);
  });
  it("hides closed-application reminders and rejects new reminders for them", async () => {
    await addApplicationFollowup({ applicationId: appId, note: "Geri ara", reminderAt: new Date(Date.now() + 86_400_000).toISOString() });
    data.application_followups[0].reminder_at = "2026-01-01T00:00:00Z";
    data.applications[0].status = "sold";
    expect((await getDueFollowups()).total).toBe(0);
    await expect(addApplicationFollowup({ applicationId: appId, note: "Test", reminderAt: new Date(Date.now() + 86_400_000).toISOString() })).rejects.toThrow("Tamamlanan");
    await expect(addApplicationFollowup({ applicationId: appId, note: "Devir tamamlandı", reminderAt: null })).resolves.toBeUndefined();
  });
  it("uses the authenticated RPC for production writes", async () => {
    mocks.local.mockReturnValue(false);
    const rpc = vi.fn().mockResolvedValue({ data: "note-id", error: null });
    mocks.server.mockResolvedValue({ rpc });
    await addApplicationFollowup({ applicationId: appId, note: "Test", reminderAt: null });
    expect(rpc).toHaveBeenCalledWith("add_application_followup", { p_application_id: appId, p_note: "Test", p_reminder_at: null });
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
