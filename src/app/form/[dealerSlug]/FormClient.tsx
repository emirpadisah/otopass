"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Send, Trash2 } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ACCEPTED_IMAGE_TYPES, MAX_FILES, MAX_FILE_SIZE } from "@/lib/validation/application";

type PhotoItem = { id: string; file: File; preview: string };
type SubmissionState = { tone: "idle" | "working" | "success" | "danger"; message: string; progress: number };
type InitiateResponse = {
  sessionId: string;
  finalizeToken: string;
  uploads: Array<{ path: string; token: string }>;
  error?: string;
};

const fuelOptions = ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"];
const transmissionOptions = ["Manuel", "Otomatik", "Yarı Otomatik"];

async function compressPhotos(photos: PhotoItem[], onProgress: (value: number) => void): Promise<File[]> {
  const { default: imageCompression } = await import("browser-image-compression");
  const output: File[] = [];
  for (const [index, photo] of photos.entries()) {
    const compressed = await imageCompression(photo.file, {
      maxSizeMB: 2.5,
      maxWidthOrHeight: 2200,
      useWebWorker: true,
      preserveExif: false,
      fileType: "image/webp",
      initialQuality: 0.86,
    });
    output.push(new File([compressed], `${photo.file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }));
    onProgress(Math.round(((index + 1) / Math.max(photos.length, 1)) * 25));
  }
  return output;
}

function toApplicationPayload(formData: FormData, dealerSlug: string) {
  return {
    dealer_slug: dealerSlug,
    owner_name: String(formData.get("owner_name") ?? ""),
    owner_phone: String(formData.get("owner_phone") ?? ""),
    owner_email: String(formData.get("owner_email") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    model: String(formData.get("model") ?? ""),
    vehicle_package: String(formData.get("vehicle_package") ?? ""),
    model_year: String(formData.get("model_year") ?? ""),
    km: String(formData.get("km") ?? ""),
    fuel_type: String(formData.get("fuel_type") ?? ""),
    transmission: String(formData.get("transmission") ?? ""),
    tramer_info: String(formData.get("tramer_info") ?? ""),
    damage_info: String(formData.get("damage_info") ?? ""),
    privacy_acknowledged: formData.get("privacy_acknowledged") === "on",
    marketing_consent: formData.get("marketing_consent") === "on",
  };
}

export function FormClient({
  dealerSlug,
  localMode,
  turnstileSiteKey,
}: {
  dealerSlug: string;
  localMode: boolean;
  turnstileSiteKey: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const photosRef = useRef<PhotoItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [captchaToken, setCaptchaToken] = useState("");
  const [state, setState] = useState<SubmissionState>({ tone: "idle", message: "", progress: 0 });

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview)), []);

  function selectPhotos(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files);
    const invalid = incoming.find((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number]) || file.size > MAX_FILE_SIZE);
    if (invalid) {
      setState({ tone: "danger", message: "Yalnızca 10 MB altındaki JPG, PNG veya WEBP fotoğrafları seçin.", progress: 0 });
      return;
    }
    if (photos.length + incoming.length > MAX_FILES) {
      setState({ tone: "danger", message: `En fazla ${MAX_FILES} fotoğraf ekleyebilirsiniz.`, progress: 0 });
      return;
    }
    setPhotos((current) => [...current, ...incoming.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))]);
    setState({ tone: "idle", message: "", progress: 0 });
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((photo) => photo.id !== id);
    });
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function submitLocal(formData: FormData, compressed: File[]) {
    formData.delete("photos");
    compressed.forEach((file) => formData.append("photos", file));
    const response = await fetch("/api/public/applications/local", { method: "POST", body: formData });
    return response.json() as Promise<{ ok?: boolean; referenceCode?: string; error?: string }>;
  }

  async function submitSupabase(formData: FormData, compressed: File[]) {
    const initiate = await fetch("/api/public/applications/initiate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        application: toApplicationPayload(formData, dealerSlug),
        files: compressed.map((file) => ({ name: file.name, type: file.type, size: file.size })),
        turnstileToken: captchaToken,
        website: String(formData.get("website") ?? ""),
      }),
    });
    const initiated = (await initiate.json()) as InitiateResponse;
    if (!initiate.ok) throw new Error(initiated.error || "Başvuru başlatılamadı.");

    const supabase = getSupabaseBrowserClient();
    for (const [index, upload] of initiated.uploads.entries()) {
      const { error } = await supabase.storage.from("applications").uploadToSignedUrl(upload.path, upload.token, compressed[index], {
        contentType: compressed[index].type,
        upsert: false,
      });
      if (error) throw new Error("Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
      setState({ tone: "working", message: `Fotoğraflar yükleniyor (${index + 1}/${compressed.length})`, progress: 25 + Math.round(((index + 1) / Math.max(compressed.length, 1)) * 65) });
    }

    setState({ tone: "working", message: "Başvuru kaydediliyor...", progress: 95 });
    const finalize = await fetch("/api/public/applications/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: initiated.sessionId, finalizeToken: initiated.finalizeToken }),
    });
    const result = (await finalize.json()) as { ok?: boolean; referenceCode?: string; error?: string };
    if (!finalize.ok) throw new Error(result.error || "Başvuru tamamlanamadı.");
    return result;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.tone === "working") return;
    if (!localMode && turnstileSiteKey && !captchaToken) {
      setState({ tone: "danger", message: "Lütfen güvenlik doğrulamasını tamamlayın.", progress: 0 });
      return;
    }

    try {
      const formData = new FormData(event.currentTarget);
      setState({ tone: "working", message: photos.length ? "Fotoğraflar hazırlanıyor..." : "Başvuru hazırlanıyor...", progress: 5 });
      const compressed = await compressPhotos(photos, (progress) => setState({ tone: "working", message: "Fotoğraflar hazırlanıyor...", progress }));
      setState({ tone: "working", message: "Güvenli yükleme başlatılıyor...", progress: 25 });
      const result = localMode ? await submitLocal(formData, compressed) : await submitSupabase(formData, compressed);
      if (!result.ok) throw new Error(result.error || "Başvuru gönderilemedi.");

      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
      setPhotos([]);
      formRef.current?.reset();
      setCaptchaToken("");
      turnstileRef.current?.reset();
      setState({ tone: "success", message: `Başvurunuz alındı. Referans: ${result.referenceCode}`, progress: 100 });
    } catch (error) {
      setState({ tone: "danger", message: error instanceof Error ? error.message : "Başvuru gönderilemedi.", progress: 0 });
      setCaptchaToken("");
      turnstileRef.current?.reset();
    }
  }

  const working = state.tone === "working";
  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-7">
      <input type="hidden" name="dealer_slug" value={dealerSlug} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">İletişim ve araç bilgileri</h2>
          <span className="glass-chip">Tüm zorunlu alanlar *</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Araç Sahibi Adı *" labelFor="owner_name"><Input id="owner_name" name="owner_name" autoComplete="name" required /></Field>
          <Field label="Telefon *" labelFor="owner_phone"><Input id="owner_phone" name="owner_phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="05xx xxx xx xx" required /></Field>
          <Field label="E-posta *" labelFor="owner_email" className="sm:col-span-2"><Input id="owner_email" name="owner_email" type="email" autoComplete="email" required /></Field>
          <Field label="Marka *" labelFor="brand"><Input id="brand" name="brand" placeholder="Örn. Volkswagen" required /></Field>
          <Field label="Model *" labelFor="model"><Input id="model" name="model" placeholder="Örn. Golf" required /></Field>
          <Field label="Araç Paketi" labelFor="vehicle_package"><Input id="vehicle_package" name="vehicle_package" placeholder="Örn. Comfortline" /></Field>
          <Field label="Model Yılı" labelFor="model_year"><Input id="model_year" name="model_year" type="number" min={1950} max={new Date().getFullYear() + 1} inputMode="numeric" /></Field>
          <Field label="Kilometre" labelFor="km"><Input id="km" name="km" type="number" min={0} max={10_000_000} inputMode="numeric" /></Field>
          <Field label="Yakıt Tipi" labelFor="fuel_type">
            <select id="fuel_type" name="fuel_type" className="input-base"><option value="">Seçin</option>{fuelOptions.map((option) => <option key={option}>{option}</option>)}</select>
          </Field>
          <Field label="Vites" labelFor="transmission">
            <select id="transmission" name="transmission" className="input-base"><option value="">Seçin</option>{transmissionOptions.map((option) => <option key={option}>{option}</option>)}</select>
          </Field>
          <Field label="Tramer Bilgisi" labelFor="tramer_info" className="sm:col-span-2"><Textarea id="tramer_info" name="tramer_info" rows={2} /></Field>
          <Field label="Hasar Bilgisi" labelFor="damage_info" className="sm:col-span-2"><Textarea id="damage_info" name="damage_info" rows={2} /></Field>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="photos-title">
        <div>
          <h2 id="photos-title" className="text-base font-bold">Araç fotoğrafları</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">En fazla 10 fotoğraf, dosya başına 10 MB. Göndermeden önce optimize edilir.</p>
        </div>
        <label className="upload-dropzone" htmlFor="photos">
          <ImagePlus size={22} aria-hidden="true" />
          <span>Fotoğraf seçin</span>
          <input id="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { selectPhotos(event.target.files); event.target.value = ""; }} />
        </label>
        {photos.length > 0 ? (
          <div className="photo-preview-grid" aria-label="Seçilen fotoğraflar">
            {photos.map((photo, index) => (
              <article key={photo.id} className="photo-preview-item">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                <img src={photo.preview} alt={`${index + 1}. seçilen araç fotoğrafı`} />
                <div className="photo-preview-actions">
                  <button type="button" title="Yukarı taşı" aria-label={`${index + 1}. fotoğrafı yukarı taşı`} disabled={index === 0} onClick={() => movePhoto(index, -1)}><ArrowUp size={14} /></button>
                  <button type="button" title="Aşağı taşı" aria-label={`${index + 1}. fotoğrafı aşağı taşı`} disabled={index === photos.length - 1} onClick={() => movePhoto(index, 1)}><ArrowDown size={14} /></button>
                  <button type="button" title="Fotoğrafı kaldır" aria-label={`${index + 1}. fotoğrafı kaldır`} onClick={() => removePhoto(photo.id)}><Trash2 size={14} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel-subtle space-y-3 p-4" aria-label="Gizlilik tercihleri">
        <label className="checkbox-row"><input type="checkbox" name="privacy_acknowledged" required /><span><a href={`/form/${dealerSlug}/privacy`} target="_blank">KVKK aydınlatma metnini</a> okudum. *</span></label>
        <label className="checkbox-row"><input type="checkbox" name="marketing_consent" /><span>Kampanya ve bilgilendirme e-postaları almak istiyorum.</span></label>
      </section>

      {!localMode && turnstileSiteKey ? (
        <Turnstile ref={turnstileRef} siteKey={turnstileSiteKey} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken("")} options={{ theme: "auto", size: "flexible" }} />
      ) : null}

      {state.message ? <div className="status-alert" data-tone={state.tone === "danger" ? "danger" : state.tone === "success" ? "success" : undefined} role={state.tone === "danger" ? "alert" : "status"}>{state.message}</div> : null}
      {working ? <div className="upload-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.progress}><span style={{ width: `${state.progress}%` }} /></div> : null}

      <Button type="submit" size="lg" className="w-full justify-center sm:w-auto" disabled={working}>
        {working ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
        {working ? "Başvuru gönderiliyor..." : "Fiyat Teklifi Al"}
      </Button>
    </form>
  );
}
