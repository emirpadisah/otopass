"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "@/app/login/login.module.css";

export function MfaVerifyForm({ destination }: { destination: string }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadFactor = async () => {
      try {
        const { data, error: listError } = await getSupabaseBrowserClient().auth.mfa.listFactors();
        if (!active) return;
        if (listError) throw listError;
        const verified = data.totp.find((factor) => factor.status === "verified");
        if (!verified) {
          setError("Doğrulayıcı bulunamadı. Sayfayı yenileyin veya sistem yöneticinizle iletişime geçin.");
          return;
        }
        setFactorId(verified.id);
      } catch {
        if (active) setError("Doğrulayıcı yüklenemedi. Sayfayı yenileyip tekrar deneyin.");
      }
    };
    void loadFactor();
    return () => { active = false; };
  }, []);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: verifyError } = await getSupabaseBrowserClient().auth.mfa.challengeAndVerify({ factorId, code });
      if (verifyError) throw verifyError;
      router.replace(destination);
      router.refresh();
    } catch {
      setError("Kod doğrulanamadı. Yeni kodu kontrol edip tekrar deneyin.");
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={verify}>
      <Field label="6 haneli kod" labelFor="mfa-code" className={styles.field}>
        <Input id="mfa-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} autoFocus />
      </Field>
      {error ? <div className="status-alert" data-tone="danger" role="alert">{error}</div> : null}
      <Button type="submit" size="lg" className={`${styles.submit} w-full justify-center`} disabled={!factorId || busy || code.length !== 6}>
        {busy ? "Doğrulanıyor..." : factorId ? "Doğrula ve devam et" : "Doğrulayıcı yükleniyor..."}
      </Button>
    </form>
  );
}
