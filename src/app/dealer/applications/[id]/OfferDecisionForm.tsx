"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { ConfirmSubmitButton, Field, Textarea } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { respondToOfferAction } from "./actions";

const initialState: ActionResponse = { ok: false };

export function OfferDecisionForm({ applicationId, offerId }: { applicationId: string; offerId: string }) {
  const [state, action, pending] = useActionState(respondToOfferAction, initialState);
  const formId = `offer-decision-${offerId}`;
  return (
    <form id={formId} action={action} className="space-y-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="offerId" value={offerId} />
      <Field label="Görüşme notu" labelFor="note" description="Müşteriyle yapılan görüşmenin kısa özeti."><Textarea id="note" name="note" rows={3} /></Field>
      {state.message ? <div className="status-alert" data-tone={state.ok ? "success" : "danger"} role={state.ok ? "status" : "alert"}>{state.message}</div> : null}
      <div className="grid grid-cols-2 gap-2">
        <ConfirmSubmitButton
          formId={formId}
          submitName="response"
          submitValue="rejected"
          title="Teklif reddedildi olarak kaydedilsin mi?"
          description="Müşteri görüşmesinin sonucunu ret olarak kaydedeceksiniz. Görüşme notu da işlem geçmişine dahil edilir."
          confirmLabel="Reddetti olarak kaydet"
          tone="warning"
          variant="secondary"
          disabled={pending}
        ><X size={15} /> Reddetti</ConfirmSubmitButton>
        <ConfirmSubmitButton
          formId={formId}
          submitName="response"
          submitValue="accepted"
          title="Teklif kabul edildi olarak kaydedilsin mi?"
          description="Müşterinin fiyat teklifini kabul ettiğini ve sürecin satış aşamasına geçeceğini onaylayın."
          confirmLabel="Kabul etti olarak kaydet"
          tone="primary"
          disabled={pending}
        ><Check size={15} /> Kabul etti</ConfirmSubmitButton>
      </div>
    </form>
  );
}
