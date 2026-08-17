"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { Button, Field, Textarea } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { respondToOfferAction } from "./actions";

const initialState: ActionResponse = { ok: false };

export function OfferDecisionForm({ applicationId, offerId }: { applicationId: string; offerId: string }) {
  const [state, action, pending] = useActionState(respondToOfferAction, initialState);
  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const label = submitter?.value === "accepted" ? "kabul etmek" : "reddetmek";
        if (!window.confirm(`Müşteri yanıtını ${label} olarak kaydetmek istediğinize emin misiniz?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="offerId" value={offerId} />
      <Field label="Görüşme notu" labelFor="note" description="Müşteriyle yapılan görüşmenin kısa özeti."><Textarea id="note" name="note" rows={3} /></Field>
      {state.message ? <div className="status-alert" data-tone={state.ok ? "success" : "danger"} role={state.ok ? "status" : "alert"}>{state.message}</div> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" name="response" value="rejected" variant="secondary" disabled={pending}><X size={15} /> Reddetti</Button>
        <Button type="submit" name="response" value="accepted" disabled={pending}><Check size={15} /> Kabul Etti</Button>
      </div>
    </form>
  );
}
