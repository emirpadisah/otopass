"use server";

import { revalidatePath } from "next/cache";
import type { ActionResponse, UserRole } from "@/lib/types";
import { requireUser } from "@/lib/auth/session";
import { requireAdminAccess } from "@/lib/auth/roles";
import { createUserByAdmin } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentUserRoles } from "@/lib/auth/roles";
import { getDealerById } from "@/lib/supabase/queries";

const DEALER_ROLES: UserRole[] = ["dealer_owner", "dealer_manager", "dealer_viewer"];
const ALL_ROLES = new Set<UserRole>([
  "super_admin",
  "admin",
  "dealer_owner",
  "dealer_manager",
  "dealer_viewer",
]);

function getActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

export async function updateUserAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();
  const userId = String(formData.get("userId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;
  const dealerId = String(formData.get("dealerId") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";
  if (!userId || !ALL_ROLES.has(role)) return { ok: false, code: "VALIDATION", message: "Kullanıcı bilgileri geçersiz." };
  if (userId === actor.id && !isActive) return { ok: false, code: "SELF_DEACTIVATE", message: "Kendi hesabınızı pasifleştiremezsiniz." };
  if (DEALER_ROLES.includes(role) && !dealerId) return { ok: false, code: "VALIDATION", message: "Galeri rolü için galeri seçin." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_user_access", { p_user_id: userId, p_full_name: fullName, p_role: role, p_dealer_id: dealerId, p_is_active: isActive });
  if (error) return { ok: false, code: "UPDATE_FAILED", message: "Kullanıcı güncellenemedi." };
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, code: "USER_UPDATED", message: "Kullanıcı erişimi güncellendi." };
}

export async function sendPasswordResetAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();
  const userId = String(formData.get("userId") ?? "").trim();
  const service = createSupabaseServiceClient();
  const { data, error } = await service.auth.admin.getUserById(userId);
  if (error || !data.user.email) return { ok: false, code: "USER_NOT_FOUND", message: "Kullanıcı bulunamadı." };
  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.user.email, { redirectTo: `${siteUrl}/auth/callback?next=/login/reset-password` });
  if (resetError) return { ok: false, code: "RESET_FAILED", message: "Yenileme bağlantısı gönderilemedi." };
  await service.from("activity_log").insert({ actor_user_id: actor.id, action: "ADMIN_PASSWORD_RESET_SENT", metadata: { target_user_id: userId } });
  return { ok: true, code: "RESET_SENT", message: "Şifre yenileme bağlantısı gönderildi." };
}

export async function deleteUserAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();
  const roles = await getCurrentUserRoles();
  if (!roles.includes("super_admin")) return { ok: false, code: "FORBIDDEN", message: "Kalıcı silme yalnız super admin tarafından yapılabilir." };
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId || userId === actor.id) return { ok: false, code: "SELF_DELETE", message: "Kendi hesabınızı silemezsiniz." };
  const service = createSupabaseServiceClient();
  await service.from("activity_log").insert({ actor_user_id: actor.id, action: "ADMIN_USER_DELETED", metadata: { target_user_id: userId } });
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return { ok: false, code: "DELETE_FAILED", message: "Kullanıcı silinemedi." };
  revalidatePath("/admin/users");
  return { ok: true, code: "USER_DELETED", message: "Kullanıcı kalıcı olarak silindi." };
}

export async function createUserAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as UserRole;
  const dealerId = String(formData.get("dealerId") ?? "").trim() || undefined;

  if (!email || !password || !role) {
    return { ok: false, code: "VALIDATION", message: "E-posta, şifre ve rol zorunludur." };
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, code: "VALIDATION", message: "Geçerli bir e-posta adresi girin." };
  }

  if (!ALL_ROLES.has(role)) {
    return { ok: false, code: "VALIDATION", message: "Geçersiz kullanıcı rolü." };
  }

  if (role === "super_admin" && !(await getCurrentUserRoles()).includes("super_admin")) {
    return { ok: false, code: "FORBIDDEN", message: "Super admin rolünü yalnız mevcut bir super admin atayabilir." };
  }

  if (fullName && fullName.length > 120) {
    return { ok: false, code: "VALIDATION", message: "Ad soyad en fazla 120 karakter olabilir." };
  }

  if (DEALER_ROLES.includes(role) && !dealerId) {
    return { ok: false, code: "VALIDATION", message: "Galeri rolleri için galeri seçimi zorunludur." };
  }

  if (dealerId) {
    const dealer = await getDealerById(dealerId);
    if (!dealer) {
      return { ok: false, code: "VALIDATION", message: "Seçilen galeri bulunamadı." };
    }
  }

  try {
    await createUserByAdmin({
      email,
      password,
      fullName,
      role,
      dealerId: DEALER_ROLES.includes(role) ? dealerId : undefined,
      actorUserId: actor.id,
    });

    revalidatePath("/admin/users");

    if (DEALER_ROLES.includes(role)) {
      return {
        ok: true,
        code: "USER_CREATED",
        message: "Galeri hesabı başarıyla oluşturuldu. Kullanıcı ilk girişte şifre değiştirecek.",
      };
    }

    return { ok: true, code: "USER_CREATED", message: "Kullanıcı başarıyla oluşturuldu." };
  } catch (error) {
    return {
      ok: false,
      code: "USER_CREATE_FAILED",
      message: getActionErrorMessage(error, "Kullanıcı oluşturulamadı."),
    };
  }
}
