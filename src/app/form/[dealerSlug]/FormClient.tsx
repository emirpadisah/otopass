"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { submitApplication } from "./actions";

const initialState: ActionResponse = { ok: false };

const MAX_FILES = 10;
const MAX_SOURCE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_REQUEST_PHOTO_BYTES = 2.8 * 1024 * 1024;

async function compressSelectedPhotos(files: File[]): Promise<File[]> {
  const { default: imageCompression } = await import("browser-image-compression");
  const maxSizeMB = Math.min(1.5, 2.5 / Math.max(files.length, 1));
  const compressed: File[] = [];

  for (const file of files) {
    const result = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: 2200,
      useWebWorker: true,
      preserveExif: false,
      fileType: "image/webp",
      initialQuality: 0.84,
    });
    compressed.push(new File(
      [result],
      `${file.name.replace(/\.[^.]+$/, "")}.webp`,
      { type: "image/webp" },
    ));
  }

  const totalSize = compressed.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_REQUEST_PHOTO_BYTES) {
    throw new Error("Fotoğraflar gönderim sınırına indirilemedi. Lütfen daha az fotoğraf seçin.");
  }
  return compressed;
}

function SubmitButton({ preparing }: { preparing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full justify-center sm:w-auto" disabled={pending || preparing}>
      <Send size={16} aria-hidden="true" />
      {preparing ? "Fotoğraflar hazırlanıyor..." : pending ? "Başvuru gönderiliyor..." : "Fiyat Teklifi Al"}
    </Button>
  );
}

export function FormClient({ dealerSlug }: { dealerSlug: string }) {
  const [state, formAction] = useActionState(submitApplication, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  async function handlePhotoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    setPhotoMessage("");
    if (files.length === 0) return;
    if (
      files.length > MAX_FILES
      || files.some((file) => file.size > MAX_SOURCE_SIZE || !ACCEPTED_IMAGE_TYPES.has(file.type))
    ) {
      input.value = "";
      setPhotoMessage("En fazla 10 adet, 10 MB altı JPG, PNG veya WEBP fotoğraf seçin.");
      return;
    }

    setPreparing(true);
    try {
      const compressed = await compressSelectedPhotos(files);
      const transfer = new DataTransfer();
      compressed.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      setPhotoMessage(`${compressed.length} fotoğraf gönderim için hazırlandı.`);
    } catch (error) {
      input.value = "";
      setPhotoMessage(error instanceof Error ? error.message : "Fotoğraflar hazırlanamadı.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={(event) => {
      if (preparing) event.preventDefault();
    }} className="space-y-6">
      <input type="hidden" name="dealer_slug" value={dealerSlug} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">Temel bilgiler</h2>
          <span className="glass-chip">Zorunlu: marka ve model</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Araç Sahibi Adı" labelFor="owner_name">
            <Input id="owner_name" name="owner_name" autoComplete="name" placeholder="Ad Soyad" />
          </Field>
          <Field label="Telefon" labelFor="owner_phone">
            <Input
              id="owner_phone"
              name="owner_phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="05xx xxx xx xx"
            />
          </Field>
          <Field label="Marka" labelFor="brand">
            <Input id="brand" name="brand" placeholder="Örn. Volkswagen" required />
          </Field>
          <Field label="Model" labelFor="model">
            <Input id="model" name="model" placeholder="Örn. Golf" required />
          </Field>
          <Field label="Araç Paketi" labelFor="vehicle_package">
            <Input id="vehicle_package" name="vehicle_package" placeholder="Örn. Comfortline" />
          </Field>
          <Field label="Model Yılı" labelFor="model_year">
            <Input
              id="model_year"
              name="model_year"
              type="number"
              min={1886}
              max={new Date().getFullYear() + 1}
              inputMode="numeric"
              placeholder="Örn. 2020"
            />
          </Field>
          <Field label="Kilometre" labelFor="km">
            <Input
              id="km"
              name="km"
              type="number"
              min={0}
              max={10_000_000}
              inputMode="numeric"
              placeholder="Örn. 90000"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">Durum bilgileri</h2>
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
          onChange={handlePhotoSelection}
          className="input-base text-xs file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[var(--accent)]"
        />
      </Field>

      {photoMessage ? (
        <div className="status-alert" data-tone={photoMessage.includes("hazırlandı") ? "success" : "danger"} role="status">
          {photoMessage}
        </div>
      ) : null}

      {state.message ? (
        <div className="status-alert" data-tone={state.ok ? "success" : "danger"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </div>
      ) : null}

      <SubmitButton preparing={preparing} />
    </form>
  );
}
