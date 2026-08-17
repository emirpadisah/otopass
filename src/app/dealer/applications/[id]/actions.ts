"use server";

import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";
import { createOfferForCurrentDealer, respondToOfferForCurrentDealer } from "@/lib/supabase/offers";

export async function createOfferAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  try {
    await createOfferForCurrentDealer({ applicationId, amount, notes });
    revalidatePath("/dealer");
    revalidatePath("/dealer/applications");
    revalidatePath(`/dealer/applications/${applicationId}`);
    return { ok: true, code: "OFFER_CREATED", message: "Teklif başarıyla oluşturuldu." };
  } catch (error) {
    return {
      ok: false,
      code: "OFFER_FAILED",
      message: error instanceof Error ? error.message : "Teklif oluşturulamadı.",
    };
  }
}

export async function respondToOfferAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const offerId = String(formData.get("offerId") ?? "").trim();
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const response = String(formData.get("response") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!offerId || !applicationId || (response !== "accepted" && response !== "rejected")) {
    return { ok: false, code: "VALIDATION", message: "Teklif yanıtı geçersiz." };
  }
  try {
    await respondToOfferForCurrentDealer({ offerId, response, note });
    revalidatePath("/dealer");
    revalidatePath("/dealer/applications");
    revalidatePath(`/dealer/applications/${applicationId}`);
    return { ok: true, code: "OFFER_RESPONDED", message: response === "accepted" ? "Teklif kabul edildi." : "Teklif reddedildi." };
  } catch (error) {
    return { ok: false, code: "OFFER_RESPONSE_FAILED", message: error instanceof Error ? error.message : "Teklif yanıtı kaydedilemedi." };
  }
}
