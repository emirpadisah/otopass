"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { HandCoins } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { createOfferAction } from "./actions";
import { useOfferPageState } from "./OfferPageState";

const initialState: Awaited<ReturnType<typeof createOfferAction>> = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full justify-center" disabled={pending}>
      <HandCoins size={16} aria-hidden="true" />
      {pending ? "Teklif kaydediliyor..." : "Teklif oluştur"}
    </Button>
  );
}

export function OfferForm({ applicationId }: { applicationId: string }) {
  const [state, formAction] = useActionState(createOfferAction, initialState);
  const { setCreatedOffer } = useOfferPageState();

  useEffect(() => {
    if (state.ok && state.offer) setCreatedOffer(state.offer);
  }, [setCreatedOffer, state.ok, state.offer]);

  if (state.ok) {
    return <div className="status-alert" data-tone="success" role="status">Teklif başarıyla oluşturuldu.</div>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="applicationId" value={applicationId} />

      <Field label="Teklif tutarı (₺)" labelFor="amount">
        <Input id="amount" name="amount" type="number" min={1} required placeholder="Örn. 875000" />
      </Field>

      <Field label="Teklif notu" labelFor="notes" description="Müşteriyle paylaşılacak kısa açıklama.">
        <Textarea id="notes" name="notes" rows={4} placeholder="Değerlendirme notu veya ödeme koşulu" />
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
