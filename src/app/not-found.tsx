import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı | otoköprü",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="otoköprü ana sayfasına dön"><BrandLogo size="compact" preload /></Link>
        <Link href="/login" className={styles.loginLink}>Panele giriş</Link>
      </header>

      <section className={styles.content}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}><Compass size={15} aria-hidden="true" />404 · Sayfa bulunamadı</span>
          <h1>Bu bağlantı burada bitiyor.</h1>
          <p>Adres hatalı olabilir ya da erişmeye çalıştığınız sayfa artık kullanılmıyor olabilir. Ana sayfaya dönerek yeni bir rota seçebilirsiniz.</p>
          <div className={styles.actions}>
            <Link href="/" className={styles.primaryAction}>Ana sayfaya dön <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/login" className={styles.secondaryAction}><ArrowLeft size={16} aria-hidden="true" />Panele giriş</Link>
          </div>
        </div>
        <div className={styles.code} aria-hidden="true"><span>4</span><i>0</i><span>4</span></div>
      </section>
    </main>
  );
}
