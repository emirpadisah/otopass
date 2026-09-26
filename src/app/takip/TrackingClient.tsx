"use client";

import { useRef, useState, type FormEvent } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import styles from "./tracking.module.css";

type Result = { referenceCode: string | null; status: string };

const statusCopy: Record<string, { title: string; detail: string }> = {
  pending: { title: "İncelemede", detail: "Başvurunuz alındı ve galeri tarafından değerlendiriliyor." },
  offered: { title: "Teklif oluşturuldu", detail: "Galeri bir teklif oluşturdu. Ayrıntılar için galeriyle iletişime geçin." },
  accepted: { title: "Kabul edildi", detail: "Teklif kabul edildi olarak işaretlendi." },
  rejected: { title: "Reddedildi", detail: "Teklif reddedildi olarak işaretlendi. Galeri yeni bir teklif oluşturabilir." },
  sold: { title: "Satış tamamlandı", detail: "Başvuru satış tamamlandı olarak işaretlendi." },
  archived: { title: "Arşivlendi", detail: "Bu başvuru arşivlendi." },
};

export function TrackingClient({ available, siteKey }: { available: boolean; siteKey: string | null }) {
  const turnstile = useRef<TurnstileInstance>(null);
  const [referenceCode, setReferenceCode] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookupApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (siteKey && !captchaToken) { setError("Lütfen doğrulamayı tamamlayın."); return; }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/public/tracking/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceCode, turnstileToken: captchaToken }),
      });
      const body = await response.json() as { application?: Result; error?: string };
      if (!response.ok || !body.application) throw new Error(body.error || "Başvuru görüntülenemedi.");
      setResult(body.application);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Başvuru görüntülenemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
      setCaptchaToken("");
      turnstile.current?.reset();
    }
  }

  function restart() {
    setResult(null);
    setReferenceCode("");
    setCaptchaToken("");
    setError("");
    turnstile.current?.reset();
  }

  const currentStatus = result ? statusCopy[result.status] ?? { title: "Durum güncellendi", detail: "Ayrıntılar için galeriyle iletişime geçin." } : null;

  return result && currentStatus ? (
    <section className={styles.result} role="status" aria-label="Başvuru durumu">
      <span className={styles.statusIcon}><CheckCircle2 size={24} aria-hidden="true" /></span>
      <p className={styles.resultEyebrow}>Başvuru durumu</p>
      <h2 className={styles.resultTitle}>{currentStatus.title}</h2>
      <p className={styles.resultDetail}>{currentStatus.detail}</p>
      <div className={styles.referenceTicket}>
        <span>Başvuru referansı</span>
        <strong>{result.referenceCode}</strong>
      </div>
      <Button type="button" variant="secondary" className={styles.secondaryButton} onClick={restart}>Başka başvuru sorgula</Button>
    </section>
  ) : (
    <form onSubmit={lookupApplication} className={styles.form} aria-label="Başvuru takibi formu">
      <Field label="Başvuru referansı" labelFor="tracking-reference" className={styles.field}>
        <Input
          id="tracking-reference"
          name="referenceCode"
          value={referenceCode}
          onChange={(event) => setReferenceCode(event.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="OTP-20260926-XXXXXXXX"
          required
          maxLength={37}
        />
      </Field>
      {siteKey ? <Turnstile ref={turnstile} siteKey={siteKey} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken("")} options={{ theme: "auto", size: "flexible", action: "tracking_verify" }} /> : null}
      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}
      {!available ? <p className={styles.alert}>Başvuru takibi şu anda kullanılamıyor.</p> : null}
      <Button type="submit" size="lg" className={styles.submit} disabled={busy || !available}>
        {busy ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : null}
        {busy ? "Sorgulanıyor..." : "Durumu görüntüle"}
      </Button>
    </form>
  );
}
