"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResponse, UserRole } from "@/lib/types";
import { requireUser } from "@/lib/auth/session";
import { requireAdminAccess } from "@/lib/auth/roles";
import { createUserByAdmin } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentUserRoles } from "@/lib/auth/roles";
import { getDealerById } from "@/lib/supabase/queries";
import { validatePasswordPolicy } from "@/lib/validation/password";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { AdminUserCreationError } from "@/lib/supabase/admin-user-errors";

const DEALER_ROLES: UserRole[] = ["dealer_owner", "dealer_manager", "dealer_viewer"];
const ALL_ROLES = new Set<UserRole>([
  "super_admin",
  "admin",
  "dealer_owner",
  "dealer_manager",
  "dealer_viewer",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function updateUserAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();
  const userId = String(formData.get("userId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;
  const dealerId = String(formData.get("dealerId") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";
  if (!UUID_PATTERN.test(userId) || fullName.length > 120 || !ALL_ROLES.has(role)) return { ok: false, code: "VALIDATION", message: "Kullanıcı bilgileri geçersiz." };
  if (userId === actor.id && !isActive) return { ok: false, code: "SELF_DEACTIVATE", message: "Kendi hesabınızı pasifleştiremezsiniz." };
  if (DEALER_ROLES.includes(role) && !dealerId) return { ok: false, code: "VALIDATION", message: "Galeri rolü için galeri seçin." };
  if (dealerId && !UUID_PATTERN.test(dealerId)) return { ok: false, code: "VALIDATION", message: "Galeri bilgisi geçersiz." };

  const actorRoles = await getCurrentUserRoles();
  const actorIsSuperAdmin = actorRoles.includes("super_admin");
  const service = createSupabaseServiceClient();
  const { data: targetRoles, error: targetRoleError } = await service.from("user_roles").select("role").eq("user_id", userId);
  if (targetRoleError) return { ok: false, code: "UPDATE_FAILED", message: "Kullanıcı güncellenemedi." };
  const targetIsSuperAdmin = targetRoles?.some((item) => item.role === "super_admin") ?? false;
  if (!actorIsSuperAdmin && (role === "super_admin" || targetIsSuperAdmin)) {
    return { ok: false, code: "FORBIDDEN", message: "Süper yönetici hesaplarını yalnızca başka bir süper yönetici düzenleyebilir." };
  }
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
  if (!UUID_PATTERN.test(userId)) return { ok: false, code: "VALIDATION", message: "Kullanıcı bilgisi geçersiz." };
  const service = createSupabaseServiceClient();
  const { data, error } = await service.auth.admin.getUserById(userId);
  if (error || !data.user.email) return { ok: false, code: "USER_NOT_FOUND", message: "Kullanıcı bulunamadı." };
  const supabase = await createSupabaseServerClient();
  const siteUrl = getPublicSiteOrigin();
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.user.email, { redirectTo: `${siteUrl}/auth/callback?next=/login/reset-password` });
  if (resetError) return { ok: false, code: "RESET_FAILED", message: "Yenileme bağlantısı gönderilemedi." };
  await service.from("activity_log").insert({ actor_user_id: actor.id, action: "ADMIN_PASSWORD_RESET_SENT", metadata: { target_user_id: userId } });
  return { ok: true, code: "RESET_SENT", message: "Şifre yenileme bağlantısı gönderildi." };
}

export async function deleteUserAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  await requireAdminAccess();
  const roles = await getCurrentUserRoles();
  if (!roles.includes("super_admin")) return { ok: false, code: "FORBIDDEN", message: "Kalıcı silme işlemini yalnızca süper yönetici yapabilir." };
  const userId = String(formData.get("userId") ?? "").trim();
  if (!UUID_PATTERN.test(userId) || userId === actor.id) return { ok: false, code: "SELF_DELETE", message: "Kendi hesabınızı silemezsiniz." };
  const service = createSupabaseServiceClient();
  await service.from("activity_log").insert({ actor_user_id: actor.id, action: "ADMIN_USER_DELETED", metadata: { target_user_id: userId } });
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return { ok: false, code: "DELETE_FAILED", message: "Kullanıcı silinemedi." };
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  redirect("/admin/users?deleted=1");
}

export async function createUserAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const actor = await requireUser();
  const actorRoles = await requireAdminAccess();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as UserRole;
  const dealerId = String(formData.get("dealerId") ?? "").trim() || undefined;

  if (!email || email.length > 254 || !password || !role) {
    return { ok: false, code: "VALIDATION", message: "E-posta, şifre ve rol zorunludur." };
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, code: "VALIDATION", message: "Geçerli bir e-posta adresi girin." };
  }

  try {
    validatePasswordPolicy(password);
  } catch (error) {
    return {
      ok: false,
      code: "VALIDATION",
      message: error instanceof Error ? error.message : "Şifre güvenlik koşullarını karşılamıyor.",
    };
  }

  if (!ALL_ROLES.has(role)) {
    return { ok: false, code: "VALIDATION", message: "Geçersiz kullanıcı rolü." };
  }

  if (role === "super_admin" && !actorRoles.includes("super_admin")) {
    return { ok: false, code: "FORBIDDEN", message: "Süper yönetici rolünü yalnızca mevcut bir süper yönetici atayabilir." };
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
  } catch (error) {
    const duplicateUser = error instanceof AdminUserCreationError && error.code === "DUPLICATE_USER";
    if (!duplicateUser) {
      Sentry.captureException(error, {
        tags: {
          operation: "admin-user-create",
          stage: error instanceof AdminUserCreationError ? error.stage : "unknown",
        },
        extra: { role, dealerId: dealerId ?? null },
      });
    }
    return {
      ok: false,
      code: duplicateUser ? "DUPLICATE" : "USER_CREATE_FAILED",
      message: duplicateUser
        ? "Bu e-posta zaten kayıtlı. Kullanıcı listesindeki Yönet bağlantısından rol veya galeri atamasını güncelleyin."
        : "Kullanıcı oluşturulamadı. Bilgileri kontrol edip yeniden deneyin.",
    };
  }

  revalidatePath("/admin/users");
  redirect(`/admin/users?created=${DEALER_ROLES.includes(role) ? "dealer" : "admin"}`);
}
