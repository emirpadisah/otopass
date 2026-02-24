"use client";

import { useActionState } from "react";
import type { ActionResponse } from "@/lib/types";
import { submitApplication } from "./actions";

const initialState: ActionResponse = { ok: false };

export function FormClient({ dealerSlug }: { dealerSlug: string }) {
  const [state, formAction] = useActionState(submitApplication, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="dealer_slug" value={dealerSlug} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

      <div className="grid gap-4 sm:grid-cols-2">
        <input name="owner_name" placeholder="Owner Name" className="input" />
        <input name="owner_phone" placeholder="Phone" className="input" />
        <input name="brand" placeholder="Brand" required className="input" />
        <input name="model" placeholder="Model" required className="input" />
        <input name="model_year" type="number" placeholder="Model Year" className="input" />
        <input name="km" type="number" placeholder="KM" className="input" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <input name="fuel_type" placeholder="Fuel Type" className="input" />
        <input name="transmission" placeholder="Transmission" className="input" />
        <input name="tramer_info" placeholder="Tramer Info" className="input" />
        <input name="damage_info" placeholder="Damage Info" className="input" />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-700">
          Photos (max 10, each &lt;= 10MB)
        </label>
        <input name="photos" type="file" multiple accept=".jpg,.jpeg,.png,.webp" className="w-full text-xs" />
      </div>

      {state.message && (
        <p className={`text-xs font-medium ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        Submit
      </button>
    </form>
  );
}
