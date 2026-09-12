"use server";

import { headers } from "next/headers";
import { isEmailVerificationRequired } from "@/lib/auth/email-policy";
import { isLocalDataMode } from "@/lib/data-mode";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { createEmailOtpClient } from "@/lib/supabase/email-otp";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type State = { error: string | null; success: string | null };
const sent: State = { error: null, success: "Hesap doğrulama gerektiriyorsa kod gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin. Mevcut hesaplar şifreleriyle giriş yapabilir." };
const failed: State = { error: "Kod doğrulanamadı. E-posta adresini ve kodu kontrol edin veya yeni kod isteyin.", success: null };

function readEmail(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  return email.length <= 254 && /^\S+@\S+\.\S+$/.test(email) ? email : null;
}

async function allowed(email: string, operation: "send" | "verify") {
  const ip = getClientIp(await headers());
  const sending = operation === "send";
  const results = await Promise.all([
    consumeRateLimit(ip, { scope: `email-${operation}-ip`, limit: sending ? 20 : 40, windowSeconds: sending ? 3600 : 600 }),
    consumeRateLimit(email, { scope: `email-${operation}-account`, limit: sending ? 5 : 10, windowSeconds: sending ? 3600 : 600 }),
    ...(sending ? [consumeRateLimit(email, { scope: "email-send-cooldown", limit: 1, windowSeconds: 60 })] : []),
  ]);
  return results.every(Boolean);
}

export async function sendEmailVerification(_previous: State, form: FormData): Promise<State> {
  if (!isEmailVerificationRequired()) return { error: "E-posta doğrulaması şu anda kullanılamıyor.", success: null };
  const email = readEmail(form);
  if (!email) return { error: "Geçerli bir e-posta adresi girin.", success: null };
  if (isLocalDataMode()) return { error: "Bu ortamda e-posta doğrulaması kullanılamıyor.", success: null };
  try {
    if (!(await allowed(email, "send"))) return { error: "Çok fazla istek gönderildi. Daha sonra tekrar deneyin.", success: null };
    // Never create an account through this public endpoint. Provider responses
    // are deliberately uniform for missing accounts and delivery errors.
    const { data: kind, error } = await createSupabaseServiceClient().rpc("get_email_challenge_kind", { p_email: email });
    if (error) return { error: "İstek tamamlanamadı. Daha sonra tekrar deneyin.", success: null };
    if (kind === "signup") await createEmailOtpClient().auth.resend({ email, type: "signup" });
    if (kind === "email") await createEmailOtpClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    return sent;
  } catch {
    return { error: "İstek tamamlanamadı. Daha sonra tekrar deneyin.", success: null };
  }
}

export async function verifyEmailCode(_previous: State, form: FormData): Promise<State> {
  if (!isEmailVerificationRequired()) return failed;
  const email = readEmail(form);
  const token = String(form.get("token") ?? "").trim();
  if (!email || !/^\d{6,10}$/.test(token)) return failed;
  if (isLocalDataMode()) return failed;
  try {
    if (!(await allowed(email, "verify"))) return { error: "Çok fazla kod denemesi yapıldı. Daha sonra tekrar deneyin.", success: null };
    // Exempt accounts must not be sent through Auth confirmation or session
    // mutation even if this public action is called manually for their address.
    const { data: kind, error: kindError } = await createSupabaseServiceClient().rpc("get_email_challenge_kind", { p_email: email });
    if (kindError || (kind !== "signup" && kind !== "email")) return failed;
    const otp = createEmailOtpClient();
    const { data, error } = await otp.auth.verifyOtp({ email, token, type: "email" });
    try {
      const user = data?.user;
      if (error || !data?.session || !user?.email_confirmed_at || user.email?.toLowerCase() !== email) return failed;
      // The identity and confirmation timestamp come exclusively from successful
      // GoTrue OTP verification, never from a form, JWT metadata or an admin flag.
      const { error: recordError } = await createSupabaseServiceClient().rpc("record_email_verification", {
        p_user_id: user.id, p_email: user.email, p_confirmed_at: user.email_confirmed_at,
      });
      if (recordError) return failed;
      return { error: null, success: "E-posta adresiniz doğrulandı. Giriş ekranından şifrenizle devam edin." };
    } finally {
      if (data?.session) await otp.auth.signOut({ scope: "local" });
    }
  } catch {
    return failed;
  }
}
