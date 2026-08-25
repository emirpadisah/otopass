"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  BadgeTurkishLira,
  Building2,
  Check,
  ClipboardCheck,
  FileCheck2,
  Images,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  ScanSearch,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { VehicleConditionMap } from "@/components/ui/vehicle-condition-map";
import type { VehicleBodyCondition } from "@/lib/vehicle-condition";
import styles from "./cocoon-landing.module.css";

const contactPhone = "+90 553 684 58 21";
const contactEmail = "info@otokopru.com";

const navigation = [
  { href: "#hakkimizda", label: "Hakkımızda" },
  { href: "#ozellikler", label: "Sistem" },
  { href: "#surec", label: "Süreç" },
  { href: "#fiyatlandirma", label: "Fiyatlandırma" },
  { href: "#iletisim", label: "İletişim" },
];

const platformMarks: Array<{ icon: LucideIcon; label: string }> = [
  { icon: FileCheck2, label: "Başvuru" },
  { icon: ScanSearch, label: "Ekspertiz" },
  { icon: Images, label: "Fotoğraf" },
  { icon: BadgeTurkishLira, label: "Teklif" },
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: Building2, label: "Galeri profili" },
];

const timeline = [
  {
    step: "04",
    title: "Kararı kaydedin",
    detail: "Kabul, ret ve satın alma sonucunu aynı kayıt üzerinde tamamlayın.",
  },
  {
    step: "03",
    title: "Teklifinizi paylaşın",
    detail: "Galeri logonuzla hazırlanan teklif görselini indirin ve müşteriye iletin.",
  },
  {
    step: "02",
    title: "Aracı değerlendirin",
    detail: "Araç bilgilerini, kaporta şemasını ve fotoğrafları tek ekranda inceleyin.",
  },
  {
    step: "01",
    title: "Bağlantınızı gönderin",
    detail: "Müşteri, galerinize özel başvuru sayfasını telefondan birkaç adımda tamamlasın.",
  },
];

const sharedPlanFeatures = [
  "Sınırsız araç başvurusu",
  "Ekspertiz ve fotoğraf yönetimi",
  "Teklif görseli oluşturma",
  "WhatsApp iletişim akışı",
  "Ekip ve yetki yönetimi",
  "Galeriye özel marka görünümü",
];

const landingInspectionCondition: VehicleBodyCondition = {
  hood: "local_paint",
  left_front_door: "painted",
  right_rear_fender: "replaced",
  trunk: "painted",
};

