"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { markApplicationAsSoldAction } from "./actions";

const initialState: ActionResponse = { ok: false };

export function SoldButtonForm({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState(markApplicationAsSoldAction, initialState);
  const formId = `mark-sold-${applicationId}`;

  return (
    <form id={formId} action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="applicationId" value={applicationId} />
      <ConfirmSubmitButton
        formId={formId}
        title="Satış sürecini tamamla?"
        description="Araç devrinin tamamlandığını ve başvurunun satıldı durumuna geçirileceğini onaylayın."
        confirmLabel="Satışı tamamla"
        details={["Başvuru satıldı olarak işaretlenir", "İşlem geçmişine kullanıcı ve zaman kaydı eklenir"]}
        tone="primary"
        variant="tonal"
        size="sm"
        disabled={pending}
      >
        <CheckCircle2 size={14} aria-hidden="true" />
        {pending ? "Güncelleniyor..." : "Satışı tamamla"}
      </ConfirmSubmitButton>
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
