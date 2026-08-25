"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input } from "@/components/ui";
import { login } from "./actions";
import styles from "./login.module.css";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      className={`${styles.submit} w-full justify-center`}
      disabled={disabled || pending}
    >
      {pending ? "Giriş yapılıyor..." : "Giriş yap"}
    </Button>
  );
}

export function LoginForm({ disabled = false }: { disabled?: boolean }) {
  const [state, formAction] = useActionState(login, { error: null as string | null });

  return (
    <form className={styles.form} action={formAction}>
      <Field label="E-posta" labelFor="email" className={styles.field}>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ornek@firma.com"
          disabled={disabled}
        />
      </Field>

      <Field label="Şifre" labelFor="password" className={styles.field}>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Şifrenizi girin"
          disabled={disabled}
        />
      </Field>

      {disabled ? (
        <div className="status-alert" role="status">
          Bu ortamda kullanıcı girişi kapalı. Erişim için sistem yöneticinizle iletişime geçin.
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
