"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { Button, type ButtonProps } from "./button";

type ConfirmTone = "danger" | "warning" | "primary";

type ConfirmDialogProps = {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  details?: string[];
  tone?: ConfirmTone;
  disabled?: boolean;
  onConfirm?: () => void | Promise<void>;
  formId?: string;
  submitName?: string;
  submitValue?: string;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Vazgeç",
  details = [],
  tone = "danger",
  disabled = false,
  onConfirm,
  formId,
  submitName,
  submitValue,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  async function handleConfirm() {
    if (!onConfirm || working) return;
    setWorking(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setWorking(false);
    }
  }

  const busy = disabled || working;
  const confirmVariant = tone === "danger" ? "danger" : tone === "primary" ? "primary" : "tonal";

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !working && setOpen(nextOpen)}>
      <Dialog.Trigger asChild disabled={disabled}>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="ops-confirm-overlay" />
        <Dialog.Content className="ops-confirm-dialog" data-tone={tone}>
          <div className="ops-confirm-topline">
            <span className="ops-confirm-icon" aria-hidden="true">
              <AlertTriangle size={21} strokeWidth={1.8} />
            </span>
            <Dialog.Close asChild>
              <button type="button" className="ops-confirm-close" aria-label="Pencereyi kapat" disabled={working}>
                <X size={17} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="ops-confirm-copy">
            <p className="ops-eyebrow">İşlem onayı</p>
            <Dialog.Title className="ops-confirm-title">{title}</Dialog.Title>
            <Dialog.Description className="ops-confirm-description">{description}</Dialog.Description>
          </div>

          {details.length > 0 ? (
            <ul className="ops-confirm-details">
              {details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          ) : null}

          <div className="ops-confirm-actions">
            <Dialog.Close asChild>
              <Button type="button" variant="secondary" disabled={working}>{cancelLabel}</Button>
            </Dialog.Close>
            {formId ? (
              <Button
                type="submit"
                form={formId}
                name={submitName}
                value={submitValue}
                variant={confirmVariant}
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                {confirmLabel}
              </Button>
            ) : (
              <Button type="button" variant={confirmVariant} disabled={busy} onClick={() => void handleConfirm()}>
                {working ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : null}
                {working ? "İşleniyor..." : confirmLabel}
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ConfirmSubmitButtonProps = Omit<ButtonProps, "type" | "form"> & {
  formId: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  details?: string[];
  tone?: ConfirmTone;
  submitName?: string;
  submitValue?: string;
  children: ReactNode;
};

export function ConfirmSubmitButton({
  formId,
  title,
  description,
  confirmLabel,
  cancelLabel,
  details,
  tone,
  submitName,
  submitValue,
  children,
  disabled,
  ...buttonProps
}: ConfirmSubmitButtonProps) {
  return (
    <ConfirmDialog
      trigger={<Button type="button" disabled={disabled} {...buttonProps}>{children}</Button>}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      details={details}
      tone={tone}
      disabled={disabled}
      formId={formId}
      submitName={submitName}
      submitValue={submitValue}
    />
  );
}
