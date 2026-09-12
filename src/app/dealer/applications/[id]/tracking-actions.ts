"use server";

import { revalidatePath } from "next/cache";
import { startApplicationReview } from "@/lib/application-tracking";

type State = { message?: string; ok?: boolean };
export async function startApplicationReviewAction(_state: State, form: FormData): Promise<State> {
  const id = String(form.get("applicationId") ?? "");
  try {
    await startApplicationReview(id);
    revalidatePath(`/dealer/applications/${id}`);
    return { ok: true, message: "İnceleme başlatıldı." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "İşlem tamamlanamadı." };
  }
}
