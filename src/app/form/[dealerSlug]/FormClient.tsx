"use client";

import { useActionState } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { submitApplication } from "./actions";

const initialState: ActionResponse = { ok: false };

export function FormClient({ dealerSlug }: { dealerSlug: string }) {
  const [state, formAction] = useActionState(submitApplication, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="dealer_slug" value={dealerSlug} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Temel Bilgiler</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Araç Sahibi Adı" labelFor="owner_name">
            <Input id="owner_name" name="owner_name" placeholder="Ad Soyad" />
          </Field>
          <Field label="Telefon" labelFor="owner_phone">
            <Input id="owner_phone" name="owner_phone" placeholder="05xx xxx xx xx" />
          </Field>
          <Field label="Marka" labelFor="brand">
            <Input id="brand" name="brand" placeholder="Örn. Volkswagen" required />
          </Field>
          <Field label="Model" labelFor="model">
            <Input id="model" name="model" placeholder="Örn. Golf" required />
          </Field>
          <Field label="Model Yılı" labelFor="model_year">
            <Input id="model_year" name="model_year" type="number" placeholder="Örn. 2020" />
          </Field>
          <Field label="Kilometre" labelFor="km">
            <Input id="km" name="km" type="number" placeholder="Örn. 90000" />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Durum Bilgileri</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Yakıt Tipi" labelFor="fuel_type">
            <Input id="fuel_type" name="fuel_type" placeholder="Benzin / Dizel / Hibrit" />
          </Field>
          <Field label="Vites" labelFor="transmission">
            <Input id="transmission" name="transmission" placeholder="Otomatik / Manuel" />
          </Field>
          <Field label="Tramer Bilgisi" labelFor="tramer_info" className="sm:col-span-2">
            <Textarea id="tramer_info" name="tramer_info" rows={2} placeholder="Kayıt varsa belirtin" />
          </Field>
          <Field label="Hasar Bilgisi" labelFor="damage_info" className="sm:col-span-2">
            <Textarea id="damage_info" name="damage_info" rows={2} placeholder="Parça, boya, değişen bilgileri" />
          </Field>
        </div>
      </section>

      <Field
        label="Fotoğraflar"
        labelFor="photos"
        description="En fazla 10 adet, her biri en fazla 10 MB olacak şekilde JPG/PNG/WEBP yükleyebilirsiniz."
      >
        <input
          id="photos"
          name="photos"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp"
          className="input-base text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--accent)]"
        />
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

      <Button type="submit" size="lg">
        Başvuruyu Gönder
      </Button>
    </form>
  );
}
