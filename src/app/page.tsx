import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CarFront,
  ChartNoAxesCombined,
  Check,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Gauge,
  HandCoins,
  Link2,
  Route,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingMotion } from "@/components/landing/landing-motion";

const journeys = [
  {
    title: "Başvuru topla",
    description: "Araç, müşteri ve fotoğraf bilgilerini tek bağlantıda eksiksiz alın.",
    href: "#nasil-calisir",
    icon: FileCheck2,
  },
  {
    title: "Teklif sürecini yönet",
    description: "Atanan araçları inceleyin, teklif verin ve sonucu güncelleyin.",
    href: "#faydalar",
    icon: HandCoins,
  },
  {
    title: "Yönetim alanına geç",
    description: "Galerileri, kullanıcıları ve işlem geçmişini yetkiniz kapsamında yönetin.",
    href: "/login",
    icon: Gauge,
  },
];

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const benefits = [
  {
    id: "fayda-basvuru",
    title: "Tek linkle düzenli başvuru",
    description: "Müşteri, kendisine gösterilen adımları takip eder; ekip aynı araç için farklı mesaj ve dosyaları birleştirmek zorunda kalmaz.",
    icon: Link2,
    visual: "intake",
    kicker: "Başvuru kanalı",
  },
  {
    id: "fayda-teklif",
    title: "Teklif kararını hızlandırın",
    description: "Araç detayları, ekspertiz notları, görseller ve teklif alanı aynı çalışma yüzeyinde buluşur.",
    icon: ClipboardCheck,
    visual: "offer",
    kicker: "Karar ekranı",
  },
  {
    id: "fayda-kontrol",
    title: "Her rol için doğru görünüm",
    description: "Yönetici, galeri yöneticisi ve görüntüleyici yalnızca görevini tamamlamak için gereken ekran ve işlemlere ulaşır.",
    icon: ShieldCheck,
    visual: "access",
    kicker: "Erişim kontrolü",
  },
];

const workflow = [
  { step: "01", title: "Bilgileri alın", description: "Müşteri araç ve iletişim bilgilerini fotoğraflarla birlikte gönderir.", icon: CarFront },
  { step: "02", title: "Değerlendirin", description: "Galeri ekibi atanan kaydı tek ekrandan inceler ve fiyatlandırır.", icon: Building2 },
  { step: "03", title: "Sonuçlandırın", description: "Teklif ve satın alma durumu kayda işlenir, süreç görünür kalır.", icon: BadgeCheck },
];

const roles = [
  { role: "Müşteri", title: "Kolay başvuru", text: "Gereken bilgileri adım adım iletir, eksik alanlarla uğraşmaz.", icon: UserRoundCheck, metric: "Tek form" },
  { role: "Galeri", title: "Odaklı iş listesi", text: "Atanan araçları, teklifleri ve bekleyen işleri tek sırada yönetir.", icon: Building2, metric: "Net kuyruk" },
  { role: "Yönetici", title: "Merkezi kontrol", text: "Galeri, kullanıcı ve erişim rollerini tek yönetim alanında tutar.", icon: ChartNoAxesCombined, metric: "Tam görünürlük" },
];

const experience = [
  { title: "Kesintisiz başvuru", text: "Müşteriler günün her saatinde araç bilgisini iletebilir.", icon: Clock3 },
  { title: "İzlenebilir süreç", text: "Her araç için güncel durum ve son teklif aynı kayıtta kalır.", icon: Route },
  { title: "Güvenli erişim", text: "Rol sınırları sunucu tarafında doğrulanır.", icon: ShieldCheck },
  { title: "Ekip uyumu", text: "Herkes aynı operasyon verisi üzerinden çalışır.", icon: Users },
];

