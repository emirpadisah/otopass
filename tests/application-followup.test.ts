import { describe, expect, it } from "vitest";
import { getApplicationWaitingSince, getWaitingLabel, tomorrowReminderValue, validateFollowup } from "../src/lib/application-followup";
import { getWhatsAppMessageUrl, getWhatsAppTemplates } from "../src/lib/whatsapp-templates";

const now = Date.parse("2026-09-05T12:00:00Z");
const input = { applicationId: "20000000-0000-4000-8000-000000000001", note: " Müşteri yarın aranacak. ", reminderAt: null };

describe("followup validation", () => {
  it("allows a standalone note without requiring a reminder", () => {
    expect(validateFollowup(input, now).note).toBe("Müşteri yarın aranacak.");
  });
  it.each(["", "   ", "x".repeat(2001)])("rejects empty or oversized notes", (note) => {
    expect(() => validateFollowup({ ...input, note }, now)).toThrow();
  });
  it.each(["yesterday", "2026-02-30T12:00:00+03:00", "2026-09-05T14:59:00+03:00", "2026-09-05T15:00:00+03:00"])("rejects invalid or non-future reminders: %s", (reminderAt) => {
    expect(() => validateFollowup({ ...input, reminderAt }, now)).toThrow();
  });
  it("accepts future reminders using Turkey time", () => {
    expect(validateFollowup({ ...input, reminderAt: "2026-09-06T09:00:00+03:00" }, now).reminderAt).toBe("2026-09-06T09:00:00+03:00");
  });
  it("uses the next Turkish calendar day across UTC midnight and year boundaries", () => {
    expect(tomorrowReminderValue(Date.parse("2026-12-31T22:30:00Z"))).toBe("2027-01-02T09:00");
  });
});

describe("waiting duration", () => {
  it("starts pending wait at submission, not upload initiation", () => {
    expect(getApplicationWaitingSince({ status: "pending", created_at: "2026-09-01T12:00:00Z", submitted_at: "2026-09-02T12:00:00Z" }, null)).toBe("2026-09-02T12:00:00Z");
  });
  it("starts reply wait at the latest offer, ignoring application age", () => {
    const start = getApplicationWaitingSince({ status: "offered", created_at: "2026-08-01T12:00:00Z" }, "2026-09-03T12:00:00Z");
    expect(getWaitingLabel("offered", start, now)).toBe("2 gündür yanıt bekliyor");
  });
  it.each(["accepted", "rejected", "sold", "archived"])("does not mislabel %s as awaiting a reply", (status) => {
    expect(getApplicationWaitingSince({ status, created_at: "2026-09-01T12:00:00Z" }, "2026-09-02T12:00:00Z")).toBeNull();
    expect(getWaitingLabel(status, "2026-09-01T12:00:00Z", now)).toBeNull();
  });
  it("handles sub-day waits, future clock skew and unavailable dates", () => {
    expect(getWaitingLabel("pending", "2026-09-05T10:00:00Z", now)).toBe("2 saattir teklif bekliyor");
    expect(getWaitingLabel("pending", "2026-09-06T12:00:00Z", now)).toBe("1 saatten az süredir teklif bekliyor");
    expect(getWaitingLabel("offered", null, now)).toBeNull();
    expect(getWaitingLabel("pending", "invalid", now)).toBeNull();
  });
});

describe("WhatsApp message templates", () => {
  const vehicle = { ownerName: "Deniz", dealerName: "Örnek Galeri", vehicleLabel: "Renault Clio", referenceCode: "OTP-1", offer: null };
  it("offers only a photo request when there is no current offer", () => {
    expect(getWhatsAppTemplates(vehicle).map((t) => t.id)).toEqual(["photos"]);
  });
  it("includes current offer conditions and reference without internal notes", () => {
    const templates = getWhatsAppTemplates({ ...vehicle, offer: { amount: 875000, currency: "TRY", notes: "Ekspertiz sonrası netleşir." } });
    expect(templates[0].message).toContain("875.000");
    expect(templates[0].message).toContain("Ekspertiz sonrası netleşir.");
    expect(templates[0].message).toContain("OTP-1");
    expect(templates[0].message).toContain("Renault Clio");
  });
  it("encodes edited Unicode and reserved characters without adding URL parameters", () => {
    const message = "Merhaba Deniz\nFiyat & koşullar? #araç";
    const url = new URL(getWhatsAppMessageUrl("0555 111 22 33", message)!);
    expect(url.pathname).toBe("/905551112233");
    expect(url.searchParams.get("text")).toBe(message);
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(getWhatsAppMessageUrl("invalid", message)).toBeNull();
    expect(getWhatsAppMessageUrl("05551112233", " ")).toBeNull();
  });
});
