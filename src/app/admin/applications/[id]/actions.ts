"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { deleteApplicationForAuthorizedActor } from "@/lib/supabase/application-deletion";
import type { ActionResponse } from "@/lib/types";

export async function deleteAdminApplicationAction(
  _state: ActionResponse,
  formData: FormData,
): Promise<ActionResponse> {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  if (!applicationId) return { ok: false, code: "VALIDATION", message: "Başvuru seçimi geçersiz." };

  const actor = await requireUser();
  await requireAdminAccess();
  let cleanupFailed = false;
  try {
    const result = await deleteApplicationForAuthorizedActor({
      applicationId,
      actorUserId: actor.id,
      scope: { type: "admin" },
    });
    cleanupFailed = result.cleanupFailed;
  } catch (error) {
    return {
      ok: false,
      code: "DELETE_FAILED",
      message: error instanceof Error ? error.message : "Başvuru silinemedi.",
    };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/offers");
  revalidatePath("/admin/audit");
  redirect(`/admin/applications?deleted=1${cleanupFailed ? "&cleanup=pending" : ""}`);
}
