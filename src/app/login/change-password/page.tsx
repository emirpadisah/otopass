"use client";

import { useActionState } from "react";
import { Button, Field, Input, ThemeToggle } from "@/components/ui";
import { changePassword } from "../actions";

export default function ChangePasswordPage() {
  const [state, formAction] = useActionState(changePassword, { error: null as string | null });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[860px] items-center px-4 py-8 sm:px-6">
      <div className="panel mx-auto w-full max-w-lg p-6 sm:p-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-caption text-[var(--accent)]">Hesap Güvenliği</p>
            <h1 className="text-h1 mt-2">Yeni Şifre Belirle</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Devam etmeden önce şifrenizi güncellemeniz gerekiyor.
            </p>
          </div>
          <ThemeToggle className="shrink-0" />
        </header>

        <form action={formAction} className="space-y-4">
          <Field
            label="Yeni Şifre"
            labelFor="password"
            description="En az 12 karakter, büyük-küçük harf ve sayı içermelidir."
          >
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
            <div className="rounded-2xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.12)] px-3 py-2 text-xs font-semibold text-[var(--danger)]">
              {state.error}
            </div>
          ) : null}

          <Button type="submit" className="w-full justify-center" size="lg">
            Şifreyi Kaydet
          </Button>
        </form>
      </div>
    </div>
  );
}