function BenefitVisual({ type }: { type: string }) {
  if (type === "intake") {
    return (
      <div className="vc-benefit-visual vc-intake-visual" aria-hidden="true">
        <div className="vc-mini-form">
          <span><i />Araç bilgileri</span><span><i />Müşteri bilgileri</span><span><i />Fotoğraflar</span>
          <strong><Check size={14} /> Başvuru hazır</strong>
        </div>
      </div>
    );
  }
  if (type === "offer") {
    return (
      <div className="vc-benefit-visual vc-offer-visual" aria-hidden="true">
        <div className="vc-offer-car"><CarFront size={28} /><span><strong>2022 Renault Clio</strong><small>Ekspertiz tamamlandı</small></span></div>
        <div className="vc-offer-line"><span>Teklif</span><strong>₺945.000</strong></div>
        <div className="vc-offer-progress"><i /></div>
      </div>
    );
  }
  return (
    <div className="vc-benefit-visual vc-access-visual" aria-hidden="true">
      <div><span><ShieldCheck size={17} /></span><p><strong>Yönetici</strong><small>Tam kontrol</small></p><Check size={15} /></div>
      <div><span><Building2 size={17} /></span><p><strong>Galeri</strong><small>Operasyon erişimi</small></p><Check size={15} /></div>
      <div><span><Users size={17} /></span><p><strong>Görüntüleyici</strong><small>Salt okunur</small></p><Check size={15} /></div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="vc-root">
      <link rel="preload" as="image" href="/images/otopass-hero-inspection.jpg" />
      <LandingMotion />
      <a className="vc-skip-link" href="#ana-icerik">Ana içeriğe geç</a>
      <LandingHeader />

      <main id="ana-icerik">
        <section className="vc-hero">
          <div className="vc-container vc-hero-inner">
            <div className="vc-hero-copy">
              <span className="vc-hero-kicker"><Sparkles size={15} /> Araç başvurusu ve teklif yönetimi</span>
              <h1>Araç başvurularını ve teklif sürecini <span>tek akışta yönetin</span></h1>
              <p>otoköprü ile araç, müşteri, ekspertiz ve fotoğraf bilgilerini düzenli biçimde toplayın; teklif kararlarını aynı çalışma alanından yönetin.</p>
              <div className="vc-hero-cta-row">
                <Link href="/login" className="vc-primary-cta">Panele giriş yap <ArrowRight size={17} /></Link>
                <a href="#faydalar" className="vc-text-cta">Faydaları incele <ArrowRight size={16} /></a>
              </div>
            </div>

            <div className="vc-journey-wrap">
              <p>Platformu keşfedin</p>
              <div className="vc-journey-grid">
                {journeys.map(({ title, description, href, icon: Icon }, index) => (
                  <Link href={href} className="vc-journey-card" key={title} style={{ "--vc-order": index } as React.CSSProperties}>
                    <span className="vc-journey-icon"><Icon size={23} /></span>
                    <span><strong>{title}</strong><small>{description}</small></span>
                    <ArrowRight className="vc-card-arrow" size={17} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="vc-proof" id="guven">
          <div className="vc-container vc-proof-inner">
            <div className="vc-proof-heading"><strong>Tutarlı işleyiş</strong><span>Her başvuruda aynı veri düzeni</span></div>
            <div className="vc-proof-item"><FileCheck2 size={25} /><span><strong>Eksiksiz veri</strong><small>Yönlendirilmiş form yapısı</small></span></div>
            <div className="vc-proof-item"><ShieldCheck size={25} /><span><strong>Rol bazlı erişim</strong><small>Yetkiye uygun çalışma alanı</small></span></div>
            <div className="vc-proof-item"><Route size={25} /><span><strong>Güncel durum</strong><small>Tek kayıtta süreç takibi</small></span></div>
          </div>
        </section>

        <section className="vc-explainer" data-reveal>
          <div className="vc-container vc-centered-heading">
            <h2>Dijital araç alım operasyonu nedir?</h2>
            <p>Müşteri başvurusundan galeri teklifine kadar tüm bilgilerin, görevlerin ve kararların tek sistemde yönetildiği standart çalışma modelidir.</p>
            <div className="vc-orbit-flow" aria-label="Başvurudan sonuca süreç">
              <span><FileCheck2 size={20} /><small>Başvuru</small></span><i />
              <span><ClipboardCheck size={20} /><small>İnceleme</small></span><i />
              <span><HandCoins size={20} /><small>Teklif</small></span><i />
              <span><BadgeCheck size={20} /><small>Sonuç</small></span>
            </div>
          </div>
        </section>

        <section className="vc-section vc-benefits-section" id="faydalar">
          <div className="vc-container">
            <div className="vc-centered-heading" data-reveal>
              <span className="vc-section-kicker">Sistem faydaları</span>
              <h2>Günlük iş akışını sadeleştiren araçlar</h2>
              <p>Daha az manuel takip, daha hızlı inceleme ve ekip genelinde ortak bir çalışma düzeni.</p>
            </div>

            <div className="vc-benefit-grid">
              {benefits.map(({ id, title, description, icon: Icon, visual, kicker }) => (
                <article className="vc-benefit-card" id={id} key={id} data-reveal>
                  <BenefitVisual type={visual} />
                  <div className="vc-benefit-copy">
                    <span className="vc-benefit-kicker"><Icon size={15} /> {kicker}</span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                    <a href="#nasil-calisir">Akışı incele <ArrowRight size={15} /></a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="vc-section vc-workflow-section" id="nasil-calisir">
          <div className="vc-container">
            <div className="vc-centered-heading" data-reveal>
              <span className="vc-section-kicker">Nasıl çalışır?</span>
              <h2>Başvurudan sonuca üç adım</h2>
              <p>Bilgiyi toplayın, kararı verin, sonucu kaydedin.</p>
            </div>
            <ol className="vc-workflow">
              {workflow.map(({ step, title, description, icon: Icon }, index) => (
                <li key={step} data-reveal style={{ "--vc-order": index } as React.CSSProperties}>
                  <span className="vc-workflow-icon"><Icon size={24} /></span>
                  <small>{step}</small><h3>{title}</h3><p>{description}</p>
                  {index < workflow.length - 1 ? <ArrowRight className="vc-workflow-arrow" size={20} /> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="vc-section vc-role-section" id="roller">
          <div className="vc-container">
            <div className="vc-centered-heading" data-reveal>
              <span className="vc-section-kicker">Her rolün gözünden</span>
              <h2>Doğru kişiye doğru çalışma alanı</h2>
              <p>Tek veri akışı, her kullanıcı için sadeleştirilmiş bir deneyime dönüşür.</p>
            </div>
            <div className="vc-role-grid" tabIndex={0} aria-label="Kullanıcı rollerini yatay kaydırarak inceleyin">
              {roles.map(({ role, title, text, icon: Icon, metric }) => (
                <article className="vc-role-card" key={role} data-reveal>
                  <div className="vc-role-visual"><Icon size={38} /><span>{metric}</span></div>
                  <div><small>{role}</small><h3>{title}</h3><p>{text}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="vc-assist" data-reveal>
          <div className="vc-container vc-assist-inner">
            <div><span>Çalışma alanınıza geçin</span><p>Yetkili hesabınızla giriş yapın; başvuruları ve teklif süreçlerini kaldığınız yerden yönetin.</p></div>
            <Link href="/login">Giriş yap <ArrowRight size={16} /></Link>
          </div>
        </section>

        <section className="vc-section vc-experience">
          <div className="vc-container">
            <div className="vc-centered-heading" data-reveal>
              <span className="vc-section-kicker">otoköprü deneyimi</span>
              <h2>Ekibin çalışma hızına uyum sağlayan kontrol</h2>
              <p>Başvuru inceleme ve teklif yönetimi için gereken temel araçlar bir arada.</p>
            </div>
            <div className="vc-experience-grid">
              {experience.map(({ title, text, icon: Icon }) => (
                <article key={title} data-reveal><span><Icon size={21} /></span><h3>{title}</h3><p>{text}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="vc-final-cta">
          <div className="vc-container vc-final-cta-inner" data-reveal>
            <div><span>Tek akış. Net kontrol.</span><h2>Araç başvurularını düzenli bir iş akışına taşıyın.</h2></div>
            <Link href="/login" className="vc-primary-cta">Panele giriş yap <ArrowRight size={17} /></Link>
          </div>
        </section>
      </main>

      <footer className="vc-footer">
        <div className="vc-container vc-footer-grid">
          <div><Link href="/" className="vc-brand" aria-label="otoköprü ana sayfa"><BrandLogo size="navigation" /></Link><p>Başvurudan teklife daha düzenli bir çalışma alanı.</p></div>
          <div><strong>Platform</strong><a href="#faydalar">Sistem faydaları</a><a href="#nasil-calisir">Nasıl çalışır?</a><a href="#roller">Kimler için?</a></div>
          <div><strong>Erişim</strong><Link href="/login">Panel girişi</Link><a href="#guven">Güvenlik yaklaşımı</a><Link href="/terms">Kullanım koşulları</Link></div>
          <div><strong>İletişim</strong><a href="https://www.otokopru.com">www.otokopru.com</a><a href="mailto:info@otokopru.com">info@otokopru.com</a><a href="tel:+905536845821" dir="ltr">+90 553 684 58 21</a></div>
        </div>
        <div className="vc-container vc-footer-bottom"><span>© {new Date().getFullYear()} otoköprü</span><span>Araç alım operasyon platformu</span></div>
      </footer>
    </div>
  );
}
