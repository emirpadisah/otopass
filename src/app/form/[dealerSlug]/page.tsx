import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/ui";
import { isLocalDataMode } from "@/lib/data-mode";
import { getDealerBySlug } from "@/lib/supabase/queries";
import { FormClient } from "./FormClient";

type PageProps = {
  params: Promise<{ dealerSlug: string }>;
};

const points = [
  {
    title: "Başvurunuzu gönderin",
    description: "Araç ve iletişim bilgileriniz güvenli biçimde kaydedilir.",
    icon: Clock3,
  },
  {
    title: "Galeri incelesin",
    description: "Yetkili ekip aracınızı ve varsa fotoğrafları değerlendirir.",
    icon: ShieldCheck,
  },
  {
    title: "Geri dönüş alın",
    description: "Teklif süreci paylaştığınız iletişim bilgileriyle ilerler.",
    icon: CheckCircle2,
  },
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const dealer = await getDealerBySlug(dealerSlug);

  return {
    title: dealer ? `${dealer.name} Araç Başvurusu | POL-CAR` : "Araç Başvurusu | POL-CAR",
    description: "Araç bilgilerinizi güvenli form üzerinden galeri değerlendirmesine gönderin.",
  };
}

export default async function DealerPublicFormPage({ params }: PageProps) {
  const { dealerSlug } = await params;
  const dealer = await getDealerBySlug(dealerSlug);

  if (!dealer) {
    notFound();
  }

  return (
    <div className="intake-page">
      <header className="intake-topbar">
        <div className="intake-shell intake-topbar-inner">
          <BrandLogo size="compact" preload />
          <div className="intake-dealer-identity">
            <span>Yetkili araç başvurusu</span>
            <strong>{dealer.name}</strong>
          </div>
          <ThemeToggle compact className="ml-auto shrink-0" />
        </div>
      </header>

      <div className="intake-shell intake-layout">
        <main className="intake-form-panel panel">
          <header className="intake-heading">
            <div>
              <p className="section-label">Araç ön değerlendirme</p>
              <h1>Aracınız için teklif talebi oluşturun</h1>
              <p>Temel bilgileri paylaşın; {dealer.name} ekibi aracınızı inceleyip sizinle iletişime geçsin.</p>
            </div>
            <span className="intake-time"><Clock3 size={15} aria-hidden="true" /> Birkaç dakika</span>
          </header>

          <FormClient
            dealerSlug={dealerSlug}
            localMode={isLocalDataMode()}
            turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null}
          />
        </main>

        <aside className="intake-aside glass-highlight">
          <div>
            <p className="section-label">Sonraki adımlar</p>
            <h2>Başvurunuz nasıl ilerler?</h2>
            <p>Gönderimden sonra süreç doğrudan galeri ekibine aktarılır.</p>
          </div>

          <ol className="intake-process">
            {points.map(({ title, description, icon: Icon }, index) => (
              <li key={title}>
                <span className="intake-process-icon"><Icon size={16} aria-hidden="true" /></span>
                <div>
                  <small>0{index + 1}</small>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="intake-security-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <div>
              <strong>Güvenli veri aktarımı</strong>
              <p>Bilgileriniz yalnızca başvurunun değerlendirilmesi amacıyla kullanılır.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
