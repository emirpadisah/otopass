import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarRange, Check, Sparkles } from "lucide-react";

const planFeatures = [
  "Galeriye özel araç başvuru sayfası",
  "Araç fotoğrafı ve ekspertiz bilgisi toplama",
  "Başvuru, teklif ve durum yönetimi",
  "Rol bazlı ekip erişimi",
  "Galeri logosuyla markalı müşteri deneyimi",
  "İndirilebilir kurumsal teklif görseli",
];

const annualFeature = "Kendi özel domainini bağlama";

const plans = [
  {
    name: "Aylık",
    price: "₺5.000",
    period: "/ ay",
    description: "Taahhüt vermeden başlamak ve sistemi aylık kullanmak isteyen galeriler için.",
    billing: "Her ay yenilenir",
    badge: "Esnek başlangıç",
    icon: CalendarDays,
    featured: false,
  },
  {
    name: "Yıllık",
    price: "₺50.000",
    period: "/ yıl",
    description: "Kesintisiz yıllık kullanım, iki aylık fiyat avantajı ve özel domain bağlantısı.",
    billing: "12 aylık erişim, tek ödeme",
    badge: "₺10.000 avantaj",
    icon: CalendarRange,
    featured: true,
  },
];

export function PricingSection() {
  return (
    <section className="vc-section vc-pricing-section" id="fiyatlar">
      <div className="vc-container">
        <div className="vc-centered-heading vc-pricing-heading" data-reveal>
          <span className="vc-section-kicker">Şeffaf fiyatlandırma</span>
          <h2>İhtiyacınıza uygun üyeliği seçin</h2>
          <p>Tüm operasyon araçları iki planda da sunulur; özel domain bağlantısı yıllık üyeliğe dahildir.</p>
        </div>

        <div className="vc-pricing-grid">
          {plans.map(({ name, price, period, description, billing, badge, icon: Icon, featured }, index) => (
            <article
              className="vc-pricing-card"
              data-featured={featured || undefined}
              data-reveal
              key={name}
              style={{ "--vc-order": index } as React.CSSProperties}
            >
              <div className="vc-pricing-card-topline">
                <span className="vc-pricing-icon"><Icon size={20} aria-hidden="true" /></span>
                <span className="vc-pricing-badge">{featured ? <Sparkles size={13} aria-hidden="true" /> : null}{badge}</span>
              </div>

              <div className="vc-pricing-title">
                <span>{name} üyelik</span>
                <p>{description}</p>
              </div>

              <div className="vc-pricing-amount" aria-label={`${name} üyelik ${price} ${period.replace("/", "")}`}>
                <strong>{price}</strong>
                <span>{period}</span>
              </div>
              <small className="vc-pricing-billing">{billing}</small>

              <div className="vc-pricing-divider" />
              <p className="vc-pricing-includes">Üyeliğe dahil:</p>
              <ul className="vc-pricing-features">
                {planFeatures.map((feature) => (
                  <li key={feature}><span><Check size={14} aria-hidden="true" /></span>{feature}</li>
                ))}
                {featured ? (
                  <li data-exclusive="true"><span><Check size={14} aria-hidden="true" /></span>{annualFeature}</li>
                ) : null}
              </ul>

              <Link href="#iletisim" className="vc-pricing-cta">
                Görüşme talep et <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>

        <p className="vc-pricing-note" data-reveal>
          Özel domain bağlantısı yalnız yıllık üyelikte sunulur. Kurulum ve faturalandırma ayrıntıları görüşme sırasında paylaşılır.
        </p>
      </div>
    </section>
  );
}
