import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dealer: vi.fn(),
  local: vi.fn(),
  createLocalOffer: vi.fn(),
  server: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data-mode", () => ({ isLocalDataMode: mocks.local }));
vi.mock("@/lib/local/repository", () => ({
  createLocalOffer: mocks.createLocalOffer,
  markLocalApplicationAsSold: vi.fn(),
  respondToLocalOffer: vi.fn(),
}));
vi.mock("@/lib/supabase/queries", () => ({ getDealerForCurrentUser: mocks.dealer }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.server }));

import { createOfferForCurrentDealer } from "../src/lib/supabase/offers";

describe("offer workflow access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dealer.mockResolvedValue({ dealer_id: "dealer-a", role: "manager" });
  });

  it("returns a safe explanation when the database rejects a draft or purged application", async () => {
    mocks.local.mockReturnValue(false);
    mocks.server.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ error: { message: "APPLICATION_NOT_SUBMITTED" } }),
    });

    await expect(createOfferForCurrentDealer({ applicationId: "application-a", amount: 100_000, notes: null }))
      .rejects.toThrow("henüz gönderilmemiş veya silinmiş");
  });

  it("keeps the local development workflow behind the same unpublished-record guard", async () => {
    mocks.local.mockReturnValue(true);
    mocks.createLocalOffer.mockRejectedValue(new Error("Bu başvuru henüz gönderilmemiş veya silinmiş."));

    await expect(createOfferForCurrentDealer({ applicationId: "application-a", amount: 100_000, notes: null }))
      .rejects.toThrow("henüz gönderilmemiş veya silinmiş");
    expect(mocks.createLocalOffer).toHaveBeenCalledWith({
      applicationId: "application-a",
      dealerId: "dealer-a",
      amount: 100_000,
      notes: null,
    });
  });
});
