"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResponse } from "@/lib/types";
import { addApplicationFollowup, completeApplicationFollowup } from "@/lib/supabase/followups";

function refreshFollowups(applicationId: string) {
  revalidatePath("/dealer");
  revalidatePath("/dealer/applications");
  revalidatePath(`/dealer/applications/${applicationId}`);
}

export async function addFollowupAction(_previous: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const reminder = String(formData.get("reminderAt") ?? "").trim();
  try {
    if (reminder && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(reminder)) throw new Error("Hatırlatma tarihi geçersiz.");
    await addApplicationFollowup({ applicationId, note: String(formData.get("note") ?? ""),
      reminderAt: reminder ? `${reminder}:00+03:00` : null });
    refreshFollowups(applicationId);
    return { ok: true, message: reminder ? "Not ve hatırlatma kaydedildi." : "Not kaydedildi." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Not kaydedilemedi." };
  }
}

export async function completeFollowupAction(_previous: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const id = z.uuid().safeParse(formData.get("followupId"));
  if (!id.success) return { ok: false, message: "Hatırlatma seçimi geçersiz." };
  try {
    const applicationId = await completeApplicationFollowup(id.data);
    refreshFollowups(applicationId);
    return { ok: true, message: "Hatırlatma tamamlandı." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Hatırlatma tamamlanamadı." };
  }
}
