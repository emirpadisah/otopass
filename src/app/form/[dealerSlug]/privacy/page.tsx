import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { DealerLogo } from "@/components/dealer-logo";
import { getDealerLogoSrc } from "@/lib/dealer-branding";
import { getDealerBySlug } from "@/lib/supabase/queries";

type PageProps = { params: Promise<{ dealerSlug: string }> };

export const metadata: Metadata = { title: "KVKK aydınlatma metni" };

export default async function PrivacyPage({ params }: PageProps) {
  const { dealerSlug } = await params;
  const [dealer, requestHeaders] = await Promise.all([getDealerBySlug(dealerSlug), headers()]);
  if (!dealer) notFound();
  const controller = dealer.legal_name || dealer.name;
  const privacyEmail = dealer.privacy_contact_email || dealer.contact_email;

  return (
    <main className="legal-page">
      <Link href={requestHeaders.get("x-custom-domain") ? "/" : `/form/${dealerSlug}`} className="legal-back"><ArrowLeft size={16} /> Başvuru formuna dön</Link>
      <article className="panel legal-document">
        <header><DealerLogo dealerName={dealer.name} logoSrc={getDealerLogoSrc(dealer)} /><ShieldCheck className="mt-5" size={26} aria-hidden="true" /><p className="section-label">Yürürlük tarihi: 17 Ağustos 2026</p><h1>KVKK aydınlatma metni</h1></header>
        <p>Bu araç başvuru formu kapsamında işlenen kişisel verilerin veri sorumlusu <strong>{controller}</strong>’dır. POL-CAR, başvuru sürecinin yürütüldüğü teknik altyapıyı sağlar.</p>
        <h2>İşlenen kişisel veriler</h2><p>Ad soyad ve telefon numarası, araç özellikleri, tramer ve hasar açıklamaları, kaporta bilgileri, yüklenen fotoğraflar ile işlem güvenliği kayıtları işlenir.</p>
        <h2>İşleme amaçları</h2><p>Veriler; araç başvurusunun alınması ve değerlendirilmesi, fiyat teklifi hazırlanması, başvuru sahibiyle iletişim kurulması, bilgi güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.</p>
        <h2>Toplama yöntemi ve hukuki sebep</h2><p>Kişisel veriler bu elektronik form üzerinden otomatik yöntemle toplanır; sözleşmenin kurulmasıyla doğrudan ilgili olma, veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi ve meşru menfaatleri hukuki sebeplerine dayanılarak işlenir.</p>
        <h2>Verilerin aktarılması</h2><p>Veriler, başvurunun değerlendirilmesi ve sistemin güvenli biçimde işletilmesi amacıyla yetkili galeri personeline ve teknik hizmet sağlayıcılarına; yasal zorunluluk halinde yetkili kamu kurumlarına aktarılabilir.</p>
        <h2>Saklama süresi</h2><p>Son işlemden sonra 365 gün saklanan başvuru arşivlenir; takip eden 30 gün içinde fotoğraflar silinir ve kişisel veriler anonimleştirilir.</p>
        <h2>Haklarınız ve başvuru</h2><p>6698 sayılı Kanun’un 11. maddesi kapsamındaki haklarınıza ilişkin taleplerinizi {privacyEmail ? <><a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> adresine iletebilirsiniz.</> : <>veri sorumlusunun kayıtlı iletişim kanalları üzerinden iletebilirsiniz.</>}</p>
      </article>
    </main>
  );
}
