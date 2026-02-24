"use server";

import type { ActionResponse, UserRole } from "@/lib/types";
import { requireUser } from "@/lib/auth/session";
import { requireAdminAccess } from "@/lib/auth/roles";
import { createUserByAdmin } from "@/lib/supabase/auth";

const DEALER_ROLES: UserRole[] = ["dealer_owner", "dealer_manager", "dealer_viewer"];

export async function createUserAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  await requireUser();
  await requireAdminAccess();

  const actor = await requireUser();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as UserRole;
  const dealerId = String(formData.get("dealerId") ?? "").trim() || undefined;

  if (!email || !password || !role) {
    return { ok: false, code: "VALIDATION", message: "Email, password and role are required." };
  }
  if (DEALER_ROLES.includes(role) && !dealerId) {
    return { ok: false, code: "VALIDATION", message: "Dealer role requires a dealer selection." };
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
    return { ok: true, code: "USER_CREATED", message: "User created successfully." };
  } catch (error) {
    return {
      ok: false,
      code: "USER_CREATE_FAILED",
      message: error instanceof Error ? error.message : "User could not be created.",
    };
  }
}
