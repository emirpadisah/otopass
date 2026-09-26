import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { getRequestAccessContext } from "@/lib/auth/access-context";
import { needsMfaVerification } from "@/lib/auth/mfa";
import { resolveRouteForRoles } from "@/lib/auth/route";
import { requireUser } from "@/lib/auth/session";
import { LoginGradientMesh } from "@/app/login/LoginGradientMesh";
import { LoginThemeToggle } from "@/app/login/LoginThemeToggle";
import styles from "@/app/login/login.module.css";
import { MfaVerifyForm } from "./MfaVerifyForm";

export const metadata: Metadata = { title: "İki adımlı doğrulama | otoköprü" };

export default async function MfaVerifyPage() {
  await requireUser();
  const context = await getRequestAccessContext();
  if (!context) redirect("/login");
  const destination = context.mustChangePassword
    ? "/login/change-password"
    : resolveRouteForRoles(context.roles);
  if (destination === "/login") redirect("/login");
  if (!(await needsMfaVerification())) redirect(destination);

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.toolbar}>
          <Link href="/" className={styles.brandLink} aria-label="OtoKöprü ana sayfasına dön">
            <BrandLogo size="compact" preload />
          </Link>
          <LoginThemeToggle />
        </header>
        <div className={styles.formViewport}>
          <div className={styles.formShell}>
            <div className={styles.formHeading}>
              <span className={styles.secureBadge}><ShieldCheck size={14} aria-hidden="true" /> Güvenli oturum</span>
              <h1 className={styles.title}>İki adımlı doğrulama</h1>
              <p className={styles.description}>Kimlik doğrulayıcı uygulamanızdaki 6 haneli kodu girerek girişinizi tamamlayın.</p>
            </div>
            <MfaVerifyForm destination={destination} />
          </div>
        </div>
        <p className={styles.footnote}>Doğrulayıcı uygulamanıza erişemiyorsanız sistem yöneticinizle iletişime geçin.</p>
      </section>
      <aside className={styles.meshPanel} aria-hidden="true"><LoginGradientMesh className={styles.mesh} /></aside>
    </main>
  );
}
