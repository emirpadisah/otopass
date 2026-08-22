"use server";

import { revalidatePath } from "next/cache";
import { canManageDealerMembership } from "@/lib/auth/route";
import { requireUser } from "@/lib/auth/session";
import { getDealerForCurrentUser } from "@/lib/supabase/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ActionResponse } from "@/lib/types";

export async function updateDealerProfileAction(_state: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  const membership = await getDealerForCurrentUser();
  if (!membership || !canManageDealerMembership(membership.role)) return { ok: false, code: "FORBIDDEN", message: "Profil düzenleme yetkiniz bulunmuyor." };
  const name = String(formData.get("name") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const privacyEmail = String(formData.get("privacyEmail") ?? "").trim() || null;
  if (!name || name.length > 120) return { ok: false, code: "VALIDATION", message: "Galeri adı geçersiz." };
  if ([contactEmail, privacyEmail].some((email) => email && !/^\S+@\S+\.\S+$/.test(email))) return { ok: false, code: "VALIDATION", message: "E-posta adreslerini kontrol edin." };
  const service = createSupabaseServiceClient();
  const { error } = await service.from("dealers").update({ name, contact_email: contactEmail, privacy_contact_email: privacyEmail }).eq("id", membership.dealer_id);
  if (error) return { ok: false, code: "UPDATE_FAILED", message: "Profil güncellenemedi." };
  await service.from("activity_log").insert({ actor_user_id: actor.id, dealer_id: membership.dealer_id, action: "DEALER_PROFILE_UPDATED", metadata: {} });
  revalidatePath("/dealer/profile");
  revalidatePath(`/form`);
  return { ok: true, code: "PROFILE_UPDATED", message: "Galeri profili güncellendi." };
}
