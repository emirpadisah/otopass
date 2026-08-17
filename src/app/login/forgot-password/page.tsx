import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Şifremi Unuttum | Otopass" };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-lg place-items-center px-4 py-8">
      <section className="panel w-full p-6 sm:p-8">
        <Link href="/login" className="legal-back"><ArrowLeft size={15} /> Girişe dön</Link>
        <KeyRound className="text-[var(--accent)]" size={24} aria-hidden="true" />
        <h1 className="text-h1 mt-4">Şifrenizi yenileyin</h1>
        <p className="mb-6 mt-2 text-sm text-[var(--text-muted)]">E-posta adresinize tek kullanımlık güvenli bağlantı gönderilir.</p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
