import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./legal-page.module.css";

const SUPPORT_PHONE = "+90 553 684 58 21";
const SUPPORT_EMAIL = "info@otokopru.com";

type LegalPageProps = {
  kicker: string;
  title: string;
  description: string;
  effectiveDate: string;
  backHref?: string;
  backLabel?: string;
  brand?: ReactNode;
  children: ReactNode;
};

export function LegalPage({
  kicker,
  title,
  description,
  effectiveDate,
  backHref = "/",
  backLabel = "Ana sayfaya dön",
  brand,
  children,
}: LegalPageProps) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="otoköprü ana sayfasına dön">
            <BrandLogo size="compact" preload />
          </Link>
          <nav className={styles.nav} aria-label="Yasal sayfalar">
            <Link href="/terms">Koşullar</Link>
            <Link href="/privacy">Gizlilik</Link>
            <Link href="/kvkk">KVKK</Link>
          </nav>
          <Link href="/login" className={styles.loginLink}>Panele giriş</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <Link href={backHref} className={styles.backLink}>
            <ArrowLeft size={15} aria-hidden="true" />
            {backLabel}
          </Link>
          {brand ? <div className={styles.contextBrand}>{brand}</div> : null}
          <p className={styles.kicker}>{kicker}</p>
          <h1>{title}</h1>
          <p className={styles.intro}>{description}</p>
          <p className={styles.effectiveDate}>Yürürlük tarihi: {effectiveDate}</p>
        </div>
      </section>

      <article className={`${styles.container} ${styles.document}`}>{children}</article>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div>
            <BrandLogo size="compact" />
            <p>Başvuru ve teklif süreçleri için düzenli, güvenli çalışma alanı.</p>
          </div>
          <div className={styles.footerContact}>
            <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}><Phone size={15} aria-hidden="true" />{SUPPORT_PHONE}</a>
            <a href={`mailto:${SUPPORT_EMAIL}`}><Mail size={15} aria-hidden="true" />{SUPPORT_EMAIL}</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      <div className={styles.sectionContent}>{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className={styles.list}>{children}</ul>;
}

export function LegalNote({ children }: { children: ReactNode }) {
  return <aside className={styles.note}>{children}</aside>;
}
