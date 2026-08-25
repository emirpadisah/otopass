import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DealerLogo } from "@/components/dealer-logo";
import { LegalList, LegalNote, LegalPage, LegalSection } from "@/components/legal/legal-page";
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
  const backHref = requestHeaders.get("x-custom-domain") ? "/" : `/form/${dealerSlug}`;

  return (
    <LegalPage
      kicker="6698 sayılı Kanun"
      title="KVKK aydınlatma metni"
      description={`Bu metin, ${dealer.name} araç başvuru formu üzerinden işlenen kişisel veriler hakkında sizi bilgilendirmek için hazırlanmıştır.`}
      effectiveDate="25 Ağustos 2026"
      backHref={backHref}
      backLabel="Başvuru formuna dön"
      brand={<DealerLogo dealerName={dealer.name} logoSrc={getDealerLogoSrc(dealer)} priority />}
    >
      <LegalSection title="Veri sorumlusu ve iletişim">
        <p>Bu form kapsamında işlenen kişisel verilerin veri sorumlusu <strong>{controller}</strong>’dır. otoköprü, başvuru sürecinin yürütüldüğü teknik altyapıyı sağlar.</p>
        <p>{privacyEmail ? <>Kişisel verilerinizle ilgili taleplerinizi <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> adresine iletebilirsiniz.</> : <>Kişisel verilerinizle ilgili taleplerinizi veri sorumlusunun kayıtlı iletişim kanalları üzerinden iletebilirsiniz.</>}</p>
      </LegalSection>

      <LegalSection title="İşlenen kişisel veriler">
        <LegalList>
          <li>Ad soyad ve telefon numarası.</li>
          <li>Araç marka/modeli, teknik özellikleri, tramer ve hasar beyanları.</li>
          <li>Kaporta parça durumları, yüklenen araç fotoğrafları ve başvuru işlem kayıtları.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="İşleme amaçları">
        <p>Veriler; araç başvurusunun alınması ve değerlendirilmesi, ön değerlendirme teklifi hazırlanması, başvuru sahibiyle iletişim kurulması, bilgi güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.</p>
      </LegalSection>

      <LegalSection title="Toplama yöntemi ve hukuki sebep">
        <p>Kişisel veriler elektronik başvuru formu üzerinden otomatik yöntemle toplanır. Başvurunun değerlendirilmesi bakımından sözleşmenin kurulması veya ifasıyla doğrudan ilgili olma, veri sorumlusunun hukuki yükümlülüğü ve temel haklara zarar vermemek kaydıyla meşru menfaati hukuki sebeplerine dayanılabilir.</p>
      </LegalSection>

      <LegalSection title="Aktarım yapılan taraflar">
        <p>Veriler; başvurunun değerlendirilmesi için yetkili galeri personeline, sistemin güvenli biçimde işletilmesi için teknik hizmet sağlayıcılarına ve yasal zorunluluk halinde yetkili kamu kurumlarına, amaçla sınırlı olarak aktarılabilir.</p>
      </LegalSection>

      <LegalSection title="Saklama süresi">
        <p>Başvuru, son işlemden sonra en fazla 365 gün aktif saklama süresinde tutulur ve ardından arşivlenir. Arşivden sonraki 30 gün içinde fotoğraflar silinir; iletişim ve hasar bilgileri anonimleştirilir. Yasal yükümlülük veya bir hakkın korunması daha uzun saklamayı gerektirirse süre uzatılabilir.</p>
      </LegalSection>

      <LegalSection title="Haklarınız">
        <p>Kanun’un 11. maddesi uyarınca verileriniz hakkında bilgi talep etme, düzeltme, silme veya yok etme talebinde bulunma, aktarılan kişileri öğrenme, otomatik sistemlerle aleyhinize sonuç doğmasına itiraz etme ve zararınızın giderilmesini isteme haklarına sahipsiniz.</p>
        <LegalNote>Bu metni okuduğunuza ilişkin form onayı, pazarlama iletisi izni veya açık rıza yerine geçmez; size yalnızca işleme hakkında bilgi verilmesini sağlar.</LegalNote>
      </LegalSection>
    </LegalPage>
  );
}
