import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BadgeCheck, Camera, Check, ClipboardCheck, Clock3, Mail, MessageCircle, PhoneCall, ShieldCheck, UserRound } from "lucide-react";
import { DealerLogo } from "@/components/dealer-logo";
import { SocialLinkIcon } from "@/components/social-link-icon";
import { ThemeToggle } from "@/components/ui";
import { isLocalDataMode } from "@/lib/data-mode";
import { getDealerLogoSrc } from "@/lib/dealer-branding";
import { getWhatsAppUrl } from "@/lib/phone";
import { getDealerSocialLinks, getSocialLinkLabel } from "@/lib/social-links";
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
    title: dealer ? `${dealer.name} | Araç başvurusu` : "Araç başvurusu",
    description: "Araç bilgilerinizi ve fotoğraflarınızı ön değerlendirme için doğrudan galeriye iletin.",
  };
}

export default async function DealerPublicFormPage({ params }: PageProps) {
  const { dealerSlug } = await params;
  const [dealer, requestHeaders] = await Promise.all([getDealerBySlug(dealerSlug), headers()]);

  if (!dealer) {
    notFound();
  }

  const socialLinks = getDealerSocialLinks(dealer);
  const contactWhatsAppUrl = getWhatsAppUrl(dealer.contact_phone);
  const hasContactInfo = Boolean(
    dealer.contact_name || dealer.contact_phone || dealer.contact_email || socialLinks.length > 0
  );

  return (
    <div className="intake-page">
      <header className="intake-topbar">
        <div className="intake-shell intake-topbar-inner">
          <DealerLogo dealerName={dealer.name} logoSrc={getDealerLogoSrc(dealer)} priority />
          <div className="intake-dealer-identity">
            <span>Araç ön değerlendirme</span>
            <strong>{dealer.name}</strong>
          </div>
          <ThemeToggle compact className="ml-auto shrink-0" />
        </div>
      </header>

      <section className="intake-shell intake-intro" aria-labelledby="intake-page-title">
        <div className="intake-intro-copy">
          <p className="section-label">{dealer.name} araç başvurusu</p>
          <h1 id="intake-page-title">Aracınızı üç kısa adımda ön değerlendirmeye gönderin</h1>
          <p>Araç ve iletişim bilgilerinizi paylaşın; {dealer.name} ekibi başvurunuzu inceledikten sonra sizinle iletişime geçsin.</p>
        </div>
        <ul className="intake-trust-list" aria-label="Başvuru avantajları">
          <li><Check size={14} aria-hidden="true" /> Bağlayıcı olmayan ön değerlendirme</li>
          <li><ShieldCheck size={14} aria-hidden="true" /> Güvenli veri aktarımı</li>
          <li><BadgeCheck size={14} aria-hidden="true" /> Doğrudan galeriye iletim</li>
        </ul>
      </section>

      <div className="intake-shell intake-layout">
        <main className="intake-form-panel panel">
          <header className="intake-heading">
            <div>
              <p className="section-label">Araç başvuru formu</p>
              <h2>Başvurunuzu oluşturun</h2>
              <p>Her adımda ön değerlendirme için gerekli bilgileri paylaşın.</p>
            </div>
            <span className="intake-time"><Clock3 size={15} aria-hidden="true" /> 3 kısa adım</span>
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
            <span className="intake-aside-kicker"><BadgeCheck size={15} aria-hidden="true" /> Başvurunun gönderileceği galeri</span>
            <h2>{dealer.name}</h2>
            <p>Gönderdiğiniz bilgiler doğrudan bu galerinin yetkili ekibine iletilir.</p>
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

          {hasContactInfo ? (
            <section className="intake-contact-card" aria-labelledby="dealer-contact-title">
              <div className="intake-contact-heading">
                <span className="intake-contact-avatar"><UserRound size={18} aria-hidden="true" /></span>
                <div>
                  <small>Galeri yetkilisi</small>
                  <strong id="dealer-contact-title">{dealer.contact_name || `${dealer.name} ekibi`}</strong>
                </div>
              </div>
              <p className="intake-contact-copy">Teklif sürecinizle ilgili doğrudan iletişim kurabilirsiniz.</p>
              <div className="intake-contact-actions" aria-label="Galeri iletişim seçenekleri">
                {dealer.contact_phone && contactWhatsAppUrl ? (
                  <a className="intake-contact-action is-whatsapp" href={contactWhatsAppUrl} target="_blank" rel="noopener noreferrer">
                    <span className="intake-contact-action-icon"><MessageCircle size={17} aria-hidden="true" /></span>
                    <span className="intake-contact-action-copy">
                      <small>WhatsApp</small>
                      <strong dir="ltr">{dealer.contact_phone}</strong>
                    </span>
                  </a>
                ) : null}
                {dealer.contact_email ? (
                  <a className="intake-contact-action" href={`mailto:${dealer.contact_email}`}>
                    <span className="intake-contact-action-icon"><Mail size={17} aria-hidden="true" /></span>
                    <span className="intake-contact-action-copy">
                      <small>E-posta</small>
                      <strong>{dealer.contact_email}</strong>
                    </span>
                  </a>
                ) : null}
              </div>
              {socialLinks.length > 0 ? (
                <div className="intake-social-block">
                  <span>Sosyal medya</span>
                  <div className="dealer-public-socials">
                    {socialLinks.map((link, index) => {
                      const label = getSocialLinkLabel(link);
                      return (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${dealer.name} ${label} bağlantısını aç`}
                          key={`${link.platform}-${link.url}-${index}`}
                        >
                          <SocialLinkIcon platform={link.platform} size={14} />
                          {label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

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
