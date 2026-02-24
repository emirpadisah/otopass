"use client";

import { useActionState } from "react";
import { createOfferAction } from "./actions";
import type { ActionResponse } from "@/lib/types";

const initialState: ActionResponse = { ok: false };

export function OfferForm({ applicationId }: { applicationId: string }) {
  const [state, formAction] = useActionState(createOfferAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-600">Offer Amount (TRY)</label>
        <input name="amount" type="number" min={1} required className="input" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-600">Notes</label>
        <textarea name="notes" rows={3} className="input resize-none" />
      </div>
      {state.message && (
        <p className={`text-xs font-medium ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>
          {state.message}
        </p>
      )}
      <button className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        Create Offer
      </button>
    </form>
  );
}
