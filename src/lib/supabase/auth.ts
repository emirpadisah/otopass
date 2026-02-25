import { createSupabaseServiceClient } from "./service";
import type { UserRole } from "@/lib/types";

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

function validatePassword(password: string): void {
  if (password.length < 12) {
    throw new Error("Şifre en az 12 karakter olmalıdır.");
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("Şifre büyük harf, küçük harf ve sayı içermelidir.");
  }
}

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

function isAlreadyRegisteredError(error: SupabaseLikeError | null): boolean {
  if (!error?.message) return false;
  return error.message.toLowerCase().includes(ALREADY_REGISTERED_MARKER);
}

function assertNoSupabaseError(error: SupabaseLikeError | null, fallback: string): void {
  if (!error) return;
  throw new Error(toErrorMessage(error, fallback));
}

async function findAuthUserIdByEmail(
  email: string,
  supabase = createSupabaseServiceClient()
): Promise<string | null> {
  const targetEmail = email.trim().toLowerCase();
  const perPage = 200;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    assertNoSupabaseError(error, "Kayıtlı kullanıcılar okunamadı.");

    const users = data?.users ?? [];
    const found = users.find((user) => (user.email ?? "").toLowerCase() === targetEmail);
    if (found) return found.id;

    if (users.length < perPage) break;
  }

  return null;
}

export async function createUserByAdmin(input: CreateUserInput): Promise<void> {
  validatePassword(input.password);
  const supabase = createSupabaseServiceClient();

  let userId: string | null = null;
  let createdFreshUser = false;

  try {
    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

    if (createUserError) {
      if (!isAlreadyRegisteredError(createUserError)) {
        assertNoSupabaseError(createUserError, "Kullanıcı oluşturulamadı.");
      }

      const existingUserId = await findAuthUserIdByEmail(input.email, supabase);
      if (!existingUserId) {
        throw new Error("Bu e-posta ile kullanıcı bulundu ancak hesap bilgileri okunamadı.");
      }

      userId = existingUserId;

      const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(existingUserId, {
        password: input.password,
        email_confirm: true,
      });
      assertNoSupabaseError(updatePasswordError, "Mevcut kullanıcının şifresi güncellenemedi.");
    } else {
      if (!createdUser.user) {
        throw new Error("Kullanıcı oluşturulamadı.");
      }

      userId = createdUser.user.id;
      createdFreshUser = true;
    }

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
