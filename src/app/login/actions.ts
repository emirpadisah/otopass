"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isLocalDataMode, isLocalUserAuthEnabled } from "@/lib/data-mode";
import {
  getLocalSessionUser,
  signInLocalUser,
  signOutLocalUser,
  updateLocalUserPassword,
} from "@/lib/local/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { resolvePostLoginRoute } from "@/lib/auth/roles";
import { validatePasswordPolicy } from "@/lib/validation/password";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";

type LoginState = {
  error: string | null;
  success?: string | null;
};

type ErrorWithDigest = {
  digest?: string;
};

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = (error as ErrorWithDigest).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState | never> {
  try {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      return { error: "E-posta ve şifre zorunludur." };
    }

    const ip = getClientIp(await headers());
    const allowed = await consumeRateLimit(`${ip}:${email.toLowerCase()}`, { scope: "login", limit: 5, windowSeconds: 900 });
    if (!allowed) return { error: "Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin." };

    if (isLocalDataMode()) {
      if (!isLocalUserAuthEnabled()) {
        await signOutLocalUser();
        return { error: "Yerel kullanıcı girişi devre dışı. Panel erişimi için Supabase kullanın." };
      }

      const user = await signInLocalUser(email, password);
      if (!user) {
        return { error: "Giriş başarısız. Bilgilerinizi kontrol edin." };
      }

      if (user.must_change_password) {
        redirect("/login/change-password");
      }

      const targetRoute = await resolvePostLoginRoute();
      if (targetRoute === "/login") {
        await signOutLocalUser();
        return { error: "Bu hesaba giriş yetkisi atanmadı. Admin panelinden rol atayın." };
      }

      redirect(targetRoute);
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
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: toErrorMessage(error, "Giriş sırasında beklenmeyen bir hata oluştu.") };
  }
}

export async function requestPasswordReset(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Geçerli bir e-posta adresi girin." };
  if (isLocalDataMode()) return { error: "Şifre yenileme Supabase hesaplarında kullanılabilir." };
  const ip = getClientIp(await headers());
  const allowed = await consumeRateLimit(`${ip}:${email}`, { scope: "password-reset", limit: 3, windowSeconds: 3600 });
  if (!allowed) return { error: "Çok fazla yenileme isteği gönderildi. Lütfen daha sonra tekrar deneyin." };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/login/reset-password`,
  });
  if (error) return { error: "Şifre yenileme isteği gönderilemedi." };
  return { error: null, success: "Hesap mevcutsa şifre yenileme bağlantısı e-posta adresine gönderildi." };
}

export async function logout(): Promise<void> {
  try {
    if (isLocalDataMode()) {
      await signOutLocalUser();
      return;
    }

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } finally {
    redirect("/login");
  }
}

export async function changePassword(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState | never> {
  try {
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    try {
      validatePasswordPolicy(password);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Şifre güvenlik koşullarını karşılamıyor." };
    }

    if (password !== confirmPassword) {
      return { error: "Şifreler eşleşmiyor." };
    }

    if (isLocalDataMode()) {
      if (!isLocalUserAuthEnabled()) {
        await signOutLocalUser();
        return { error: "Yerel kullanıcı hesapları için şifre değişimi devre dışı." };
      }

      const user = await getLocalSessionUser();
      if (!user) {
        return { error: "Oturum süresi doldu. Lütfen tekrar giriş yapın." };
      }

      await updateLocalUserPassword(user.id, password);
      redirect(await resolvePostLoginRoute());
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

    const service = createSupabaseServiceClient();
    const { error: profileError } = await service
      .from("user_profiles")
      .update({ must_change_password: false })
      .eq("user_id", user.id);

    if (profileError) {
      return { error: "Şifre güncellendi ancak profil durumu kaydedilemedi. Lütfen tekrar deneyin." };
    }

    redirect(await resolvePostLoginRoute());
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: toErrorMessage(error, "Şifre güncelleme sırasında hata oluştu.") };
  }
}
