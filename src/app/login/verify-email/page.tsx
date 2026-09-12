import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isEmailVerificationRequired } from "@/lib/auth/email-policy";
import { VerifyEmailForm } from "./VerifyEmailForm";

export const metadata: Metadata = { title: "E-postanızı doğrulayın | otoköprü", robots: { index: false, follow: false } };
export default function VerifyEmailPage() {
  if (!isEmailVerificationRequired()) redirect("/login");
  return <main className="mx-auto grid min-h-screen w-full max-w-lg place-items-center px-4 py-8">
    <section className="panel w-full p-6 sm:p-8">
      <h1 className="text-h1">E-postanızı doğrulayın</h1>
      <p className="mb-6 mt-2 text-sm text-[var(--text-muted)]">Yeni açılan hesabınızı kullanmadan önce e-posta adresinin size ait olduğunu doğrulayın. Mevcut hesaplar bu adıma gerek olmadan giriş yapabilir.</p>
      <VerifyEmailForm />
      <Link href="/login" className="mt-6 block text-sm underline">Şifremle girişe dön</Link>
    </section>
  </main>;
}
