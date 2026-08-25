"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verified = factors?.totp.find((factor) => factor.status === "verified");
        if (verified) {
          if (!active) return;
          setEnrollment({ factorId: verified.id, qrCode: "", secret: "" });
          setMessage("Kimlik doğrulayıcınızdaki 6 haneli kodu girin.");
          setBusy(false);
          return;
        }
        for (const factor of factors?.totp ?? []) await supabase.auth.mfa.unenroll({ factorId: factor.id });
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Galeri hesabı" });
        if (!active) return;
        if (error || !data.totp) {
          setMessage("İki adımlı doğrulama başlatılamadı. Sayfayı yenileyip tekrar deneyin.");
          setBusy(false);
          return;
        }
        setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
        setMessage("QR kodu kimlik doğrulayıcı uygulamanızla tarayın.");
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

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!enrollment || code.length !== 6) return;
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
    if (error) {
      setMessage("Kod doğrulanamadı. Yeni kodu kontrol edip tekrar deneyin.");
      setBusy(false);
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <section className="panel w-full max-w-xl p-6 sm:p-8">
      <div className="glass-chip"><ShieldCheck size={14} /> Hesap güvenliği</div>
      <h1 className="text-h1 mt-4">İki adımlı doğrulama</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Hesabınızı isteğe bağlı olarak bir kimlik doğrulayıcı uygulamayla koruyun.
      </p>
      <div className="mt-6 panel-subtle p-5 text-center">
        {busy && !enrollment ? <LoaderCircle className="mx-auto animate-spin text-[var(--accent)]" /> : null}
        {enrollment?.qrCode ? <Image src={enrollment.qrCode} alt="TOTP kurulum QR kodu" width={176} height={176} unoptimized className="mx-auto h-44 w-44 rounded-md bg-white p-2" /> : null}
        {enrollment?.secret ? <code className="mono mt-3 block break-all text-xs">{enrollment.secret}</code> : null}
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{message}</p>
      </div>
      {enrollment ? (
        <form onSubmit={verify} className="mt-5 space-y-4">
          <Field label="6 haneli kod" labelFor="code"><Input id="code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} /></Field>
          <Button type="submit" size="lg" className="w-full justify-center" disabled={busy || code.length !== 6}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <KeyRound size={16} />} Doğrula ve devam et</Button>
        </form>
      ) : null}
    </section>
  );
}
