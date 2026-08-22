import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BadgeCheck, Camera, Check, ClipboardCheck, Clock3, PhoneCall, ShieldCheck } from "lucide-react";
import { DealerLogo } from "@/components/dealer-logo";
import { ThemeToggle } from "@/components/ui";
import { isLocalDataMode } from "@/lib/data-mode";
import { getDealerLogoSrc } from "@/lib/dealer-branding";
import { getDealerBySlug } from "@/lib/supabase/queries";
import { FormClient } from "./FormClient";

type PageProps = {
  params: Promise<{ dealerSlug: string }>;
};

const points = [
  {
    title: "Bilgileri paylaşın",
    description: "İletişim, araç ve kondisyon bilgilerini üç kısa adımda tamamlayın.",
    icon: ClipboardCheck,
  },
  {
    title: "Fotoğrafları ekleyin",
    description: "Net fotoğraflar daha hızlı ve isabetli bir ön değerlendirme sağlar.",
    icon: Camera,
  },
  {
    title: "Geri dönüş alın",
    description: "Galeri ekibi inceleme sonrasında sizinle doğrudan iletişim kurar.",
    icon: PhoneCall,
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
  const [dealer, requestHeaders] = await Promise.all([getDealerBySlug(dealerSlug), headers()]);

  if (!dealer) {
    notFound();
  }

  return (
    <div className="intake-page">
      <header className="intake-topbar">
        <div className="intake-shell intake-topbar-inner">
          <DealerLogo dealerName={dealer.name} logoSrc={getDealerLogoSrc(dealer)} priority />
          <div className="intake-dealer-identity">
            <span>Yetkili araç başvurusu</span>
            <strong>{dealer.name}</strong>
          </div>
          <ThemeToggle compact className="ml-auto shrink-0" />
        </div>
      </header>

      <section className="intake-shell intake-intro" aria-labelledby="intake-page-title">
        <div className="intake-intro-copy">
          <p className="section-label">POL-CAR araç değerlendirme</p>
          <h1 id="intake-page-title">Aracınızı 3 kısa adımda değerlendirmeye gönderin.</h1>
          <p>Temel bilgileri paylaşın; {dealer.name} ekibi aracınızı inceleyip teklif süreci için sizinle iletişime geçsin.</p>
        </div>
        <ul className="intake-trust-list" aria-label="Başvuru avantajları">
          <li><Check size={14} aria-hidden="true" /> Ücretsiz ön değerlendirme</li>
          <li><ShieldCheck size={14} aria-hidden="true" /> Güvenli veri aktarımı</li>
          <li><BadgeCheck size={14} aria-hidden="true" /> Satış zorunluluğu yok</li>
        </ul>
      </section>

      <div className="intake-shell intake-layout">
        <main className="intake-form-panel panel">
          <header className="intake-heading">
            <div>
              <p className="section-label">Güvenli başvuru formu</p>
              <h2>Teklif talebinizi oluşturun</h2>
              <p>Her adımda yalnızca değerlendirme için gerekli bilgileri isteyeceğiz.</p>
            </div>
            <span className="intake-time"><Clock3 size={15} aria-hidden="true" /> Yaklaşık 3 dakika</span>
          </header>

          <FormClient
            dealerSlug={dealerSlug}
            customDomain={Boolean(requestHeaders.get("x-custom-domain"))}
            localMode={isLocalDataMode()}
            turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null}
          />
        </main>

        <aside className="intake-aside glass-highlight">
          <header>
            <span className="intake-aside-kicker"><BadgeCheck size={15} aria-hidden="true" /> Yetkili değerlendirme noktası</span>
            <h2>{dealer.name}</h2>
            <p>Başvurunuz doğrudan bu galeri ekibinin değerlendirme ekranına iletilir.</p>
          </header>

          <div className="intake-response-time"><Clock3 size={16} aria-hidden="true" /><span><small>Süreç</small><strong>İnceleme sonrası geri dönüş</strong></span></div>

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
              <strong>Verileriniz kontrol altında</strong>
              <p>Bilgileriniz yalnızca araç başvurusunun değerlendirilmesi amacıyla kullanılır.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
