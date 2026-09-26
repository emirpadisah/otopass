"use client";

import { useRef, useState, type FormEvent } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";

type Result = { referenceCode: string | null; vehicle: string; status: string; updatedAt: string };

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
  const [trackingKey, setTrackingKey] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function verifyKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (siteKey && !captchaToken) { setError("Lütfen doğrulamayı tamamlayın."); return; }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/public/tracking/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceCode, trackingKey, turnstileToken: captchaToken }),
      });
      const body = await response.json() as { application?: Result; error?: string };
      if (!response.ok || !body.application) throw new Error(body.error || "Başvuru görüntülenemedi.");
      setResult(body.application);
      setTrackingKey("");
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
    setTrackingKey("");
    setCaptchaToken("");
    setError("");
    turnstile.current?.reset();
  }

  const currentStatus = result ? statusCopy[result.status] ?? { title: "Durum güncellendi", detail: "Ayrıntılar için galeriyle iletişime geçin." } : null;

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-solid)] p-6 shadow-[var(--shadow-elevated)] sm:p-8" aria-label="Başvuru takibi formu">
      {result && currentStatus ? (
        <div role="status">
          <CheckCircle2 size={34} className="text-[var(--success)]" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Başvuru durumu</p>
          <h2 className="mt-2 text-3xl font-bold">{currentStatus.title}</h2>
          <p className="mt-3 leading-7 text-[var(--text-secondary)]">{currentStatus.detail}</p>
          <dl className="mt-7 grid gap-4 rounded-xl bg-[var(--surface-1)] p-5 text-sm">
            <div><dt className="text-[var(--text-muted)]">Referans</dt><dd className="mt-1 font-semibold">{result.referenceCode}</dd></div>
            <div><dt className="text-[var(--text-muted)]">Araç</dt><dd className="mt-1 font-semibold">{result.vehicle}</dd></div>
            <div><dt className="text-[var(--text-muted)]">Son güncelleme</dt><dd className="mt-1 font-semibold">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(result.updatedAt))}</dd></div>
          </dl>
          <Button type="button" variant="secondary" className="mt-7 w-full" onClick={restart}>Başka başvuru sorgula</Button>
        </div>
      ) : (
        <form onSubmit={verifyKey} className="space-y-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Başvuru bilgileri</p><h2 className="mt-2 text-2xl font-bold">Güvenli sorgulama</h2><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Başvurunuz sonunda gösterilen referansı ve takip anahtarını kullanın.</p></div>
          <Field label="Başvuru referansı" labelFor="tracking-reference"><Input id="tracking-reference" value={referenceCode} onChange={(event) => setReferenceCode(event.target.value.toUpperCase())} autoComplete="off" placeholder="OTP-20260924-XXXXXXXX" required maxLength={64} /></Field>
          <Field label="Takip anahtarı" labelFor="tracking-key"><Input id="tracking-key" value={trackingKey} onChange={(event) => setTrackingKey(event.target.value.toUpperCase())} autoComplete="off" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" required maxLength={80} /></Field>
          {siteKey ? <Turnstile ref={turnstile} siteKey={siteKey} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken("")} options={{ theme: "auto", size: "flexible", action: "tracking_verify" }} /> : null}
          {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}
          {!available ? <p className="text-sm text-[var(--text-muted)]">Başvuru takibi şu anda kullanılamıyor.</p> : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy || !available}>{busy ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />} Durumu görüntüle</Button>
          <p className="text-xs leading-5 text-[var(--text-muted)]">Takip anahtarınızı kaybettiyseniz başvuruyu yaptığınız galeriye ulaşın.</p>
        </form>
      )}
    </section>
  );
}
