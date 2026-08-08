"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input } from "@/components/ui";
import { login } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="mt-2 w-full justify-center" disabled={pending}>
      {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
    </Button>
  );
}

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
        <div className="status-alert" data-tone="danger" role="alert">
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
