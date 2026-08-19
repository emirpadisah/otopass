"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Field, Input, ThemeToggle } from "@/components/ui";
import { changePassword } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full justify-center" size="lg" disabled={pending}>
      {pending ? "Kaydediliyor..." : "Şifreyi Kaydet"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, { error: null as string | null });

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[980px] items-center gap-4 px-4 py-8 sm:px-6 lg:grid-cols-[0.8fr_1fr]">
      <aside className="glass-highlight p-6 sm:p-7">
        <BrandLogo className="mb-6" size="navigation" preload />
        <div className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <ShieldCheck size={20} aria-hidden="true" />
        </div>
        <h1 className="text-h1 mt-5">Hesabınızı kullanmadan önce şifrenizi yenileyin.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          İlk girişte geçici şifre kalıcı şifreyle değiştirilir. Bu adım tamamlanmadan panele
          erişim verilmez.
        </p>
      </aside>

      <section className="panel p-5 sm:p-7">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="glass-chip">
              <KeyRound size={14} aria-hidden="true" />
              Hesap güvenliği
            </div>
            <h2 className="text-h1 mt-3">Yeni Şifre Belirle</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              En az 12 karakter, büyük-küçük harf ve sayı kullanın.
            </p>
          </div>
          <ThemeToggle className="shrink-0" />
        </header>

        <form action={formAction} className="space-y-4">
          <Field label="Yeni Şifre" labelFor="password">
            <Input id="password" name="password" type="password" minLength={12} required />
          </Field>

          <Field label="Şifre Tekrar" labelFor="confirmPassword">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={12}
              required
            />
          </Field>

          {state.error ? (
            <div className="status-alert" data-tone="danger" role="alert">
              {state.error}
            </div>
          ) : null}

          <SubmitButton />
        </form>
      </section>
    </div>
  );
}
