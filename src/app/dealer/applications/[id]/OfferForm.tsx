"use client";

import { useActionState } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { createOfferAction } from "./actions";
import type { ActionResponse } from "@/lib/types";

const initialState: ActionResponse = { ok: false };

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
        <div
          className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${
            state.ok
              ? "border-[rgba(34,197,94,0.45)] bg-[rgba(34,197,94,0.12)] text-[var(--success)]"
              : "border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.12)] text-[var(--danger)]"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <Button type="submit" className="w-full justify-center">
        Teklif Oluştur
      </Button>
    </form>
  );
}
