import "server-only";

import { getPublicSiteOrigin } from "@/lib/site-url";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildNewApplicationEmail, type NewApplicationNotification } from "./new-application-template";

export async function notifyDealerOfNewApplication(application: NewApplicationNotification): Promise<"sent" | "unconfigured" | "no_recipient"> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return "unconfigured";

  const service = createSupabaseServiceClient();
  const { data: dealer, error } = await service
    .from("dealers")
    .select("contact_email, is_active")
    .eq("id", application.dealerId)
    .maybeSingle();
  if (error) throw error;
  const to = dealer?.contact_email?.trim();
  if (!dealer?.is_active || !to || !/^\S+@\S+\.\S+$/.test(to)) return "no_recipient";

  const email = buildNewApplicationEmail(application, getPublicSiteOrigin());
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `new-application/${application.id}`,
    },
    body: JSON.stringify({ from, to: [to], ...email }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Galeri e-posta bildirimi gönderilemedi (${response.status}).`);
  return "sent";
}
