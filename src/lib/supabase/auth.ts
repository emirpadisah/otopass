import { createSupabaseServiceClient } from "./service";
import { isLocalDataMode, isLocalUserAuthEnabled } from "@/lib/data-mode";
import { createLocalUser } from "@/lib/local/auth";
import type { UserRole } from "@/lib/types";
import { validatePasswordPolicy } from "@/lib/validation/password";
import {
  AdminUserCreationError,
  toAdminUserCreationError,
  type AdminUserCreationStage,
} from "./admin-user-errors";

type CreateUserInput = {
  email: string;
  password: string;
  fullName: string | null;
  role: UserRole;
  dealerId?: string;
  actorUserId?: string | null;
};

function assertNoSupabaseError(
  error: { message?: string; code?: string } | null,
  stage: AdminUserCreationStage,
  fallback: string
): void {
  if (!error) return;
  throw toAdminUserCreationError(error, stage, fallback);
}

export async function createUserByAdmin(input: CreateUserInput): Promise<void> {
  validatePasswordPolicy(input.password);

  if (isLocalDataMode()) {
    if (!isLocalUserAuthEnabled()) {
      throw new Error("Bu ortamda kullanıcı oluşturma kullanılamıyor.");
    }

    await createLocalUser(input);
    return;
  }

  const supabase = createSupabaseServiceClient();

  let userId: string | null = null;
  let createdFreshUser = false;

  try {
    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

    assertNoSupabaseError(createUserError, "auth", "Kullanıcı oluşturulamadı.");

    if (!createdUser.user) {
      throw new AdminUserCreationError("CREATE_FAILED", "auth", "Kullanıcı oluşturulamadı.", null);
    }

    userId = createdUser.user.id;
    createdFreshUser = true;

    if (!userId) {
      throw new AdminUserCreationError("CREATE_FAILED", "auth", "Kullanıcı oluşturma akışı tamamlanamadı.", null);
    }

    const { error: profileError } = await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        full_name: input.fullName,
        must_change_password: true,
        is_active: true,
        deactivated_at: null,
      },
      { onConflict: "user_id" }
    );
    assertNoSupabaseError(profileError, "profile", "Kullanıcı profil kaydı oluşturulamadı.");

    const { error: roleError } = await supabase.from("user_roles").upsert(
      {
        user_id: userId,
        role: input.role,
      },
      { onConflict: "user_id,role" }
    );
    assertNoSupabaseError(roleError, "role", "Kullanıcı rolü atanamadı.");

    if (input.dealerId && input.role.startsWith("dealer_")) {
      const { error: dealerError } = await supabase.from("dealer_users").upsert(
        {
          user_id: userId,
          dealer_id: input.dealerId,
          role: input.role.replace("dealer_", ""),
        },
        { onConflict: "user_id,dealer_id" }
      );
      assertNoSupabaseError(dealerError, "membership", "Galeri üyeliği atanamadı.");
    }

    const { error: activityLogError } = await supabase.from("activity_log").insert({
      actor_user_id: input.actorUserId ?? null,
      dealer_id: input.dealerId ?? null,
      action: "ADMIN_USER_CREATED",
      metadata: {
        target_user_id: userId,
        role: input.role,
      },
    });

    assertNoSupabaseError(activityLogError, "audit", "Kullanıcı işlem kaydı oluşturulamadı.");
  } catch (error) {
    if (createdFreshUser && userId) {
      // Keep auth + app tables consistent if downstream inserts fail.
      await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
    }

    throw toAdminUserCreationError(error, "unknown", "Kullanıcı oluşturulamadı.");
  }
}
