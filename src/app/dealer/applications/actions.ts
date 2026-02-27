"use server";

import { revalidatePath } from "next/cache";
import { markApplicationAsSoldForCurrentDealer } from "@/lib/supabase/offers";

export async function markApplicationAsSoldAction(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  if (!applicationId) return;

  try {
    await markApplicationAsSoldForCurrentDealer(applicationId);
  } catch (error) {
    console.error("Failed to mark application as sold", error);
  }

  revalidatePath("/dealer");
  revalidatePath("/dealer/applications");
  revalidatePath(`/dealer/applications/${applicationId}`);
}
