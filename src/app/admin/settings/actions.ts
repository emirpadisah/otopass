"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccess } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ActionResponse } from "@/lib/types";

export async function updateSettingsAction(_state: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();
  const archiveDays = Number(formData.get("archiveDays"));
  const purgeDays = Number(formData.get("purgeDays"));
  if (!Number.isInteger(archiveDays) || archiveDays < 30 || archiveDays > 3650 || !Number.isInteger(purgeDays) || purgeDays < 1 || purgeDays > 365) return { ok: false, code: "VALIDATION", message: "Saklama sürelerini geçerli aralıkta girin." };
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("app_settings").upsert({ key: "retention", value: { archive_after_days: archiveDays, purge_after_days: purgeDays }, updated_by: actor.id });
  if (error) return { ok: false, code: "UPDATE_FAILED", message: "Ayarlar kaydedilemedi." };
  await supabase.from("activity_log").insert({ actor_user_id: actor.id, action: "ADMIN_SETTINGS_UPDATED", metadata: { archive_days: archiveDays, purge_days: purgeDays } });
  revalidatePath("/admin/settings");
  return { ok: true, code: "SETTINGS_UPDATED", message: "Operasyon ayarları güncellendi." };
}
