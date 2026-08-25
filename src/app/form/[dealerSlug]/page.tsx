import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BadgeCheck, Check, Clock3, Mail, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { DealerLogo } from "@/components/dealer-logo";
import { SocialLinkIcon } from "@/components/social-link-icon";
import { ThemeToggle } from "@/components/ui";
import { isLocalDataMode } from "@/lib/data-mode";
import { getDealerLogoSrc } from "@/lib/dealer-branding";
import { getWhatsAppUrl } from "@/lib/phone";
import { getDealerSocialLinks, getSocialLinkLabel } from "@/lib/social-links";
import { getDealerBySlug } from "@/lib/supabase/queries";
import { FormClient } from "./FormClient";
import styles from "./form.module.css";

type PageProps = {
  params: Promise<{ dealerSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const dealer = await getDealerBySlug(dealerSlug);
  const title = dealer ? `${dealer.name} | Araç başvurusu` : "Araç başvurusu";
  const description = dealer
    ? `Araç bilgilerinizi ve fotoğraflarınızı ön değerlendirme için doğrudan ${dealer.name} ekibine iletin.`
    : "Araç bilgilerinizi ve fotoğraflarınızı ön değerlendirme için doğrudan galeriye iletin.";

  return {
    title,
    description,
    alternates: { canonical: `/form/${encodeURIComponent(dealerSlug)}` },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "tr_TR",
      url: `/form/${encodeURIComponent(dealerSlug)}`,
      siteName: dealer?.name ?? "otoköprü",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
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
    <div className={`${styles.page} intake-page`}>
      <header className="intake-topbar">
        <div className="intake-shell intake-topbar-inner">
          <DealerLogo dealerName={dealer.name} logoSrc={getDealerLogoSrc(dealer)} priority />
          <div className="intake-dealer-identity">
            <span>Araç ön değerlendirme</span>
            <strong>{dealer.name}</strong>
          </div>
          <div className="intake-topbar-actions">
            <span>Başvuru alanı</span>
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      <section className="intake-shell intake-intro" aria-labelledby="intake-page-title">
        <div className="intake-intro-copy">
          <p className="intake-eyebrow"><BadgeCheck size={15} aria-hidden="true" /> {dealer.name} için araç başvurusu</p>
          <h1 id="intake-page-title">Aracınızı değerlendirmeye gönderin.</h1>
          <p>Araç ve iletişim bilgilerinizi paylaşın. {dealer.name} ekibi inceleme sonrasında sizinle doğrudan iletişime geçer.</p>
        </div>
        <ul className="intake-trust-list" aria-label="Başvuru avantajları">
          <li><Check size={14} aria-hidden="true" /> 3 kısa adım</li>
          <li><ShieldCheck size={14} aria-hidden="true" /> Güvenli bağlantı</li>
          <li><BadgeCheck size={14} aria-hidden="true" /> Doğrudan galeriye iletim</li>
        </ul>
      </section>

      <div className="intake-shell intake-layout">
        <main className="intake-form-panel panel">
          <header className="intake-heading">
            <div>
              <p className="intake-heading-eyebrow">Başvuru kaydı</p>
              <h2>Başvuru bilgileri</h2>
              <p>Ön değerlendirme için gerekli bilgileri üç adımda tamamlayın.</p>
            </div>
            <span className="intake-time"><Clock3 size={15} aria-hidden="true" /> Yaklaşık 3 dk.</span>
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
            <span className="intake-aside-kicker"><BadgeCheck size={15} aria-hidden="true" /> Galeri bilgileri</span>
            <h2>{dealer.name}</h2>
            <p>Gönderdiğiniz bilgiler doğrudan bu galerinin yetkili ekibine iletilir.</p>
          </header>

          <div className="intake-response-time"><Clock3 size={16} aria-hidden="true" /><span><small>Süreç</small><strong>İnceleme sonrası geri dönüş</strong></span></div>

          <section className="intake-aside-flow" aria-label="Başvuru akışı">
            <span>Başvuru akışı</span>
            <strong>Bilgileriniz inceleme kuyruğuna kaydedilir.</strong>
            <p>Teklif veya ek bilgi ihtiyacı olduğunda galeri ekibi paylaştığınız numaradan size ulaşır.</p>
          </section>

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
