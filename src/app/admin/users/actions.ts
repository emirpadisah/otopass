"use server";

import { revalidatePath } from "next/cache";
import type { ActionResponse, UserRole } from "@/lib/types";
import { requireUser } from "@/lib/auth/session";
import { requireAdminAccess } from "@/lib/auth/roles";
import { createUserByAdmin } from "@/lib/supabase/auth";
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
