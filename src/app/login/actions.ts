"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePostLoginRoute } from "@/lib/auth/roles";

type LoginState = {
  error: string | null;
};

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState | never> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Giriş başarısız. Bilgilerinizi kontrol edin." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("must_change_password")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.must_change_password) {
      redirect("/login/change-password");
    }
  }

  const targetRoute = await resolvePostLoginRoute();
  if (targetRoute === "/login") {
    await supabase.auth.signOut();
    return { error: "Bu hesaba giriş yetkisi atanmadı. Admin panelinden rol atayın." };
  }

  redirect(targetRoute);
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function changePassword(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState | never> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 12) {
    return { error: "Şifre en az 12 karakter olmalıdır." };
  }
  if (password !== confirmPassword) {
    return { error: "Şifreler eşleşmiyor." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum süresi doldu. Lütfen tekrar giriş yapın." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Şifre güncellenemedi." };
  }

  await supabase
    .from("user_profiles")
    .update({ must_change_password: false })
    .eq("user_id", user.id);

  redirect(await resolvePostLoginRoute());
}
