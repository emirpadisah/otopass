"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Field, Input, ThemeToggle } from "@/components/ui";
import { changePassword } from "../actions";
import { LoginGradientMesh } from "../LoginGradientMesh";
import styles from "./change-password.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      className={`${styles.submit} w-full justify-center`}
      disabled={pending}
    >
      {pending ? "Kaydediliyor..." : "Şifreyi kaydet"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, { error: null as string | null });

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.toolbar}>
          <Link href="/" className={styles.brandLink} aria-label="OtoKöprü ana sayfasına dön">
            <BrandLogo size="compact" preload />
          </Link>
          <ThemeToggle />
        </header>

        <div className={styles.formViewport}>
          <div className={styles.formShell}>
            <div className={styles.formHeading}>
              <span className={styles.secureBadge}>
                <ShieldCheck size={14} aria-hidden="true" />
                Hesap güvenliği
              </span>
              <h1 className={styles.title}>Yeni şifre belirleyin</h1>
              <p className={styles.description}>
                İlk girişte geçici şifre kalıcı şifreyle değiştirilir. Bu adım tamamlanmadan panele erişim verilmez.
              </p>
            </div>

            <form className={styles.form} action={formAction}>
              <Field label="Yeni şifre" labelFor="password" className={styles.field}>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={12}
                  autoComplete="new-password"
                  required
                />
              </Field>

              <Field label="Yeni şifre tekrar" labelFor="confirmPassword" className={styles.field}>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  minLength={12}
                  autoComplete="new-password"
                  required
                />
              </Field>

              {state.error ? (
                <div className="status-alert" data-tone="danger" role="alert">
                  {state.error}
                </div>
              ) : null}

              <SubmitButton />
            </form>

            <p className={styles.footnote}>
              Hesaplar sistem yöneticisi tarafından oluşturulur ve yetkinize göre yönlendirilir.
            </p>
          </div>
        </div>
      </section>

      <aside className={styles.meshPanel} aria-hidden="true">
        <LoginGradientMesh className={styles.mesh} />
      </aside>
    </main>
  );
}
