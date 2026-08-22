"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  CheckCircle2,
  ContactRound,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  Send,
  Trash2,
  UploadCloud,
  Wrench,
} from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button, Field, Input, Textarea, VehicleConditionMap } from "@/components/ui";
import { formatTurkishMobileInput } from "@/lib/phone";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ACCEPTED_IMAGE_TYPES, MAX_FILES, MAX_FILE_SIZE } from "@/lib/validation/application";
import type { VehicleBodyCondition } from "@/lib/vehicle-condition";

type PhotoItem = { id: string; file: File; preview: string };
type SubmissionState = {
  tone: "idle" | "working" | "success" | "danger";
  message: string;
  progress: number;
  referenceCode?: string;
};
type InitiateResponse = {
  sessionId: string;
  finalizeToken: string;
  uploads: Array<{ path: string; token: string }>;
  error?: string;
};

const fuelOptions = ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"];
const transmissionOptions = ["Manuel", "Otomatik", "Yarı Otomatik"];
const formSteps = [
  { label: "İletişim", shortDescription: "İletişim bilgileriniz", icon: ContactRound },
  { label: "Araç", shortDescription: "Araç özellikleri", icon: CarFront },
  { label: "Kondisyon", shortDescription: "Ekspertiz ve fotoğraflar", icon: Wrench },
] as const;
const stepFieldIds = [
  ["owner_name", "owner_phone"],
  ["brand", "model"],
  [],
] as const;

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

