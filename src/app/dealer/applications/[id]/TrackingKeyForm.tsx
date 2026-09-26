"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { TrackingKeyCopyButton } from "@/components/tracking-key-copy-button";
import { rotateTrackingKeyAction, type TrackingKeyActionState } from "./tracking-actions";

const initialState: TrackingKeyActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="secondary" disabled={pending}>{pending ? <LoaderCircle size={16} className="animate-spin" /> : <KeyRound size={16} />} Yeni anahtar oluştur</Button>;
}

export function TrackingKeyForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState(rotateTrackingKeyAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <p className="text-sm leading-6 text-[var(--text-secondary)]">Mevcut başvurular için anahtar oluşturun veya kaybolan anahtarı yenileyin. Yeni anahtar oluşturulunca eskisi hemen geçersiz olur.</p>
      {state.trackingKey ? (
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-4" role="status">
          <p className="text-xs font-semibold text-[var(--text-muted)]">Gizli takip anahtarı</p>
          <strong className="mt-2 block break-all font-mono text-sm select-all">{state.trackingKey}</strong>
          <div className="mt-3"><TrackingKeyCopyButton key={state.trackingKey} value={state.trackingKey} /></div>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Anahtarı müşteriye güvenli biçimde iletin. Bu ekrandan ayrılınca tekrar görüntülenemez.</p>
        </div>
      ) : null}
      {state.message ? <p className="text-sm" role={state.ok ? "status" : "alert"}>{state.message}</p> : null}
      <SubmitButton />
    </form>
  );
}
