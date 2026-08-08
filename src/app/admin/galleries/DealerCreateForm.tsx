"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PlusCircle } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { createDealerAction } from "./actions";

const initialState: ActionResponse = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <PlusCircle size={16} aria-hidden="true" />
      {pending ? "Oluşturuluyor..." : "Galeri Oluştur"}
    </Button>
  );
}

export function DealerCreateForm() {
  const [state, formAction] = useActionState(createDealerAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
          <Field label="Galeri Adı" labelFor="name">
            <Input id="name" name="name" placeholder="Örn. Atlas Oto Galeri" required />
          </Field>

          <Field
            label="Slug"
            labelFor="slug"
            description="Boş bırakılırsa galeri adından otomatik üretilir."
          >
            <Input id="slug" name="slug" placeholder="orn-atlas-oto" />
          </Field>

          <Field label="İletişim E-postası" labelFor="contactEmail">
            <Input id="contactEmail" name="contactEmail" type="email" placeholder="iletisim@galeri.com" />
          </Field>

          {state.message ? (
            <div
              className="status-alert"
              data-tone={state.ok ? "success" : "danger"}
              role={state.ok ? "status" : "alert"}
            >
              {state.message}
            </div>
          ) : null}

          <div>
            <SubmitButton />
          </div>
    </form>
  );
}
