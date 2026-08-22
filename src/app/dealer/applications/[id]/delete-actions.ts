"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageDealerMembership } from "@/lib/auth/route";
import { requireUser } from "@/lib/auth/session";
import { deleteApplicationForAuthorizedActor } from "@/lib/supabase/application-deletion";
import { getDealerForCurrentUser } from "@/lib/supabase/queries";
import type { ActionResponse } from "@/lib/types";

export async function deleteDealerApplicationAction(
  _state: ActionResponse,
  formData: FormData,
): Promise<ActionResponse> {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  if (!applicationId) return { ok: false, code: "VALIDATION", message: "Başvuru seçimi geçersiz." };

  const [actor, dealer] = await Promise.all([requireUser(), getDealerForCurrentUser()]);
  if (!dealer?.dealer_id || !canManageDealerMembership(dealer.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Başvuru silme yetkiniz bulunmuyor." };
  }

  let cleanupFailed = false;
  try {
    const result = await deleteApplicationForAuthorizedActor({
      applicationId,
      actorUserId: actor.id,
      scope: { type: "dealer", dealerId: dealer.dealer_id },
    });
    cleanupFailed = result.cleanupFailed;
  } catch (error) {
    return {
      ok: false,
      code: "DELETE_FAILED",
      message: error instanceof Error ? error.message : "Başvuru silinemedi.",
    };
  }
  revalidatePath("/dealer");
  revalidatePath("/dealer/applications");
  redirect(`/dealer/applications?deleted=1${cleanupFailed ? "&cleanup=pending" : ""}`);
}
