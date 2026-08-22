"use server";

import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";
import { requireAdminAccess } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { isLocalDataMode } from "@/lib/data-mode";
import { createLocalDealer } from "@/lib/local/repository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentUserRoles } from "@/lib/auth/roles";

function slugify(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function updateDealerAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();
  const dealerId = String(formData.get("dealerId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const legalName = String(formData.get("legalName") ?? "").trim() || null;
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const privacyEmail = String(formData.get("privacyEmail") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";
  if (!dealerId || !name || name.length > 120) return { ok: false, code: "VALIDATION", message: "Galeri bilgileri geçersiz." };
  if ([contactEmail, privacyEmail].some((email) => email && !/^\S+@\S+\.\S+$/.test(email))) return { ok: false, code: "VALIDATION", message: "E-posta adreslerini kontrol edin." };
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("dealers").update({ name, legal_name: legalName, contact_email: contactEmail, privacy_contact_email: privacyEmail, is_active: isActive, deactivated_at: isActive ? null : new Date().toISOString() }).eq("id", dealerId);
  if (error) return { ok: false, code: "UPDATE_FAILED", message: "Galeri güncellenemedi." };
  await supabase.from("activity_log").insert({ actor_user_id: actor.id, dealer_id: dealerId, action: "ADMIN_DEALER_UPDATED", metadata: { is_active: isActive } });
  revalidatePath("/admin/galleries");
  revalidatePath(`/admin/galleries/${dealerId}`);
  revalidatePath("/admin/users");
  return { ok: true, code: "DEALER_UPDATED", message: "Galeri bilgileri güncellendi." };
}

export async function deleteDealerAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();
  const roles = await getCurrentUserRoles();
  if (!roles.includes("super_admin")) return { ok: false, code: "FORBIDDEN", message: "Kalıcı silme işlemini yalnızca süper yönetici yapabilir." };
  const dealerId = String(formData.get("dealerId") ?? "").trim();
  const supabase = createSupabaseServiceClient();
  await supabase.from("activity_log").insert({ actor_user_id: actor.id, dealer_id: dealerId, action: "ADMIN_DEALER_DELETE_REQUESTED", metadata: { target_dealer_id: dealerId } });
  const { error } = await supabase.from("dealers").delete().eq("id", dealerId);
  if (error) return { ok: false, code: "DELETE_FAILED", message: "Galeri silinemedi." };
  revalidatePath("/admin/galleries");
  return { ok: true, code: "DEALER_DELETED", message: "Galeri kalıcı olarak silindi." };
}

export async function createDealerAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();

  if (!name) {
    return { ok: false, code: "VALIDATION", message: "Galeri adı zorunludur." };
  }

  if (name.length > 120) {
    return { ok: false, code: "VALIDATION", message: "Galeri adı en fazla 120 karakter olabilir." };
  }

  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return { ok: false, code: "VALIDATION", message: "Geçerli bir iletişim e-postası girin." };
  }

  const slug = slugify(slugInput || name);
  if (!slug) {
    return { ok: false, code: "VALIDATION", message: "Geçerli bir başvuru kodu oluşturulamadı." };
  }

  if (isLocalDataMode()) {
    try {
      await createLocalDealer({ name, slug, contactEmail: contactEmail || null });
      revalidatePath("/admin/galleries");
      revalidatePath("/admin/users");
      return { ok: true, code: "DEALER_CREATED", message: "Galeri başarıyla oluşturuldu." };
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      return {
        ok: false,
        code: code === "23505" ? "DUPLICATE" : "INSERT_FAILED",
        message: code === "23505" ? "Bu başvuru kodu zaten kullanılıyor." : "Galeri oluşturulamadı. Lütfen yeniden deneyin.",
      };
    }
  }

  const supabase = createSupabaseServiceClient();
  const { data: dealer, error } = await supabase.from("dealers").insert({
    name,
    slug,
    contact_email: contactEmail || null,
  }).select("id").single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, code: "DUPLICATE", message: "Bu başvuru kodu zaten kullanılıyor." };
    }
    return { ok: false, code: "INSERT_FAILED", message: "Galeri oluşturulamadı. Lütfen yeniden deneyin." };
  }

  const { error: auditError } = await supabase.from("activity_log").insert({
    actor_user_id: actor.id,
    dealer_id: dealer.id,
    action: "ADMIN_DEALER_CREATED",
    metadata: { target_dealer_id: dealer.id, slug },
  });
  if (auditError) {
    await supabase.from("dealers").delete().eq("id", dealer.id);
    return { ok: false, code: "AUDIT_FAILED", message: "Galeri işlem kaydı oluşturulamadı." };
  }

  revalidatePath("/admin/galleries");
  revalidatePath("/admin/users");

  return { ok: true, code: "DEALER_CREATED", message: "Galeri başarıyla oluşturuldu." };
}
