import type { Metadata } from "next";
import Link from "next/link";
import { Check, ClipboardCheck, ScanSearch, HandCoins, ShieldCheck, MessageCircle, CarFront } from "lucide-react";
import { readApplicationTracking } from "@/lib/application-tracking";
import { getTrackingStatus } from "@/lib/application-tracking-status";
import { getWhatsAppUrl } from "@/lib/phone";
import { ThemeToggle, buttonVariants } from "@/components/ui";
import { TrackingRefresh } from "./refresh";
import formStyles from "@/app/form/[dealerSlug]/form.module.css";
import styles from "./tracking.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Başvuru takibi | otoköprü",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const stages = [
  { title: "Başvuru alındı", description: "Bilgileriniz galeriye iletildi.", icon: ClipboardCheck },
  { title: "İncelemede", description: "Araç bilgileriniz değerlendiriliyor.", icon: ScanSearch },
  { title: "Teklif hazırlandı", description: "Galeri teklifini oluşturdu.", icon: HandCoins },
];

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const application = await readApplicationTracking(token);
  const status = application ? getTrackingStatus(application.status, application.reviewStartedAt) : null;
  const contact = application ? getWhatsAppUrl(application.contactPhone) : null;
  return <div className={`${formStyles.page} ${styles.page}`}>
    <header className={styles.header}><div><span className={styles.eyebrow}>MÜŞTERİ BAŞVURU TAKİBİ</span><strong>{application?.dealerName ?? "otoköprü"}</strong></div><ThemeToggle compact /></header>
    <main className={styles.main}>
      {application && status ? <>
        <div className={styles.intro}><span className={styles.badge}><ClipboardCheck size={15} aria-hidden="true" /> Başvuru durumu</span><h1>{status.title}</h1><p>{status.description}</p></div>
        <section className={styles.card} aria-label="Başvuru özeti">
          <div className={styles.vehicle}><CarFront size={24} aria-hidden="true" /><div><span>Değerlendirilen araç</span><h2>{application.vehicle}</h2></div></div>
          <dl className={styles.facts}><div><dt>Başvuru numarası</dt><dd>{application.reference ?? "Başvuru kaydı"}</dd></div><div><dt>Başvuru tarihi</dt><dd>{new Date(application.submittedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" })}</dd></div></dl>
          {status.step >= 0 ? <ol className={styles.timeline} aria-label="Başvuru aşamaları">{stages.map(({ title, description, icon: Icon }, index) => <li key={title} data-state={index < status.step ? "complete" : index === status.step ? "current" : "upcoming"} aria-current={index === status.step ? "step" : undefined}>
            <span className={styles.stepIcon}>{index < status.step ? <Check size={20} aria-hidden="true" /> : <Icon size={20} aria-hidden="true" />}</span>
            <div><h3>{title}</h3><p>{index <= status.step ? description : "Bu aşamaya henüz geçilmedi."}</p><small>{index < status.step ? "Tamamlandı" : index === status.step ? "Ulaşılan aşama" : "Bekliyor"}</small></div>
          </li>)}</ol> : <p className={styles.closed}>Başvuru arşivlendi.</p>}
          <TrackingRefresh />
        </section>
        <section className={styles.contact}><div><h2>Süreç hakkında destek alın</h2><p>{application.dealerName} ekibiyle başvuru numaranızı paylaşarak görüşebilirsiniz.</p></div>{contact ? <a href={contact} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "secondary", size: "sm" })}><MessageCircle size={16} aria-hidden="true" /> Galeriye ulaşın</a> : null}</section>
      </> : <section className={`${styles.card} ${styles.empty}`}><ShieldCheck size={32} aria-hidden="true" /><h1>Takip bağlantısı kullanılamıyor</h1><p>Bağlantı geçersiz veya galeri tarafından yenilenmiş olabilir. Başvurunuzu yaptığınız galeriden güncel bağlantıyı isteyin.</p><Link href="/" className={buttonVariants({ variant: "secondary" })}>Ana sayfaya dön</Link></section>}
    </main>
    <footer className={styles.footer}><ShieldCheck size={15} aria-hidden="true" /><p>Bu sayfa size özel bağlantıyla açılır. Bağlantınızı güvenli bir yerde saklayın.</p><span>otoköprü</span></footer>
  </div>;
}
