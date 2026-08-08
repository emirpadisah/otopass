"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { HandCoins } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { createOfferAction } from "./actions";
import type { ActionResponse } from "@/lib/types";

const initialState: ActionResponse = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full justify-center" disabled={pending}>
      <HandCoins size={16} aria-hidden="true" />
      {pending ? "Teklif kaydediliyor..." : "Teklif Oluştur"}
    </Button>
  );
}

export function OfferForm({ applicationId }: { applicationId: string }) {
  const [state, formAction] = useActionState(createOfferAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="applicationId" value={applicationId} />

      <Field label="Teklif Tutarı (TRY)" labelFor="amount">
        <Input id="amount" name="amount" type="number" min={1} required placeholder="Örn. 875000" />
      </Field>

      <Field label="Notlar" labelFor="notes" description="Müşteriye iletilecek kısa açıklama.">
        <Textarea id="notes" name="notes" rows={4} placeholder="Araç ekspertiz notu, ödeme koşulu vb." />
      </Field>

      {state.message ? (
        <div className="status-alert" data-tone={state.ok ? "success" : "danger"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
