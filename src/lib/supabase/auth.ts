import { createSupabaseServiceClient } from "./service";
import { isLocalDataMode } from "@/lib/data-mode";
import { createLocalUser } from "@/lib/local/auth";
import type { UserRole } from "@/lib/types";
import { validatePasswordPolicy } from "@/lib/validation/password";

type CreateUserInput = {
  email: string;
  password: string;
  fullName: string | null;
  role: UserRole;
  dealerId?: string;
  actorUserId?: string | null;
};

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

const ALREADY_REGISTERED_MARKER = "already registered";

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybe = error as SupabaseLikeError;
    if (maybe.message && maybe.message.length > 0) {
      if (maybe.message.toLowerCase().includes(ALREADY_REGISTERED_MARKER)) {
        return "Bu e-posta ile kayıtlı bir kullanıcı zaten var.";
      }
      return maybe.message;
    }
  }

  return fallback;
}

function assertNoSupabaseError(error: SupabaseLikeError | null, fallback: string): void {
  if (!error) return;
  throw new Error(toErrorMessage(error, fallback));
}

export async function createUserByAdmin(input: CreateUserInput): Promise<void> {
  validatePasswordPolicy(input.password);

  if (isLocalDataMode()) {
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

    assertNoSupabaseError(createUserError, "Kullanıcı oluşturulamadı.");

    if (!createdUser.user) {
      throw new Error("Kullanıcı oluşturulamadı.");
    }

    userId = createdUser.user.id;
    createdFreshUser = true;

    if (!userId) {
      throw new Error("Kullanıcı oluşturma akışı tamamlanamadı.");
    }

    const { error: profileError } = await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        full_name: input.fullName,
        must_change_password: true,
      },
      { onConflict: "user_id" }
    );
    assertNoSupabaseError(profileError, "Kullanıcı profil kaydı oluşturulamadı.");

    const { error: roleError } = await supabase.from("user_roles").upsert(
      {
        user_id: userId,
        role: input.role,
      },
      { onConflict: "user_id,role" }
    );
    assertNoSupabaseError(roleError, "Kullanıcı rolü atanamadı.");

    if (input.dealerId && input.role.startsWith("dealer_")) {
      const { error: dealerError } = await supabase.from("dealer_users").upsert(
        {
          user_id: userId,
          dealer_id: input.dealerId,
          role: input.role.replace("dealer_", ""),
        },
        { onConflict: "user_id,dealer_id" }
      );
      assertNoSupabaseError(dealerError, "Galeri üyeliği atanamadı.");
    }

    const { error: activityLogError } = await supabase.from("activity_log").insert({
      actor_user_id: input.actorUserId ?? null,
      dealer_id: input.dealerId ?? null,
      action: "ADMIN_USER_CREATED",
      metadata: {
        target_user_id: userId,
        role: input.role,
        email: input.email,
      },
    });

    if (activityLogError) {
      // User creation succeeded; treat activity log as best effort.
      console.error("Activity log insert failed:", activityLogError.message);
    }
  } catch (error) {
    if (createdFreshUser && userId) {
      // Keep auth + app tables consistent if downstream inserts fail.
      await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
    }

    throw new Error(toErrorMessage(error, "Kullanıcı oluşturulamadı."));
  }
}
