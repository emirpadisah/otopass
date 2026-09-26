import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ScanSearch } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { isLocalDataMode } from "@/lib/data-mode";
import { LoginThemeToggle } from "@/app/login/LoginThemeToggle";
import { TrackingClient } from "./TrackingClient";
import styles from "./tracking.module.css";

export const metadata: Metadata = {
  title: "Başvuru takibi | otoköprü",
  description: "Başvuru durumunuzu OTP ile başlayan referans kodunuzla görüntüleyin.",
  robots: { index: false, follow: false },
};

export default function TrackingPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
  const available = !isLocalDataMode();

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
              <span className={styles.badge}><ScanSearch size={14} aria-hidden="true" /> Başvuru takibi</span>
              <h1 className={styles.title}>Başvurunuz hangi aşamada?</h1>
              <p className={styles.description}>Durumu görüntülemek için OTP ile başlayan başvuru referansınızı girin.</p>
            </div>
            <TrackingClient available={available} siteKey={siteKey} />
            <Link href="/" className={styles.backLink}><ArrowLeft size={15} aria-hidden="true" /> Ana sayfaya dön</Link>
          </div>
        </div>

        <p className={styles.footnote}>Referans kodunuzu yalnızca başvurunuzla ilgili kişilerle paylaşın.</p>
      </section>
    </main>
  );
}
