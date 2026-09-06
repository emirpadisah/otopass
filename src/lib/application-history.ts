import type { Database } from "./supabase/database.types";

export type HistoryOffer = Database["public"]["Tables"]["offers"]["Row"];
type Followup = Database["public"]["Tables"]["application_followups"]["Row"];
export type ApplicationHistoryEntry = {
  id: string;
  date: string;
  title: string;
  offer?: HistoryOffer;
  note?: string | null;
  noteLabel?: string;
  followup?: Followup;
};

export function buildApplicationHistory(offers: HistoryOffer[], followups: Followup[]): ApplicationHistoryEntry[] {
  const entries: ApplicationHistoryEntry[] = [];
  for (const offer of offers) {
    const answered = offer.responded_at && ["accepted", "rejected"].includes(offer.status);
    entries.push({ id: `offer:${offer.id}`, date: offer.created_at, title: "Teklif oluşturuldu", offer,
      note: answered ? null : offer.notes, noteLabel: "Teklif notu" });
    if (answered) entries.push({ id: `response:${offer.id}`, date: offer.responded_at!,
      title: offer.status === "accepted" ? "Müşteri teklifi kabul etti" : "Müşteri teklifi reddetti", offer,
      // Existing records store both notes in the same field; don't invent a split.
      note: offer.notes, noteLabel: "Teklif ve görüşme notları" });
  }
  for (const followup of followups) {
    entries.push({ id: `note:${followup.id}`, date: followup.created_at, title: "Galeri içi not", note: followup.note, followup });
    if (followup.completed_at) entries.push({ id: `completed:${followup.id}`, date: followup.completed_at, title: "Hatırlatma tamamlandı", note: followup.note });
  }
  return entries.sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id));
}
