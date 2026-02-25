"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { createDealerAction } from "./actions";

const initialState: ActionResponse = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Oluşturuluyor..." : "Galeri Oluştur"}
    </Button>
  );
}

export function DealerCreateForm() {
  const [state, formAction] = useActionState(createDealerAction, initialState);

  return (
    <Card tone="flat">
      <CardHeader>
        <CardTitle className="text-xl">Yeni Galeri</CardTitle>
        <CardDescription>Galeri kaydı oluşturarak kullanıcı atamaya hazır hale getirin.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
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

          <Field label="İletişim E-postası" labelFor="contactEmail" className="md:col-span-2">
            <Input id="contactEmail" name="contactEmail" type="email" placeholder="iletisim@galeri.com" />
          </Field>

          {state.message ? (
            <div
              className={`md:col-span-2 rounded-2xl border px-3 py-2 text-xs font-semibold ${
                state.ok
                  ? "border-[rgba(34,197,94,0.45)] bg-[rgba(34,197,94,0.12)] text-[var(--success)]"
                  : "border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.12)] text-[var(--danger)]"
              }`}
            >
              {state.message}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
