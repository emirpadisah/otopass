import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getDealerBySlug } from "@/lib/supabase/queries";

type PageProps = { params: Promise<{ dealerSlug: string }> };

export const metadata: Metadata = { title: "KVKK Aydınlatma Metni | Otopass" };

export default async function PrivacyPage({ params }: PageProps) {
  const { dealerSlug } = await params;
  const dealer = await getDealerBySlug(dealerSlug);
  if (!dealer) notFound();
  const controller = dealer.legal_name || dealer.name;
  const privacyEmail = dealer.privacy_contact_email || dealer.contact_email || "privacy@otopass.com";

  return (
    <main className="legal-page">
      <Link href={`/form/${dealerSlug}`} className="legal-back"><ArrowLeft size={16} /> Başvuru formuna dön</Link>
      <article className="panel legal-document">
        <header><ShieldCheck size={26} aria-hidden="true" /><p className="section-label">Sürüm 2026-08-17</p><h1>KVKK Aydınlatma Metni</h1></header>
        <p>Bu form üzerinden aktarılan kişisel verilerin veri sorumlusu <strong>{controller}</strong>’dır. Otopass, başvuru ve teklif süreçlerinin yürütüldüğü teknik platformu sağlar.</p>
        <h2>İşlenen veriler</h2><p>Kimlik ve iletişim bilgileri, araç özellikleri, hasar/tramer açıklamaları, yüklenen fotoğraflar ve işlem güvenliği kayıtları işlenir.</p>
        <h2>İşleme amacı</h2><p>Başvurunun değerlendirilmesi, fiyat teklifi hazırlanması, müşteriyle iletişim kurulması, güvenliğin sağlanması ve yasal yükümlülüklerin yerine getirilmesi amaçlanır.</p>
        <h2>Saklama süresi</h2><p>Son işlemden sonra 365 gün saklanan başvuru arşivlenir; takip eden 30 gün içinde fotoğraflar silinir ve kişisel veriler anonimleştirilir.</p>
        <h2>Haklarınız</h2><p>Verilerinize erişme, düzeltme, silme, işlemeyi sınırlandırma ve itiraz haklarınız için <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> adresine başvurabilirsiniz.</p>
        <p className="legal-note">Bu metin operasyonel şablondur ve yayından önce veri sorumlusunun hukuk danışmanı tarafından onaylanmalıdır.</p>
      </article>
    </main>
  );
}