function toApplicationPayload(formData: FormData, dealerSlug: string, bodyCondition: VehicleBodyCondition) {
  return {
    dealer_slug: dealerSlug,
    owner_name: String(formData.get("owner_name") ?? ""),
    owner_phone: String(formData.get("owner_phone") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    model: String(formData.get("model") ?? ""),
    vehicle_package: String(formData.get("vehicle_package") ?? ""),
    model_year: String(formData.get("model_year") ?? ""),
    km: String(formData.get("km") ?? ""),
    fuel_type: String(formData.get("fuel_type") ?? ""),
    transmission: String(formData.get("transmission") ?? ""),
    tramer_info: String(formData.get("tramer_info") ?? ""),
    damage_info: String(formData.get("damage_info") ?? ""),
    body_condition: bodyCondition,
    privacy_acknowledged: formData.get("privacy_acknowledged") === "on",
  };
}

function FormSectionHeader({
  description,
  headingRef,
  icon: Icon,
  step,
  title,
}: {
  description: string;
  headingRef: (element: HTMLHeadingElement | null) => void;
  icon: LucideIcon;
  step: number;
  title: string;
}) {
  return (
    <header className="intake-section-heading">
      <span className="intake-section-icon"><Icon size={19} aria-hidden="true" /></span>
      <div>
        <span>Adım {step} / {formSteps.length}</span>
        <h2 ref={headingRef} tabIndex={-1}>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}

export function FormClient({
  dealerSlug,
  customDomain,
  localMode,
  turnstileSiteKey,
}: {
  dealerSlug: string;
  customDomain: boolean;
  localMode: boolean;
  turnstileSiteKey: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const photosRef = useRef<PhotoItem[]>([]);
  const stepHeadingRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [captchaToken, setCaptchaToken] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [bodyCondition, setBodyCondition] = useState<VehicleBodyCondition>({});
  const [state, setState] = useState<SubmissionState>({ tone: "idle", message: "", progress: 0 });

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview)), []);

  function selectPhotos(files: FileList | null) {
    if (!files?.length) return;
    const incoming = Array.from(files);
    const invalid = incoming.find((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number]) || file.size > MAX_FILE_SIZE);
    if (invalid) {
      setState({ tone: "danger", message: "JPG, PNG veya WebP biçiminde, dosya başına en fazla 10 MB olan fotoğrafları seçin.", progress: 0 });
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

  function changeStep(nextStep: number) {
    if (nextStep < 0 || nextStep >= formSteps.length || nextStep > furthestStep || state.tone === "working") return;
    setCurrentStep(nextStep);
    setState((current) => current.tone === "danger" ? { tone: "idle", message: "", progress: 0 } : current);
    window.requestAnimationFrame(() => stepHeadingRefs.current[nextStep]?.focus());
  }

  function advanceStep() {
    const form = formRef.current;
    if (!form) return;

    for (const fieldId of stepFieldIds[currentStep]) {
      const field = form.elements.namedItem(fieldId);
      if (field instanceof HTMLInputElement && !field.checkValidity()) {
        setState({ tone: "danger", message: "Zorunlu alanları doldurarak devam edin.", progress: 0 });
        field.reportValidity();
        field.focus();
        return;
      }
    }

    const nextStep = Math.min(currentStep + 1, formSteps.length - 1);
    setFurthestStep((current) => Math.max(current, nextStep));
    setCurrentStep(nextStep);
    setState({ tone: "idle", message: "", progress: 0 });
    window.requestAnimationFrame(() => stepHeadingRefs.current[nextStep]?.focus());
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
        application: toApplicationPayload(formData, dealerSlug, bodyCondition),
        files: compressed.map((file) => ({ name: file.name, contentType: file.type, size: file.size })),
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
      if (error) throw new Error("Fotoğraf yüklenemedi. İnternet bağlantınızı kontrol edip yeniden deneyin.");
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
      formData.set("body_condition", JSON.stringify(bodyCondition));
      setState({ tone: "working", message: photos.length ? "Fotoğraflar hazırlanıyor..." : "Başvuru hazırlanıyor...", progress: 5 });
      const compressed = photos.length
        ? await compressPhotos(photos, (progress) => setState({ tone: "working", message: "Fotoğraflar hazırlanıyor...", progress }))
        : [];
      setState({ tone: "working", message: "Güvenli yükleme başlatılıyor...", progress: 25 });
      const result = localMode ? await submitLocal(formData, compressed) : await submitSupabase(formData, compressed);
      if (!result.ok) throw new Error(result.error || "Başvuru gönderilemedi.");

      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
      setPhotos([]);
      setBodyCondition({});
      formRef.current?.reset();
      setCaptchaToken("");
      turnstileRef.current?.reset();
      setState({
        tone: "success",
        message: "Başvurunuz galeri ekibine iletildi.",
        progress: 100,
        referenceCode: result.referenceCode,
      });
    } catch (error) {
      setState({ tone: "danger", message: error instanceof Error ? error.message : "Başvuru gönderilemedi.", progress: 0 });
      setCaptchaToken("");
      turnstileRef.current?.reset();
    }
  }

  function startNewApplication() {
    setCurrentStep(0);
    setFurthestStep(0);
    setState({ tone: "idle", message: "", progress: 0 });
    window.requestAnimationFrame(() => stepHeadingRefs.current[0]?.focus());
  }

  const working = state.tone === "working";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="intake-form">
      <input type="hidden" name="dealer_slug" value={dealerSlug} />
      <input type="hidden" name="body_condition" value={JSON.stringify(bodyCondition)} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {state.tone === "success" ? (
        <section className="intake-success-view" role="status" aria-labelledby="intake-success-title">
          <span className="intake-success-icon"><CheckCircle2 size={28} aria-hidden="true" /></span>
          <p className="section-label">Başvuru tamamlandı</p>
          <h2 id="intake-success-title">Aracınız değerlendirme sırasına alındı.</h2>
          <p>{state.message} Süreçle ilgili geri dönüş, paylaştığınız iletişim bilgileri üzerinden yapılacak.</p>
          <div className="intake-reference">
            <span>Başvuru referansı</span>
            <strong>{state.referenceCode || "Oluşturuldu"}</strong>
          </div>
          <div className="intake-success-note"><LockKeyhole size={16} aria-hidden="true" /> Bu kodu başvurunuzla ilgili görüşmelerde kullanabilirsiniz.</div>
          <Button type="button" variant="secondary" size="lg" onClick={startNewApplication}>
            <RotateCcw size={16} aria-hidden="true" /> Yeni başvuru oluştur
          </Button>
        </section>
      ) : (
        <>
          <nav className="intake-stepper" aria-label="Başvuru adımları">
            <ol>
              {formSteps.map(({ label, shortDescription, icon: Icon }, index) => {
                const stepState = index === currentStep ? "current" : index <= furthestStep ? "complete" : "upcoming";
                return (
                  <li key={label} data-state={stepState}>
                    <button
                      type="button"
                      onClick={() => changeStep(index)}
                      disabled={index > furthestStep || working}
                      aria-current={index === currentStep ? "step" : undefined}
                    >
                      <span className="intake-step-number">
                        {stepState === "complete" ? <Check size={16} aria-hidden="true" /> : <Icon size={17} aria-hidden="true" />}
                      </span>
                      <span className="intake-step-copy">
                        <small>0{index + 1}</small>
                        <strong>{label}</strong>
                        <span>{shortDescription}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="intake-step-track" aria-hidden="true"><span style={{ width: `${(currentStep / (formSteps.length - 1)) * 100}%` }} /></div>
          </nav>

          <div className="intake-step-stage">
            <section className="intake-section" hidden={currentStep !== 0}>
              <FormSectionHeader
                step={1}
                title="Sizinle nasıl iletişim kuralım?"
                description="Başvurunuzla ilgili geri dönüş için güncel iletişim bilgilerinizi girin."
                icon={ContactRound}
                headingRef={(element) => { stepHeadingRefs.current[0] = element; }}
              />
              <div className="intake-field-grid intake-contact-grid">
                <Field label="Ad soyad *" labelFor="owner_name"><Input id="owner_name" name="owner_name" autoComplete="name" placeholder="Ad soyad" required /></Field>
                <Field label="Telefon numarası *" labelFor="owner_phone" description="+905551112233 biçiminde ve boşluksuz girin">
                  <Input
                    id="owner_phone"
                    name="owner_phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    defaultValue="+90"
                    maxLength={32}
                    pattern="[+]905[0-9]{9}"
                    title="Telefonu +905551112233 biçiminde boşluksuz girin."
                    onInput={(event) => { event.currentTarget.value = formatTurkishMobileInput(event.currentTarget.value); }}
                    required
                  />
                </Field>
              </div>
            </section>

            <section className="intake-section" hidden={currentStep !== 1}>
              <FormSectionHeader
                step={2}
                title="Araç bilgilerini paylaşın"
                description="Marka ve model zorunludur. Diğer bilgiler ön değerlendirmenin daha ayrıntılı yapılmasına yardımcı olur."
                icon={CarFront}
                headingRef={(element) => { stepHeadingRefs.current[1] = element; }}
              />
              <div className="intake-field-grid intake-vehicle-grid">
                <Field label="Marka *" labelFor="brand"><Input id="brand" name="brand" placeholder="Örn. Volkswagen" required /></Field>
                <Field label="Model *" labelFor="model"><Input id="model" name="model" placeholder="Örn. Golf" required /></Field>
                <Field label="Paket" labelFor="vehicle_package"><Input id="vehicle_package" name="vehicle_package" placeholder="Örn. Comfortline" /></Field>
                <Field label="Model yılı" labelFor="model_year"><Input id="model_year" name="model_year" type="number" min={1950} max={new Date().getFullYear() + 1} inputMode="numeric" placeholder="2022" /></Field>
                <Field label="Kilometre" labelFor="km"><Input id="km" name="km" type="number" min={0} max={10_000_000} inputMode="numeric" placeholder="45000" /></Field>
                <Field label="Yakıt tipi" labelFor="fuel_type">
                  <select id="fuel_type" name="fuel_type" className="input-base"><option value="">Seçin</option>{fuelOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                </Field>
                <Field label="Vites" labelFor="transmission">
                  <select id="transmission" name="transmission" className="input-base"><option value="">Seçin</option>{transmissionOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                </Field>
              </div>
            </section>

            <section className="intake-section" hidden={currentStep !== 2} aria-labelledby="photos-title">
              <FormSectionHeader
                step={3}
                title="Araç kondisyonunu paylaşın"
                description="Kaporta durumu, hasar notları ve net fotoğraflar başvurunun daha hızlı incelenmesine yardımcı olur."
                icon={Wrench}
                headingRef={(element) => { stepHeadingRefs.current[2] = element; }}
              />
              <div className="intake-section-content">
                <section className="intake-inspection" aria-labelledby="body-condition-title">
                  <header>
                    <div>
                      <span>Görsel ekspertiz</span>
                      <h3 id="body-condition-title">Kaporta parçaları</h3>
                    </div>
                    <p>Aracınızda işlem gören parçaları durumuna göre işaretleyin.</p>
                  </header>
                  <VehicleConditionMap value={bodyCondition} onChange={setBodyCondition} />
                </section>

                <div className="intake-field-grid intake-condition-grid">
                  <Field label="Tramer bilgisi" labelFor="tramer_info"><Textarea id="tramer_info" name="tramer_info" rows={3} placeholder="Varsa tutar ve kayıt ayrıntısı" /></Field>
                  <Field label="Hasar bilgisi" labelFor="damage_info"><Textarea id="damage_info" name="damage_info" rows={3} placeholder="Varsa hasar ve onarım ayrıntıları" /></Field>
                </div>

                <div
                  className="upload-dropzone"
                  data-active={dragActive || undefined}
                  onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
                  onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
                  onDragLeave={(event) => { if (event.currentTarget === event.target) setDragActive(false); }}
                  onDrop={(event) => { event.preventDefault(); setDragActive(false); selectPhotos(event.dataTransfer.files); }}
                >
                  <label className="upload-dropzone-trigger" htmlFor="photos">
                    <span className="intake-upload-icon"><UploadCloud size={24} aria-hidden="true" /></span>
                    <span className="intake-upload-copy">
                      <strong id="photos-title">Araç fotoğraflarını buraya bırakın</strong>
                      <small id="photo-format">JPG, PNG veya WebP · en fazla {MAX_FILES} fotoğraf · dosya başına 10 MB</small>
                    </span>
                    <span className="intake-upload-action"><ImagePlus size={15} aria-hidden="true" /> Fotoğraf seç</span>
                    <input id="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" aria-describedby="photo-format" onChange={(event) => { selectPhotos(event.target.files); event.target.value = ""; }} />
                  </label>
                  <div className="intake-photo-meter" aria-label={`${photos.length}/${MAX_FILES} fotoğraf seçildi`}>
                    <span style={{ width: `${(photos.length / MAX_FILES) * 100}%` }} />
                    <small>{photos.length}/{MAX_FILES}</small>
                  </div>
                </div>

                {photos.length > 0 ? (
                  <div className="photo-preview-grid" aria-label="Seçilen fotoğraflar">
                    {photos.map((photo, index) => (
                      <article key={photo.id} className="photo-preview-item">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                        <img src={photo.preview} alt={`${index + 1}. seçilen araç fotoğrafı`} />
                        <span className="photo-preview-index">{String(index + 1).padStart(2, "0")}</span>
                        <div className="photo-preview-meta">
                          <strong title={photo.file.name}>{photo.file.name}</strong>
                          <small>{(photo.file.size / (1024 * 1024)).toFixed(1)} MB</small>
                        </div>
                        <div className="photo-preview-actions">
                          <button type="button" title="Sola taşı" aria-label={`${index + 1}. fotoğrafı sola taşı`} disabled={index === 0} onClick={() => movePhoto(index, -1)}><ArrowLeft size={15} /></button>
                          <button type="button" title="Sağa taşı" aria-label={`${index + 1}. fotoğrafı sağa taşı`} disabled={index === photos.length - 1} onClick={() => movePhoto(index, 1)}><ArrowRight size={15} /></button>
                          <button type="button" title="Fotoğrafı kaldır" aria-label={`${index + 1}. fotoğrafı kaldır`} onClick={() => removePhoto(photo.id)}><Trash2 size={15} /></button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}

                <div className="intake-consent-block">
                  <label className="checkbox-row intake-consent"><input type="checkbox" name="privacy_acknowledged" required /><span><a href={customDomain ? "/privacy" : `/form/${dealerSlug}/privacy`} target="_blank" rel="noreferrer">KVKK aydınlatma metnini</a> okudum ve kişisel verilerimin belirtilen amaçlarla işleneceği konusunda bilgilendirildim. *</span></label>
                  <span><LockKeyhole size={14} aria-hidden="true" /> Bilgileriniz şifreli bağlantı üzerinden iletilir.</span>
                </div>

                {!localMode && turnstileSiteKey ? (
                  <div className="intake-captcha"><Turnstile ref={turnstileRef} siteKey={turnstileSiteKey} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken("")} options={{ theme: "auto", size: "flexible" }} /></div>
                ) : null}
              </div>
            </section>
          </div>

          {state.message ? <div className="status-alert intake-status" data-tone={state.tone === "danger" ? "danger" : undefined} role={state.tone === "danger" ? "alert" : "status"}>{state.message}</div> : null}
          {working ? <div className="upload-progress intake-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.progress}><span style={{ width: `${state.progress}%` }} /></div> : null}

          <footer className="intake-form-footer">
            <div className="intake-step-caption">
              <span>{String(currentStep + 1).padStart(2, "0")}</span>
              <p><strong>{formSteps[currentStep].label}</strong>{currentStep < formSteps.length - 1 ? " bilgilerini tamamlayın" : " adımını kontrol edip gönderin"}</p>
            </div>
            <div className="intake-form-actions">
              {currentStep > 0 ? (
                <Button type="button" variant="ghost" size="lg" onClick={() => changeStep(currentStep - 1)} disabled={working}>
                  <ArrowLeft size={16} aria-hidden="true" /> Geri
                </Button>
              ) : null}
              {currentStep < formSteps.length - 1 ? (
                <Button type="button" size="lg" onClick={advanceStep}>
                  Devam et <ArrowRight size={16} aria-hidden="true" />
                </Button>
              ) : (
                <Button type="submit" size="lg" className="intake-submit" disabled={working}>
                  {working ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                  {working ? "Gönderiliyor..." : "Başvuruyu gönder"}
                </Button>
              )}
            </div>
          </footer>
        </>
      )}
    </form>
  );
}
