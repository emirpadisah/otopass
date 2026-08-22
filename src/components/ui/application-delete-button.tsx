"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "./confirm-dialog";
import type { ActionResponse } from "@/lib/types";

const initialState: ActionResponse = { ok: false };

type DeleteAction = (state: ActionResponse, formData: FormData) => Promise<ActionResponse>;

export function ApplicationDeleteButton({
  action,
  applicationId,
  referenceCode,
  vehicleLabel,
}: {
  action: DeleteAction;
  applicationId: string;
  referenceCode: string | null;
  vehicleLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formId = `delete-application-${applicationId}`;

  return (
    <form id={formId} action={formAction} className="inline-flex min-w-0 flex-col items-end gap-1">
      <input type="hidden" name="applicationId" value={applicationId} />
      <ConfirmSubmitButton
        formId={formId}
        title="Başvuruyu kalıcı olarak sil?"
        description={`${referenceCode || "Referanssız"} numaralı ${vehicleLabel} başvurusu sistemden kaldırılacak.`}
        confirmLabel="Başvuruyu sil"
        details={["Teklif geçmişi silinir", "Yüklenen araç fotoğrafları kaldırılır", "Bu işlem geri alınamaz"]}
        tone="danger"
        variant="ghost"
        size="sm"
        className="text-[var(--danger)]"
        disabled={pending}
      >
        <Trash2 size={14} aria-hidden="true" />
        {pending ? "Siliniyor..." : "Başvuruyu sil"}
      </ConfirmSubmitButton>
      {state.message ? <span className="max-w-64 text-right text-xs text-[var(--danger)]" role="alert">{state.message}</span> : null}
    </form>
  );
}
