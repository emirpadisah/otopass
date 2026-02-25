"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { login } from "./actions";

export function LoginForm() {
  const [state, formAction] = useActionState(login, { error: null as string | null });

  return (
    <form className="space-y-4" action={formAction}>
      <Field label="E-posta" labelFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>

      <Field label="Şifre" labelFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </Field>

      {state.error ? (
        <div className="rounded-2xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.12)] px-3 py-2 text-xs font-semibold text-[var(--danger)]">
          {state.error}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="mt-2 w-full justify-center">
        Giriş Yap
      </Button>
    </form>
  );
}
