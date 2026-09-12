import { beforeEach, expect, it, vi } from "vitest";
import type { LocalData } from "../src/lib/local/store";
import { getTrackingStatus } from "../src/lib/application-tracking-status";

const mocks = vi.hoisted(() => ({ read: vi.fn(), mutate: vi.fn(), dealer: vi.fn(), application: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/data-mode", () => ({ isLocalDataMode: () => true }));
vi.mock("@/lib/local/store", () => ({ readLocalData: mocks.read, mutateLocalData: mocks.mutate }));
vi.mock("@/lib/supabase/queries", () => ({ getDealerForCurrentUser: mocks.dealer, getDealerApplicationForCurrentUser: mocks.application }));
import { createTrackingCredential, readApplicationTracking, startApplicationReview } from "../src/lib/application-tracking";

let data: LocalData;
beforeEach(() => {
  vi.clearAllMocks();
  data = {
    dealers: [{ id: "dealer", name: "Test Galeri", slug: "test-galeri", is_active: true }],
    applications: [{ id: "app", dealer_id: "dealer", brand: "Toyota", model: "Corolla", status: "pending", submitted_at: "2026-09-07", owner_name: "PRIVATE NAME", owner_phone: "PRIVATE PHONE", photo_paths: ["PRIVATE PHOTO"], damage_info: "PRIVATE NOTE" }],
  } as unknown as LocalData;
  mocks.read.mockImplementation(async () => data);
  mocks.mutate.mockImplementation(async (fn: (d: LocalData) => unknown) => fn(data));
  mocks.dealer.mockResolvedValue({ dealer_id: "dealer", role: "manager" });
  mocks.application.mockImplementation(async () => data.applications[0]);
});
const tokenFrom = (url: string) => url.split("/").at(-1)!;
function submitWithTracking() {
  const credential = createTrackingCredential();
  data.applications[0].tracking_token_hash = credential.hash;
  return tokenFrom(credential.url);
}

it("creates independent random credentials and stores only their hashes", async () => {
  const credential = createTrackingCredential();
  expect(tokenFrom(credential.url)).toMatch(/^[a-f0-9]{64}$/);
  expect(credential.hash).not.toBe(tokenFrom(credential.url));
  const first = submitWithTracking();
  const result = await readApplicationTracking(first);
  expect(result?.vehicle).toBe("Toyota · Corolla");
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE|tracking_token_hash|dealer_id/);
  expect(first).not.toBe(tokenFrom(createTrackingCredential().url));
  await startApplicationReview("app");
  expect(await readApplicationTracking(first)).toMatchObject({ reviewStartedAt: expect.any(String) });
  data.applications[0].status = "offered";
  expect(await readApplicationTracking(first)).toMatchObject({ status: "offered" });
});

it("does not expose drafts, purged applications or inactive galleries", async () => {
  const token = submitWithTracking();
  data.applications[0].submitted_at = null;
  expect(await readApplicationTracking(token)).toBeNull();
  data.applications[0].submitted_at = "2026-09-07";
  data.applications[0].purged_at = "2026-09-07";
  expect(await readApplicationTracking(token)).toBeNull();
  data.applications[0].purged_at = null;
  data.dealers[0].is_active = false;
  expect(await readApplicationTracking(token)).toBeNull();
});

it("rejects guessed reference codes and malformed tokens before database access", async () => {
  for (const token of ["OTP-20260907-12345678", "app", "a".repeat(63), "z".repeat(64)]) expect(await readApplicationTracking(token)).toBeNull();
  expect(mocks.read).not.toHaveBeenCalled();
});

it("starts review explicitly and preserves its original timestamp on retries", async () => {
  await startApplicationReview("app");
  const timestamp = data.applications[0].review_started_at;
  expect(timestamp).toBeTruthy();
  await startApplicationReview("app");
  expect(data.applications[0].review_started_at).toBe(timestamp);
  expect(data.applications[0].status).toBe("pending");
  data.applications[0].status = "offered";
  await expect(startApplicationReview("app")).rejects.toThrow();
});

it("blocks viewers, unauthenticated callers and other dealers from mutations", async () => {
  for (const dealer of [null, { dealer_id: "dealer", role: "viewer" }, { dealer_id: "other", role: "owner" }]) {
    mocks.dealer.mockResolvedValue(dealer);

    await expect(startApplicationReview("app")).rejects.toThrow();
  }
  expect(mocks.mutate).not.toHaveBeenCalled();
});

it("maps real stages and closed outcomes without inventing review activity", () => {
  expect(getTrackingStatus("pending", null)).toMatchObject({ step: 0, title: "Başvurunuz alındı" });
  expect(getTrackingStatus("pending", "2026-09-07")).toMatchObject({ step: 1 });
  expect(getTrackingStatus("offered", null)).toMatchObject({ step: 2, title: "Teklif hazırlandı" });
  expect(getTrackingStatus("accepted", null).title).toBe("Teklif kabul edildi");
  expect(getTrackingStatus("rejected", null).title).toBe("Teklif sonuçlandı");
  expect(getTrackingStatus("sold", null).title).toBe("Süreç tamamlandı");
  expect(getTrackingStatus("archived", null)).toMatchObject({ step: -1, title: "Başvuru kapatıldı" });
});
