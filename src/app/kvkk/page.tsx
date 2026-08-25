import type { Metadata } from "next";
import { LegalList, LegalNote, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "KVKK aydınlatma metni | otoköprü",
  description: "otoköprü platformu için 6698 sayılı Kanun kapsamındaki aydınlatma metni.",
};

export default function KvkkPage() {
  return (
    <LegalPage
      kicker="6698 sayılı Kanun"
      title="KVKK aydınlatma metni"
      description="Bu metin, otoköprü ana sitesi ve platform hizmeti kapsamında işlenen kişisel veriler hakkında sizi bilgilendirmek için hazırlanmıştır."
      effectiveDate="25 Ağustos 2026"
    >
      <LegalSection title="Veri sorumlusu ve iletişim">
        <p>OtoKöprü markası altında sunulan platform hizmeti kapsamında veri sorumlusuna ilişkin iletişim taleplerinizi <a href="mailto:info@otokopru.com">info@otokopru.com</a> veya <a href="tel:+905536845821">+90 553 684 58 21</a> üzerinden iletebilirsiniz.</p>
        <LegalNote>Araç başvuru formunda başvuruyu kabul eden galeri, kendi müşteri ilişkisi ve ticari değerlendirmesi açısından ayrı veri sorumlusudur. Bu durumda formdaki galeriye özel aydınlatma metninde belirtilen unvan ve iletişim bilgileri esas alınır.</LegalNote>
      </LegalSection>

      <LegalSection title="İşlenen veri kategorileri">
        <LegalList>
          <li>Kimlik ve iletişim verileri: ad soyad, telefon numarası ve panel hesabına ait e-posta adresi.</li>
          <li>İşlem ve araç verileri: araç marka/modeli, teknik özellikler, tramer ve hasar beyanı, kaporta bilgileri, fotoğraflar, teklifler ve işlem durumları.</li>
          <li>İşlem güvenliği verileri: oturum, yetki, hata, kötüye kullanım önleme ve denetim kayıtları.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="İşleme amaçları">
        <LegalList>
          <li>Başvuru ve teklif sürecini yürütmek, galeri ile başvuru sahibinin iletişim kurmasını sağlamak.</li>
          <li>Panel kullanıcılarının yetkilerini doğrulamak, erişimleri yönetmek ve işlem kayıtlarını tutmak.</li>
          <li>Platformun güvenliğini, sürekliliğini ve veri bütünlüğünü korumak; hata, kötüye kullanım ve hukuka aykırı erişimi önlemek.</li>
          <li>Mevzuattan doğan yükümlülükleri yerine getirmek, talepleri yanıtlamak ve olası uyuşmazlıklarda hakları korumak.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Toplama yöntemi ve hukuki sebep">
        <p>Veriler, elektronik başvuru formu, panel hesapları, oturum işlemleri ve sistem güvenliği mekanizmaları üzerinden otomatik yollarla toplanır. İlgili işlem bakımından Kanun’un 5. maddesindeki bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olma, hukuki yükümlülüğün yerine getirilmesi, bir hakkın tesisi/kullanılması/korunması ve temel haklara zarar vermemek kaydıyla meşru menfaat hukuki sebeplerine dayanılabilir.</p>
      </LegalSection>

      <LegalSection title="Aktarım yapılan taraflar">
        <p>Veriler; başvurunun yönlendirildiği ilgili galeri ve yetkili kullanıcıları, teknik altyapı tedarikçileri ile kanunen yetkili kamu kurum ve kuruluşlarıyla, amaçla sınırlı ve gerekli olduğu ölçüde paylaşılabilir. Yurt dışı aktarım gereken hallerde Kanun ve ikincil düzenlemelerdeki uygun güvence mekanizmaları uygulanır.</p>
      </LegalSection>

      <LegalSection title="Saklama süresi">
        <p>Veriler, ilgili amacın gerektirdiği ve yürürlükteki saklama ayarlarının izin verdiği süre kadar saklanır. Varsayılan başvuru yaşam döngüsünde kayıt 365 gün sonra arşivlenir; 30 gün sonra fotoğraflar silinir ve belirli kişisel veriler anonimleştirilir. Yasal saklama yükümlülükleri veya bir hakkın korunması gerektirirse süre uzatılabilir.</p>
      </LegalSection>

      <LegalSection title="İlgili kişinin hakları">
        <p>Kanun’un 11. maddesi uyarınca, kişisel verinizin işlenip işlenmediğini öğrenme; işlenmişse bilgi talep etme; amacına uygun kullanılıp kullanılmadığını öğrenme; aktarılan kişileri bilme; eksik veya yanlış işlenmişse düzeltilmesini, şartları oluşmuşsa silinmesini veya yok edilmesini isteme; bu işlemlerin aktarım yapılanlara bildirilmesini isteme; yalnız otomatik sistemlerle aleyhinize sonuç doğmasına itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz.</p>
      </LegalSection>

      <LegalSection title="Başvuru yöntemi">
        <p>Talebinizi kimliğinizi doğrulayacak bilgi ve belgelerle birlikte <a href="mailto:info@otokopru.com">info@otokopru.com</a> adresine iletebilirsiniz. Araç başvurusuna ilişkin taleplerde, ilgili galerinin form sayfasındaki KVKK e-posta adresini de kullanabilirsiniz.</p>
      </LegalSection>
    </LegalPage>
  );
}
