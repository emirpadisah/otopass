"use server";

import { revalidatePath } from "next/cache";
import { markApplicationAsSoldForCurrentDealer } from "@/lib/supabase/offers";
import type { ActionResponse } from "@/lib/types";

export async function markApplicationAsSoldAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  if (!applicationId) {
    return { ok: false, code: "VALIDATION", message: "Başvuru seçimi geçersiz." };
  }

  try {
    await markApplicationAsSoldForCurrentDealer(applicationId);
  } catch (error) {
    return {
      ok: false,
      code: "STATUS_UPDATE_FAILED",
      message: error instanceof Error ? error.message : "Başvuru durumu güncellenemedi.",
    };
  }

  revalidatePath("/dealer");
  revalidatePath("/dealer/applications");
  revalidatePath(`/dealer/applications/${applicationId}`);
  return { ok: true, code: "APPLICATION_SOLD", message: "Başvuru alındı olarak güncellendi." };
}
