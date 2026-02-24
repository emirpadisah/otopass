"use server";

import type { ActionResponse } from "@/lib/types";
import { createOfferForCurrentDealer } from "@/lib/supabase/offers";

export async function createOfferAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  try {
    await createOfferForCurrentDealer({ applicationId, amount, notes });
    return { ok: true, code: "OFFER_CREATED", message: "Offer created successfully." };
  } catch (error) {
    return {
      ok: false,
      code: "OFFER_FAILED",
      message: error instanceof Error ? error.message : "Offer creation failed.",
    };
  }
}
