"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { MfaHelpDialog } from "./MfaHelpDialog";
import styles from "./mfa.module.css";

type Enrollment = { factorId: string; qrCode: string; secret: string };

type MfaSetupProps = {
  redirectTo?: string;
};

export function MfaSetup({ redirectTo = "/dealer" }: MfaSetupProps) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("Kimlik doğrulayıcı hazırlanıyor...");
  const [busy, setBusy] = useState(true);
  const [canEnroll, setCanEnroll] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function prepare() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setMessage("Bu geliştirme ortamında iki adımlı doğrulama kullanılamaz.");
        setBusy(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
        if (factorError) throw factorError;
        const verified = factors?.totp.find((factor) => factor.status === "verified");
        if (verified) {
          if (!active) return;
          setEnrollment({ factorId: verified.id, qrCode: "", secret: "" });
          setMessage("Kimlik doğrulayıcınızdaki 6 haneli kodu girin.");
          setBusy(false);
          return;
        }
        if (!active) return;
        setCanEnroll(true);
        setHelpOpen(true);
        setMessage("Devam etmek için kimlik doğrulayıcı uygulamanızı bağlayın.");
        setBusy(false);
      } catch {
        if (!active) return;
        setMessage("İki adımlı doğrulama başlatılamadı. Sayfayı yenileyip tekrar deneyin.");
        setBusy(false);
      }
    }
    void prepare();
    return () => { active = false; };
  }, []);

  async function enroll() {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await getSupabaseBrowserClient().auth.mfa.enroll({
        factorType: "totp",
        issuer: "otoKöprü",
      });
      if (error || !data) throw error ?? new Error("ENROLL_FAILED");
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setCanEnroll(false);
      setMessage("QR kodu kimlik doğrulayıcı uygulamanızla tarayın.");
    } catch {
      setMessage("Kurulum başlatılamadı. Mevcut kurulum sekmenizi kontrol edin veya yöneticinizle iletişime geçin.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !enrollment || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
      if (error) throw error;
      setEnrollment(null);
      setCode("");
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setMessage("Kod doğrulanamadı. Yeni kodu kontrol edip tekrar deneyin.");
      setBusy(false);
    }
  }

  return (
    <section className={`panel w-full max-w-xl p-6 sm:p-8 ${styles.card}`}>
      <div className="glass-chip"><ShieldCheck size={14} /> Hesap güvenliği</div>
      <h1 className="text-h1 mt-4">İki adımlı doğrulama</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Panele erişmek için kimlik doğrulayıcı uygulamanızla doğrulama yapın.
      </p>
      <MfaHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <div className="mt-6 panel-subtle p-5 text-center">
        {busy && !enrollment ? <LoaderCircle className="mx-auto animate-spin text-[var(--accent)]" /> : null}
        {enrollment?.qrCode ? <Image src={enrollment.qrCode} alt="TOTP kurulum QR kodu" width={176} height={176} unoptimized className="mx-auto h-44 w-44 rounded-md bg-white p-2" /> : null}
        {enrollment?.secret ? <div className="mt-3"><p className="text-xs text-[var(--text-muted)]">QR kodu tarayamıyorsanız kurulum anahtarı:</p><code className="mono mt-1 block break-all text-xs">{enrollment.secret}</code></div> : null}
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{message}</p>
      </div>
      {canEnroll ? <Button type="button" onClick={enroll} disabled={busy} className="mt-5 w-full justify-center">Kimlik doğrulayıcıyı bağla</Button> : null}
      {enrollment ? (
        <form onSubmit={verify} className="mt-5 space-y-4">
          <Field label="6 haneli kod" labelFor="code"><Input id="code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} /></Field>
          <Button type="submit" size="lg" className="w-full justify-center" disabled={busy || code.length !== 6}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <KeyRound size={16} />} Doğrula ve devam et</Button>
        </form>
      ) : null}
    </section>
  );
}
