import { z } from "zod";

export const followupInputSchema = z.object({
  applicationId: z.uuid("Başvuru seçimi geçersiz."),
  note: z.string().trim().min(1, "Lütfen kısa bir görüşme notu yazın.").max(2000, "Not en fazla 2000 karakter olabilir."),
  reminderAt: z.iso.datetime({ offset: true, message: "Hatırlatma tarihi geçersiz." }).nullable(),
});

export function validateFollowup(input: unknown, now = Date.now()) {
  const result = followupInputSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0].message);
  if (result.data.reminderAt && Date.parse(result.data.reminderAt) <= now) {
    throw new Error("Hatırlatma için gelecekte bir tarih seçin.");
  }
  return result.data;
}

export function getApplicationWaitingSince(application: {
  status: string;
  created_at: string;
  submitted_at?: string | null;
}, latestOfferAt: string | null): string | null {
  if (application.status === "pending") return application.submitted_at ?? application.created_at;
  if (application.status === "offered") return latestOfferAt;
  return null;
}

export function getWaitingLabel(status: string, waitingSince: string | null, now = Date.now()): string | null {
  if (!waitingSince || !["pending", "offered"].includes(status)) return null;
  const started = Date.parse(waitingSince);
  if (!Number.isFinite(started)) return null;
  const hours = Math.floor(Math.max(0, now - started) / 3_600_000);
  const duration = hours >= 24 ? `${Math.floor(hours / 24)} gündür` : hours >= 1 ? `${hours} saattir` : "1 saatten az süredir";
  return `${duration} ${status === "pending" ? "teklif bekliyor" : "yanıt bekliyor"}`;
}

export function formatFollowupDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(value));
}

// datetime-local values are explicitly displayed and interpreted in Turkey time.
export function tomorrowReminderValue(now = Date.now()): string {
  const tomorrow = new Date(now + 86_400_000 + 3 * 3_600_000).toISOString().slice(0, 10);
  return `${tomorrow}T09:00`;
}