function ProductActivityCard() {
  return (
    <div className={styles.productCard} aria-label="Son başvurular önizlemesi">
      <div className={styles.productCardHeader}>
        <span>Son başvurular</span>
        <small>Canlı</small>
      </div>
      <div className={styles.activityList}>
        {[
          ["Audi A7", "Yeni başvuru", "Şimdi", "new"],
          ["Volkswagen Passat", "Ekspertiz tamamlandı", "8 dk", "ready"],
          ["Mercedes E180", "Teklif hazır", "21 dk", "offer"],
          ["BMW 320i", "Müşteriye ulaşıldı", "35 dk", "contact"],
        ].map(([vehicle, status, time, tone]) => (
          <div className={styles.activityItem} key={vehicle}>
            <span className={styles.activityIcon} data-tone={tone} />
            <span><strong>{vehicle}</strong><small>{status}</small></span>
            <time>{time}</time>
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectionCard() {
  return (
    <div className={`${styles.productCard} ${styles.inspectionProductCard}`} aria-label="Ekspertiz özeti önizlemesi">
      <div className={styles.productCardHeader}>
        <span>Kaporta durumu</span>
        <small className={styles.healthy}>13 parça</small>
      </div>
      <div className={styles.inspectionPreview}>
        <VehicleConditionMap value={landingInspectionCondition} readOnly compact captureMode />
      </div>
    </div>
  );
}

function OfferCard() {
  return (
    <div className={styles.productCard} aria-label="Teklif özeti önizlemesi">
      <div className={styles.productCardHeader}>
        <span>Ön değerlendirme</span>
        <small>Hazır</small>
      </div>
      <div className={styles.offerPreview}>
        <small>Volkswagen Passat · 2022</small>
        <strong>₺1.200.000</strong>
        <div className={styles.offerMeta}>
          <span><small>Kilometre</small><b>55.000 km</b></span>
          <span><small>Yakıt</small><b>Dizel</b></span>
          <span><small>Vites</small><b>Otomatik</b></span>
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ image, children, alt }: { image: string; children: React.ReactNode; alt: string }) {
  return (
    <div className={styles.featureVisual} data-fade-bg>
      <Image className={styles.featureImage} data-fade-image src={image} alt={alt} fill sizes="(max-width: 1024px) 100vw, 512px" />
      <div className={styles.featureShade} />
      <div className={styles.featureProduct}>{children}</div>
    </div>
  );
}

function PricingCard({ annual }: { annual: boolean }) {
  return (
    <article className={`${styles.priceCard} ${annual ? styles.priceCardAnnual : ""}`} data-testid="pricing-card">
      <div className={styles.priceCardTop}>
        <p>{annual ? "Yıllık" : "Aylık"}</p>
        <div className={styles.price}>
          <strong>{annual ? "₺50.000" : "₺5.000"}</strong>
          <span>+ KDV / {annual ? "yıl" : "ay"}</span>
        </div>
        <p className={styles.priceDescription}>
          {annual
            ? "Yıl boyunca sabit maliyetle markanıza özel çalışma alanı."
            : "Taahhütsüz başlayın ve araç alım operasyonunuzu hemen düzenleyin."}
        </p>
      </div>
      <div className={styles.priceCardBottom}>
        <ul>
          {sharedPlanFeatures.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}
          {annual && <li><Check size={16} />Kendi özel domaininizi bağlama</li>}
        </ul>
        <a href="#iletisim" className={styles.outlineButton}>Bilgi alın</a>
      </div>
    </article>
  );
}

function CocoonRings() {
  return (
    <svg className={styles.rings} viewBox="0 0 370 220" role="img" aria-label="Birbirine bağlı iki süreç halkası">
      <defs>
        <linearGradient id="cocoon-ring-one" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity=".9" />
          <stop offset="50%" stopColor="white" stopOpacity=".08" />
          <stop offset="100%" stopColor="white" stopOpacity=".9" />
        </linearGradient>
        <linearGradient id="cocoon-ring-two" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity=".9" />
          <stop offset="50%" stopColor="white" stopOpacity=".08" />
          <stop offset="100%" stopColor="white" stopOpacity=".9" />
        </linearGradient>
        <pattern id="cocoon-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="white" strokeWidth=".5" opacity=".16" />
        </pattern>
        <clipPath id="cocoon-clip"><circle cx="260" cy="110" r="95" /></clipPath>
      </defs>
      <circle cx="110" cy="110" r="95" fill="url(#cocoon-hatch)" clipPath="url(#cocoon-clip)" />
      <g className={styles.ringOne}>
        <circle cx="110" cy="110" r="95" stroke="url(#cocoon-ring-one)" strokeWidth=".75" fill="none" />
        <g className={styles.ringKnob}><circle cx="110" cy="15" r="4" fill="white" opacity=".18" /><circle cx="110" cy="15" r="1.5" fill="white" /></g>
      </g>
      <g className={styles.ringTwo}>
        <circle cx="260" cy="110" r="95" stroke="url(#cocoon-ring-two)" strokeWidth=".75" fill="none" />
        <g className={styles.ringKnob}><circle cx="260" cy="205" r="4" fill="white" opacity=".18" /><circle cx="260" cy="205" r="1.5" fill="white" /></g>
      </g>
    </svg>
  );
}

export function CocoonLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [formStatus, setFormStatus] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const animated = Array.from(document.querySelectorAll<HTMLElement>("[data-animate]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      animated.forEach((element) => element.classList.add(styles.visible));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(styles.visible);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    animated.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const expandable = Array.from(document.querySelectorAll<HTMLElement>("[data-expand]"));
    const fading = Array.from(document.querySelectorAll<HTMLElement>("[data-fade-bg]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      expandable.forEach((wrap) => {
        const start = Math.max(0, wrap.offsetTop - viewportHeight);
        const range = Math.max(1, wrap.offsetTop - start);
        const progress = Math.min(1, Math.max(0, (scrollY - start) / range));
        wrap.style.maxWidth = `${1152 + (viewportWidth - 1152) * progress}px`;
        wrap.style.setProperty("--expand-radius", `${(1 - progress) * 16}px`);
      });
      fading.forEach((box) => {
        const rect = box.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / Math.max(1, rect.height)));
        const image = box.querySelector<HTMLElement>("[data-fade-image]");
        if (image) image.style.opacity = String(0.12 + progress * 0.88);
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const firstLink = menuRef.current?.querySelector<HTMLAnchorElement>("a");
    firstLink?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const scrollToSection = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;
    event.preventDefault();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.history.pushState(null, "", href);
  };

  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (String(data.get("company") || "")) return;
    const message = [
      "Merhaba, OtoKöprü hakkında bilgi almak istiyorum.",
      `Ad soyad: ${String(data.get("name") || "")}`,
      `İletişim: ${String(data.get("contact") || "")}`,
      `Mesaj: ${String(data.get("message") || "")}`,
    ].join("\n");
    window.open(`https://wa.me/905536845821?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setFormStatus("WhatsApp görüşmesi açıldı.");
  };

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#ana-icerik">Ana içeriğe geç</a>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}>
        <nav className={styles.nav} aria-label="Ana navigasyon">
          <Link href="/" className={styles.brand} aria-label="OtoKöprü ana sayfa"><BrandLogo preload size="compact" /></Link>
          <div className={styles.desktopNav}>
            {navigation.map((item) => <a key={item.href} href={item.href} onClick={(event) => scrollToSection(event, item.href)}>{item.label}</a>)}
          </div>
          <Link href="/login" className={styles.headerCta}>Panele giriş</Link>
          <button
            ref={menuButtonRef}
            className={styles.menuButton}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
        <div ref={menuRef} id="landing-mobile-menu" className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`} aria-hidden={!menuOpen} inert={!menuOpen}>
          {navigation.map((item) => <a key={item.href} href={item.href} onClick={(event) => { scrollToSection(event, item.href); closeMenu(); }}>{item.label}</a>)}
          <Link href="/login" onClick={closeMenu}>Panele giriş <ArrowRight size={16} /></Link>
        </div>
      </header>

      <main id="ana-icerik">
        <section id="hakkimizda" className={styles.heroSection}>
          <div className={styles.container}>
            <div className={styles.heroCopy} data-animate>
              <span className={styles.badge}>Araç alım operasyonu</span>
              <h1>Başvuruyu alın. Aracı değerlendirin. Teklifi sonuçlandırın.</h1>
              <p>OtoKöprü, araç başvurusundan satın alma kararına kadar galeri ekibinizin ihtiyaç duyduğu bütün bilgileri tek çalışma alanında toplar.</p>
            </div>
          </div>

          <div className={styles.expandingWrap} data-expand data-animate data-delay="1">
            <div className={styles.heroVisual}>
              <Image className={styles.heroImage} src="/landing/cocoon/hero.webp" alt="Modern bir galeride sergilenen otomobil" fill priority sizes="100vw" />
              <div className={styles.heroVisualShade} />
              <CocoonRings />
            </div>
          </div>

          <div className={styles.container}>
            <div className={styles.heroDetail} data-animate data-delay="2">
              <div>
                <h2>Galeriler için daha düzenli bir alım süreci</h2>
                <div className={styles.miniAvatars} aria-hidden="true">
                  <span><ClipboardCheck size={20} /></span>
                  <span><BadgeTurkishLira size={20} /></span>
                </div>
              </div>
              <div>
                <p className={styles.lead}>Dağınık mesajlar yerine her araç için eksiksiz ve izlenebilir bir kayıt.</p>
                <p>Müşteri araç ve iletişim bilgilerini kendisine gönderilen bağlantıdan tamamlar. Galeri ekibi ekspertiz şemasını, fotoğrafları ve araç ayrıntılarını aynı ekranda inceler.</p>
                <p>Teklif hazır olduğunda markalı görsel oluşturulur; müşteriyle WhatsApp üzerinden doğrudan iletişim kurulur ve sonuç sisteme kaydedilir.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.markBar} aria-label="OtoKöprü modülleri">
          <div className={styles.container}>
            <div className={styles.markGrid} data-animate="fade">
              {platformMarks.map(({ icon: Icon, label }) => <div key={label}><Icon size={23} strokeWidth={1.35} /><span>{label}</span></div>)}
            </div>
          </div>
        </section>

        <section id="ozellikler" className={styles.featuresSection}>
          <div className={`${styles.container} ${styles.featureRows}`}>
            <div className={styles.featureRow} data-animate>
              <div className={styles.featureCopy}>
                <p className={styles.eyebrow}>Başvuru</p>
                <h2>İlk görüşmede ihtiyacınız olan bilgilerin tamamını alın</h2>
                <p>Müşteri, araç bilgilerini ve fotoğrafları telefondan düzenli bir akışla gönderir. Eksik bilgi için tekrar tekrar yazışmanız gerekmez.</p>
              </div>
              <FeatureVisual image="/landing/cocoon/showroom.webp" alt="Modern otomobil galerisi">
                <ProductActivityCard />
              </FeatureVisual>
            </div>

            <div className={styles.featureRow} data-animate>
              <FeatureVisual image="/landing/cocoon/inspection.webp" alt="Tablet ile araç inceleyen ekspertiz görevlisi">
                <InspectionCard />
              </FeatureVisual>
              <div className={styles.featureCopy}>
                <p className={styles.eyebrow}>Ekspertiz</p>
                <h2>Kaporta durumunu herkes için anlaşılır hale getirin</h2>
                <p>Parçaları orijinal, lokal boyalı, boyalı veya değişen olarak araç şeması üzerinde işaretleyin. Sonuç, panelde ve teklif görselinde aynı açıklıkla gösterilir.</p>
              </div>
            </div>

            <div className={styles.featureRow} data-animate>
              <div className={styles.featureCopy}>
                <p className={styles.eyebrow}>Teklif</p>
                <h2>Profesyonel teklifinizi saniyeler içinde hazırlayın</h2>
                <p>Araç bilgileri, ekspertiz özeti ve galeri logonuz tek bir görselde birleşir. Teklifi masaüstü, iOS ve Android cihazlarda indirip paylaşın.</p>
              </div>
              <FeatureVisual image="/landing/cocoon/pricing.webp" alt="Otomobil galerisinde sergilenen araçlar">
                <OfferCard />
              </FeatureVisual>
            </div>
          </div>
        </section>

        <section className={styles.experienceSection}>
          <div className={styles.expandingWrap} data-expand>
            <div className={styles.experienceBackdrop}>
              <Image src="/landing/cocoon/showroom.webp" alt="" fill sizes="100vw" />
              <div className={styles.experienceShade} />
              <div className={`${styles.container} ${styles.experienceGrid}`} data-animate>
                <div className={styles.experienceHeading}>
                  <span className={styles.badge}>Doğrudan iletişim</span>
                  <h2>Müşteri ile galeri arasında gerçek bir köprü</h2>
                  <p>Başvuru tamamlandıktan sonra iletişim kopmaz. Galerinizin yetkilisi, telefon numarası ve sosyal hesapları müşteri sayfasında görünür.</p>
                </div>
                <article className={styles.experienceCard}>
                  <div className={styles.experienceImage}><Image src="/landing/cocoon/pricing.webp" alt="Galeride sergilenen araçlar" fill sizes="(max-width: 768px) 100vw, 320px" /></div>
                  <div><h3>Güven veren müşteri deneyimi</h3><p>Müşteri fiyat sürecini beklerken galeri yetkilisine doğrudan ulaşabilir.</p></div>
                </article>
                <article className={`${styles.experienceCard} ${styles.experienceCardOffset}`}>
                  <div className={styles.experienceImage}><Image src="/landing/cocoon/inspection.webp" alt="Araç değerlendirmesinde tablet kullanan uzman" fill sizes="(max-width: 768px) 100vw, 320px" /></div>
                  <div><h3>Kontrollü galeri operasyonu</h3><p>Ekip üyeleri aynı veri üzerinden çalışır; her kritik işlem kayıt altında kalır.</p></div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="surec" className={styles.timelineSection}>
          <div className={`${styles.container} ${styles.timelineGrid}`}>
            <div className={styles.timelineHeading}>
              <span className={styles.badge}>Nasıl çalışır?</span>
              <h2>Dört adımda başvurudan sonuca</h2>
              <p>OtoKöprü, müşteri tarafındaki veri girişini ve galeri tarafındaki karar sürecini aynı kayıt üzerinde birleştirir.</p>
            </div>
            <div className={styles.timelineList}>
              {timeline.map((item, index) => (
                <article className={styles.timelineItem} data-animate key={item.step}>
                  <span className={`${styles.timelineDot} ${index === 0 ? styles.timelineDotActive : ""}`} />
                  <p>{item.step}</p>
                  <h3>{item.title}</h3>
                  <span>{item.detail}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="fiyatlandirma" className={styles.pricingSection}>
          <div className={styles.expandingWrap} data-expand>
            <div className={styles.pricingBackdrop}>
              <Image src="/landing/cocoon/pricing.webp" alt="Galerideki otomobiller" fill sizes="100vw" />
              <div className={styles.pricingShade} />
              <div className={`${styles.container} ${styles.pricingGrid}`} data-animate>
                <div className={styles.pricingHeading}>
                  <h2>Sade ve şeffaf fiyatlandırma</h2>
                  <p>Gizli maliyet yok. İki pakette de aynı operasyon özellikleri; yıllık pakette özel domain avantajı.</p>
                </div>
                <PricingCard annual={false} />
                <PricingCard annual />
              </div>
            </div>
          </div>
        </section>

        <section id="iletisim" className={styles.contactSection}>
          <div className={styles.contactCard} data-animate>
            <h2>Galeriniz için konuşalım</h2>
            <p>İhtiyacınızı kısaca anlatın. WhatsApp görüşmesini doldurduğunuz bilgilerle açalım.</p>
            <form className={styles.contactForm} onSubmit={submitContact}>
              <label>Ad soyad<input name="name" autoComplete="name" required placeholder="Adınız ve soyadınız" /></label>
              <label>Telefon veya e-posta<input name="contact" autoComplete="email" required placeholder="+90 5xx xxx xx xx" /></label>
              <label>Mesajınız<textarea name="message" rows={4} required defaultValue="Galerim için OtoKöprü kurulumu hakkında bilgi almak istiyorum." /></label>
              <label className={styles.honeypot} aria-hidden="true">Şirket<input name="company" tabIndex={-1} autoComplete="off" /></label>
              <button type="submit" className={styles.submitButton}><MessageCircle size={17} />WhatsApp&apos;ta görüş</button>
              <p className={styles.formStatus} role="status">{formStatus}</p>
            </form>
            <div className={styles.directContact}>
              <a href="tel:+905536845821"><Phone size={16} />{contactPhone}</a>
              <a href={`mailto:${contactEmail}`}><Mail size={16} />{contactEmail}</a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerGrid}`}>
          <div className={styles.footerBrand}><BrandLogo size="compact" /><p>Araç başvurularını ve teklif süreçlerini tek çalışma alanında yönetin.</p></div>
          <nav aria-label="Yasal bağlantılar"><Link href="/terms">Kullanım koşulları</Link><Link href="/privacy">Gizlilik</Link><Link href="/kvkk">KVKK</Link></nav>
          <div className={styles.footerContact}><strong>İletişim</strong><a href="tel:+905536845821">{contactPhone}</a><a href={`mailto:${contactEmail}`}>{contactEmail}</a></div>
        </div>
        <p className={styles.copyright}>© {new Date().getFullYear()} OtoKöprü. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
