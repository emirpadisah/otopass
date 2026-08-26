import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { isLocalDataMode, isLocalUserAuthEnabled } from "@/lib/data-mode";
import { LoginForm } from "./LoginForm";
import { LoginGradientMesh } from "./LoginGradientMesh";
import { LoginThemeToggle } from "./LoginThemeToggle";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Giriş | otoköprü",
};

export default function LoginPage() {
  const localAuthDisabled = isLocalDataMode() && !isLocalUserAuthEnabled();

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
              <span className={styles.secureBadge}>
                <ShieldCheck size={14} aria-hidden="true" />
                Güvenli oturum
              </span>
              <h1 className={styles.title}>Hesabınıza giriş yapın</h1>
              <p className={styles.description}>Yetkili kullanıcı hesabınızın e-posta adresi ve şifresiyle devam edin.</p>
            </div>
            <LoginForm disabled={localAuthDisabled} />
          </div>
        </div>

        <p className={styles.footnote}>Hesaplar sistem yöneticisi tarafından oluşturulur ve yetkinize göre yönlendirilir.</p>
      </section>

      <aside className={styles.meshPanel} aria-hidden="true">
        <LoginGradientMesh
          className={styles.mesh}
        />
      </aside>
    </main>
  );
}
