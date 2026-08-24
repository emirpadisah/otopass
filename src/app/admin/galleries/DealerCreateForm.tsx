"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, PlusCircle } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { createDealerAction } from "./actions";

const initialState: ActionResponse = { ok: false };

export function DealerCreateForm() {
  const [state, formAction, pending] = useActionState(createDealerAction, initialState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  return (
    <form action={formAction} className="grid gap-4" aria-busy={pending}>
          <Field label="Galeri adı" labelFor="name">
            <Input id="name" name="name" placeholder="Örn. Atlas Oto Galeri" required value={name} onChange={(event) => setName(event.currentTarget.value)} disabled={pending} />
          </Field>

          <Field
            label="Başvuru kodu"
            labelFor="slug"
            description="Boş bırakılırsa galeri adından otomatik üretilir."
          >
            <Input id="slug" name="slug" placeholder="orn-atlas-oto" value={slug} onChange={(event) => setSlug(event.currentTarget.value)} disabled={pending} />
          </Field>

          <Field label="İletişim e-postası" labelFor="contactEmail">
            <Input id="contactEmail" name="contactEmail" type="email" placeholder="iletisim@galeri.com" value={contactEmail} onChange={(event) => setContactEmail(event.currentTarget.value)} disabled={pending} />
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
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <PlusCircle size={16} aria-hidden="true" />}
              {pending ? "Galeri oluşturuluyor..." : "Galeri oluştur"}
            </Button>
          </div>
    </form>
  );
}
