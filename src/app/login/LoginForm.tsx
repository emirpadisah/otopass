"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input } from "@/components/ui";
import Link from "next/link";
import { login } from "./actions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      className="mt-2 w-full justify-center"
      disabled={disabled || pending}
    >
      {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
    </Button>
  );
}

export function LoginForm({ disabled = false }: { disabled?: boolean }) {
  const [state, formAction] = useActionState(login, { error: null as string | null });

  return (
    <form className="space-y-4" action={formAction}>
      <Field label="E-posta" labelFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={disabled}
        />
      </Field>

      <Field label="Şifre" labelFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={disabled}
        />
      </Field>

      {!disabled ? <div className="text-right"><Link href="/login/forgot-password" className="text-xs font-bold text-[var(--accent)] hover:underline">Şifremi unuttum</Link></div> : null}

      {disabled ? (
        <div className="status-alert" role="status">
          Yerel kullanıcı hesapları devre dışı. Panel erişimi için Supabase yapılandırması gereklidir.
        </div>
      ) : state.error ? (
        <div className="status-alert" data-tone="danger" role="alert">
          {state.error}
        </div>
      ) : null}

      <SubmitButton disabled={disabled} />
    </form>
  );
}
