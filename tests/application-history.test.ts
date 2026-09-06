import { describe, expect, it } from "vitest";
import { buildApplicationHistory, type HistoryOffer } from "../src/lib/application-history";
import type { Database } from "../src/lib/supabase/database.types";

const offer = { id: "offer-1", created_at: "2026-09-01T09:00:00Z", responded_at: "2026-09-02T09:00:00Z", status: "rejected", amount: 500000, currency: "TRY", notes: "Ekspertiz sonrası netleşir.\nMüşteri daha yüksek fiyat istiyor." } as HistoryOffer;
describe("application history", () => {
  it("preserves earlier offers and responses when a new offer exists", () => {
    const newer = { ...offer, id: "offer-2", status: "pending", amount: 550000, created_at: "2026-09-03T09:00:00Z", responded_at: null };
    const history = buildApplicationHistory([offer, newer], []);
    expect(history.map((e) => e.id)).toEqual(["offer:offer-2", "response:offer-1", "offer:offer-1"]);
    expect(history[1].title).toContain("reddetti");
    expect(history[0].offer?.amount).toBe(550000);
    expect(history[2].offer?.amount).toBe(500000);
    expect(history[2].note).toBeNull();
    expect(history[1].noteLabel).toBe("Teklif ve görüşme notları");
  });
  it("merges internal notes and reminder completion by event time", () => {
    const note = { id: "note-1", note: "Geri ara", created_at: "2026-09-01T12:00:00Z", completed_at: "2026-09-04T09:00:00Z" } as Database["public"]["Tables"]["application_followups"]["Row"];
    expect(buildApplicationHistory([offer], [note]).map((e) => e.id)).toEqual(["completed:note-1", "response:offer-1", "note:note-1", "offer:offer-1"]);
  });
  it("does not invent responses with no timestamp", () => {
    expect(buildApplicationHistory([{ ...offer, responded_at: null }], [])).toHaveLength(1);
    expect(buildApplicationHistory([], [])).toEqual([]);
  });
});
