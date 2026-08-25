"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResponse, UserRole } from "@/lib/types";
import { requireUser } from "@/lib/auth/session";
import { requireAdminAccess } from "@/lib/auth/roles";
import { getPasswordChangeRestriction, getUserDeletionRestriction } from "@/lib/auth/admin-user-management";
import { createUserByAdmin } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentUserRoles } from "@/lib/auth/roles";
import { getDealerById } from "@/lib/supabase/queries";
import { validatePasswordPolicy } from "@/lib/validation/password";
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

export async function setUserPasswordAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  const actorRoles = await requireAdminAccess();
  const userId = String(formData.get("userId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  if (!UUID_PATTERN.test(userId)) return { ok: false, code: "VALIDATION", message: "Kullanıcı bilgisi geçersiz." };

  if (password !== passwordConfirmation) {
    return { ok: false, code: "PASSWORD_MISMATCH", message: "Yeni şifreler birbiriyle eşleşmiyor." };
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

  const service = createSupabaseServiceClient();
  const [{ data: targetAuth, error: targetAuthError }, { data: targetRoleRows, error: targetRoleError }, { data: profile, error: profileError }] = await Promise.all([
    service.auth.admin.getUserById(userId),
    service.from("user_roles").select("role").eq("user_id", userId),
    service.from("user_profiles").select("must_change_password").eq("user_id", userId).maybeSingle(),
  ]);

  if (targetAuthError || !targetAuth.user || targetRoleError || profileError || !profile) {
    return { ok: false, code: "USER_NOT_FOUND", message: "Kullanıcı bulunamadı." };
  }

  const targetRoles = (targetRoleRows ?? []).map((item) => item.role as UserRole);
  const restriction = getPasswordChangeRestriction({
    actorUserId: actor.id,
    actorRoles,
    targetUserId: userId,
    targetRoles,
  });
  if (restriction === "SELF_PASSWORD_CHANGE") {
    return { ok: false, code: restriction, message: "Kendi şifrenizi kullanıcı yönetimi ekranından değiştiremezsiniz." };
  }
  if (restriction === "PRIVILEGED_TARGET") {
    return { ok: false, code: restriction, message: "Yönetici hesaplarının şifresini yalnızca süper yönetici değiştirebilir." };
  }

  const updatedAt = new Date().toISOString();
  const { error: profileUpdateError } = await service
    .from("user_profiles")
    .update({ must_change_password: true, updated_at: updatedAt })
    .eq("user_id", userId);
  if (profileUpdateError) return { ok: false, code: "PASSWORD_UPDATE_FAILED", message: "Kullanıcı şifresi güncellenemedi." };

  const { error: passwordUpdateError } = await service.auth.admin.updateUserById(userId, { password });
  if (passwordUpdateError) {
    await service
      .from("user_profiles")
      .update({ must_change_password: profile.must_change_password, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    return { ok: false, code: "PASSWORD_UPDATE_FAILED", message: "Kullanıcı şifresi güncellenemedi." };
  }

  const { error: auditError } = await service.from("activity_log").insert({
    actor_user_id: actor.id,
    action: "ADMIN_PASSWORD_CHANGED",
    metadata: { target_user_id: userId, must_change_password: true },
  });
  if (auditError) {
    Sentry.captureException(auditError, { tags: { operation: "admin-password-change" }, extra: { targetUserId: userId } });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/audit");
  return { ok: true, code: "PASSWORD_UPDATED", message: "Geçici şifre güncellendi. Kullanıcı ilk girişte yeni şifre belirleyecek." };
}

export async function deleteUserAction(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
  const actor = await requireUser();
  const actorRoles = await requireAdminAccess();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!UUID_PATTERN.test(userId)) return { ok: false, code: "VALIDATION", message: "Kullanıcı bilgisi geçersiz." };

  const service = createSupabaseServiceClient();
  const [{ data: targetAuth, error: targetAuthError }, { data: targetRoleRows, error: targetRoleError }, { count: superAdminCount, error: countError }] = await Promise.all([
    service.auth.admin.getUserById(userId),
    service.from("user_roles").select("role").eq("user_id", userId),
    service.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "super_admin"),
  ]);
  if (targetAuthError || !targetAuth.user || targetRoleError || countError) {
    return { ok: false, code: "USER_NOT_FOUND", message: "Kullanıcı bulunamadı." };
  }

  const targetRoles = (targetRoleRows ?? []).map((item) => item.role as UserRole);
  const restriction = getUserDeletionRestriction({
    actorUserId: actor.id,
    actorRoles,
    targetUserId: userId,
    targetRoles,
    superAdminCount: superAdminCount ?? 0,
  });
  if (restriction === "DELETE_REQUIRES_SUPER_ADMIN") {
    return { ok: false, code: restriction, message: "Kalıcı silme işlemini yalnızca süper yönetici yapabilir." };
  }
  if (restriction === "SELF_DELETE") {
    return { ok: false, code: restriction, message: "Kendi hesabınızı silemezsiniz." };
  }
  if (restriction === "LAST_SUPER_ADMIN") {
    return { ok: false, code: restriction, message: "Sistemdeki son süper yönetici hesabı silinemez." };
  }

  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return { ok: false, code: "DELETE_FAILED", message: "Kullanıcı silinemedi." };

  const { error: auditError } = await service.from("activity_log").insert({
    actor_user_id: actor.id,
    action: "ADMIN_USER_DELETED",
    metadata: { target_user_id: userId, target_roles: targetRoles },
  });
  if (auditError) {
    Sentry.captureException(auditError, { tags: { operation: "admin-user-delete" }, extra: { targetUserId: userId } });
  }

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
