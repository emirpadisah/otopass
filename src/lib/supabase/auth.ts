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

function validatePassword(password: string): void {
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("Password must include upper, lower and number.");
  }
}

export async function createUserByAdmin(input: CreateUserInput) {
  validatePassword(input.password);
  const supabase = createSupabaseServiceClient();

  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (createUserError || !createdUser.user) {
    throw createUserError ?? new Error("User creation failed.");
  }

  const userId = createdUser.user.id;

  const { error: profileError } = await supabase.from("user_profiles").insert({
    user_id: userId,
    full_name: input.fullName,
    must_change_password: true,
  });
  if (profileError) throw profileError;

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userId,
    role: input.role,
  });
  if (roleError) throw roleError;

  if (input.dealerId && input.role.startsWith("dealer_")) {
    const { error: dealerError } = await supabase.from("dealer_users").insert({
      user_id: userId,
      dealer_id: input.dealerId,
      role: input.role.replace("dealer_", ""),
    });
    if (dealerError) throw dealerError;
  }

  await supabase.from("activity_log").insert({
    actor_user_id: input.actorUserId ?? null,
    dealer_id: input.dealerId ?? null,
    action: "ADMIN_USER_CREATED",
    metadata: {
      target_user_id: userId,
      role: input.role,
      email: input.email,
    },
  });

  return createdUser.user;
}
