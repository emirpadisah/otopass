"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { requestPasswordReset } from "../actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, { error: null, success: null });
  return (
    <form action={action} className="space-y-4">
      <Field label="E-posta" labelFor="email" description="Hesap mevcutsa güvenli yenileme bağlantısı gönderilir.">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      {state.error ? <div className="status-alert" data-tone="danger" role="alert">{state.error}</div> : null}
      {state.success ? <div className="status-alert" data-tone="success" role="status">{state.success}</div> : null}
      <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>{pending ? "Gönderiliyor..." : "Yenileme Bağlantısı Gönder"}</Button>
    </form>
  );
}
