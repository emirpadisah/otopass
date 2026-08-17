import { Resend } from "resend";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type Payload = Record<string, Json | undefined>;

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));
}

function renderEmail(eventType: string, payload: Payload): { subject: string; html: string } {
  const reference = escapeHtml(payload.reference_code);
  const dealer = escapeHtml(payload.dealer_name || "Galeriniz");
  const amount = payload.amount ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: String(payload.currency || "TRY"), maximumFractionDigits: 0 }).format(Number(payload.amount)) : "";
  const content: Record<string, { subject: string; title: string; text: string }> = {
    application_created_customer: { subject: `Başvurunuz alındı · ${reference}`, title: "Başvurunuz güvenle alındı", text: `${dealer} araç bilgilerinizi değerlendirecek. Referans numaranız: ${reference}.` },
    application_created_dealer: { subject: `Yeni araç başvurusu · ${reference}`, title: "Yeni başvuru geldi", text: `${escapeHtml(payload.owner_name)} tarafından ${escapeHtml(payload.vehicle)} aracı için başvuru oluşturuldu.` },
    offer_created: { subject: `Araç teklifiniz hazır · ${reference}`, title: "Fiyat teklifiniz hazır", text: `${dealer} aracınız için ${escapeHtml(amount)} tutarında teklif oluşturdu. Galeri ekibi ayrıntılar için sizinle iletişime geçecektir.` },
    offer_accepted: { subject: `Teklif kabulü kaydedildi · ${reference}`, title: "Teklif kabulü kaydedildi", text: `${dealer} ile yapılan görüşmedeki kabul yanıtınız sisteme kaydedildi.` },
    offer_rejected: { subject: `Teklif yanıtı kaydedildi · ${reference}`, title: "Teklif yanıtınız kaydedildi", text: `${dealer} ile yapılan görüşmedeki ret yanıtınız sisteme kaydedildi.` },
    application_sold: { subject: `Araç alım süreci tamamlandı · ${reference}`, title: "Süreç tamamlandı", text: `${dealer} araç alım sürecini tamamlandı olarak kaydetti.` },
  };
  const selected = content[eventType] ?? { subject: `Otopass bildirimi · ${reference}`, title: "Başvuru güncellemesi", text: "Başvurunuzla ilgili yeni bir durum kaydedildi." };
  return {
    subject: selected.subject,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><p style="font-size:12px;font-weight:700;color:#e62d35">OTOPASS</p><h1 style="font-size:24px">${selected.title}</h1><p style="font-size:15px;line-height:1.7">${selected.text}</p><p style="margin-top:28px;font-size:12px;color:#667085">Bu e-posta Otopass operasyon sistemi tarafından gönderildi.</p></div>`,
  };
}

export async function processNotificationOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new Error("Resend production configuration is missing.");
  const resend = new Resend(apiKey);
  const supabase = createSupabaseServiceClient();
  await supabase
    .from("notification_outbox")
    .update({ status: "failed", next_attempt_at: new Date().toISOString(), last_error: "Processing lease expired" })
    .eq("status", "processing")
    .lt("updated_at", new Date(Date.now() - 15 * 60_000).toISOString());
  const { data: publicFormSetting } = await supabase.from("app_settings").select("value").eq("key", "public_form").maybeSingle();
  const notificationSetting = publicFormSetting?.value as { notifications_enabled?: boolean } | null;
  if (notificationSetting?.notifications_enabled === false) return { sent: 0, failed: 0 };
  const { data: rows, error } = await supabase.rpc("claim_notification_outbox", { p_limit: limit });
  if (error) throw error;
  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    try {
      const message = renderEmail(row.event_type, row.payload as Payload);
      const result = await resend.emails.send(
        { from, to: row.recipient_email, subject: message.subject, html: message.html },
        { idempotencyKey: row.idempotency_key },
      );
      if (result.error) throw new Error(result.error.message);
      await supabase.from("notification_outbox").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
      sent += 1;
    } catch (error) {
      const finalAttempt = row.attempts >= 5;
      const delayMinutes = Math.min(60, 2 ** Math.max(row.attempts, 1));
      await supabase.from("notification_outbox").update({
        status: "failed",
        last_error: error instanceof Error ? error.message.slice(0, 500) : "Unknown notification error",
        next_attempt_at: finalAttempt ? row.next_attempt_at : new Date(Date.now() + delayMinutes * 60_000).toISOString(),
      }).eq("id", row.id);
      failed += 1;
    }
  }
  return { sent, failed };
}
