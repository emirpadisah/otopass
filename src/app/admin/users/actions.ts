"use server";

import type { ActionResponse, UserRole } from "@/lib/types";
import { requireUser } from "@/lib/auth/session";
import { requireAdminAccess } from "@/lib/auth/roles";
import { createUserByAdmin } from "@/lib/supabase/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const DEALER_ROLES: UserRole[] = ["dealer_owner", "dealer_manager", "dealer_viewer"];

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

  if (DEALER_ROLES.includes(role) && !dealerId) {
    return { ok: false, code: "VALIDATION", message: "Galeri rolleri için galeri seçimi zorunludur." };
  }

  if (dealerId) {
    const supabase = createSupabaseServiceClient();
    const { data: dealer, error: dealerError } = await supabase
      .from("dealers")
      .select("id")
      .eq("id", dealerId)
      .maybeSingle();

    if (dealerError || !dealer) {
      return { ok: false, code: "VALIDATION", message: "Seçilen galeri bulunamadı." };
    }
  }

  try {
    await createUserByAdmin({
      email,
      password,
      fullName,
      role,
      dealerId,
      actorUserId: actor.id,
    });

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
