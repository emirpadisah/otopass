"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { markApplicationAsSoldAction } from "./actions";

const initialState: ActionResponse = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="tonal" size="sm" disabled={pending}>
      <CheckCircle2 size={14} aria-hidden="true" />
      {pending ? "Güncelleniyor..." : "Satışı Tamamla"}
    </Button>
  );
}

export function SoldButtonForm({ applicationId }: { applicationId: string }) {
  const [state, formAction] = useActionState(markApplicationAsSoldAction, initialState);

  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-end gap-1"
      onSubmit={(event) => {
        if (!window.confirm("Satış işlemini tamamlandı olarak kaydetmek istediğinize emin misiniz?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <SubmitButton />
      {state.message ? (
        <span
          className={state.ok ? "text-xs text-[var(--success)]" : "max-w-48 text-xs text-[var(--danger)]"}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
