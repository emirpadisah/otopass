"use client";
import { useActionState, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { sendEmailVerification, verifyEmailCode } from "./actions";

const initial = { error: null, success: null };
export function VerifyEmailForm() {
  const [email, setEmail] = useState("");
  const [sendState, send, sending] = useActionState(sendEmailVerification, initial);
  const [verifyState, verify, verifying] = useActionState(verifyEmailCode, initial);
  return <div className="space-y-6">
    <form action={send} className="space-y-4">
      <Field label="Hesabınıza kayıtlı e-posta" labelFor="verification-email">
        <Input id="verification-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={sending || verifying} />
      </Field>
      <Button type="submit" disabled={sending || verifying}>{sending ? "Gönderiliyor..." : "Doğrulama kodu gönder"}</Button>
      {sendState.error ? <p role="alert">{sendState.error}</p> : null}
      {sendState.success ? <p role="status">{sendState.success}</p> : null}
    </form>
    <form action={verify} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      <Field label="E-postadaki doğrulama kodu" labelFor="verification-code">
        <Input id="verification-code" name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required disabled={sending || verifying} />
      </Field>
      <Button type="submit" disabled={sending || verifying || !email}>{verifying ? "Doğrulanıyor..." : "E-postamı doğrula"}</Button>
      {verifyState.error ? <p role="alert">{verifyState.error}</p> : null}
      {verifyState.success ? <p role="status">{verifyState.success}</p> : null}
    </form>
  </div>;
}
