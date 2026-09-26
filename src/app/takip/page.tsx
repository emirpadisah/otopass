import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/ui";
import { isLocalDataMode } from "@/lib/data-mode";
import { TrackingClient } from "./TrackingClient";

export const metadata: Metadata = {
  title: "Başvuru takibi | otoköprü",
  description: "Başvuru durumunuzu referans ve size verilen takip anahtarıyla görüntüleyin.",
  robots: { index: false, follow: false },
};

export default function TrackingPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
  const available = !isLocalDataMode();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-9">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="otoköprü ana sayfası"><BrandLogo size="compact" preload /></Link>
        <ThemeToggle compact />
      </header>

      <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
            <ShieldCheck size={14} /> Güvenli başvuru takibi
          </span>
          <h1 className="mt-6 max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Başvurunuz hangi aşamada?</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--text-secondary)]">
            Başvuru referansınızı ve başvurunuz tamamlandığında verilen takip anahtarını girin. Durumunuzu güvenle görüntüleyin.
          </p>
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-4 text-sm text-[var(--text-secondary)]">
            <LockKeyhole className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} />
            <p>Referans kodu tek başına erişim sağlamaz. Takip anahtarınızı kimseyle paylaşmayın; kaybederseniz galerinizden yeni anahtar isteyin.</p>
          </div>
          <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <ArrowLeft size={16} /> Ana sayfaya dön
          </Link>
        </section>
        <TrackingClient available={available} siteKey={siteKey} />
      </div>
    </main>
  );
}
