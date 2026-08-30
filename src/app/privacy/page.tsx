import type { Metadata } from "next";
import { CookiePreferencesButton } from "@/components/google-measurement";
import { LegalList, LegalNote, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { hasGoogleMeasurementIds } from "@/lib/google-measurement-config";

export const metadata: Metadata = {
  title: "Gizlilik politikası | otoköprü",
  description: "otoköprü platformunda kişisel verilerin ve hizmet verilerinin korunmasına ilişkin gizlilik politikası.",
};

export default function PrivacyPolicyPage() {
  const googleMeasurementEnabled = hasGoogleMeasurementIds();
  return (
    <LegalPage
      kicker="Yasal bilgiler"
      title="Gizlilik politikası"
      description="otoköprü; araç başvuru ve teklif süreçlerinde işlenen bilgilerin hangi amaçlarla kullanıldığını, hangi tarafların erişebildiğini ve sistemin veriyi korumak için nasıl çalıştığını açıklar."
      effectiveDate="30 Ağustos 2026"
    >
      <LegalSection title="Kapsam ve roller">
        <p>Bu politika otoköprü ana sitesi, paneli ve platformun teknik bileşenleri için geçerlidir. Bir araç başvurusunda başvuruyu alan galeri, kendi ticari değerlendirmesi ve müşteri iletişimi bakımından ayrı veri sorumlusudur. Formdaki galeriye özel KVKK aydınlatma metni, o başvuru için öncelikle uygulanır.</p>
        <LegalNote>otoköprü, başvuru ve operasyon akışının teknik altyapısını sağlar. Galerinin müşteriyle yaptığı görüşme, teklif koşulları ve kendi ticari faaliyetlerine ilişkin veri işleme kararları galerinin sorumluluğundadır.</LegalNote>
      </LegalSection>

      <LegalSection title="İşlenen bilgiler">
        <LegalList>
          <li>Başvuru bilgileri: ad soyad, telefon numarası, araç özellikleri, tramer ve hasar beyanı, kaporta işaretlemeleri ile fotoğraflar.</li>
          <li>Panel bilgileri: yetkili kullanıcı adı, e-posta adresi, rolü, galeri bağlantısı ve işlem kayıtları.</li>
          <li>Güvenlik bilgileri: oturum çerezleri, cihaz ve istek güvenliğine ilişkin sınırlı teknik kayıtlar, hata ve kötüye kullanım önleme kayıtları.</li>
          <li>Tercih bilgileri: yalnızca arayüz tema seçimi gibi tarayıcıda saklanan kullanım tercihleri.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Kullanım amaçları">
        <LegalList>
          <li>Başvuruyu ilgili galeriye ulaştırmak, teklif sürecini yürütmek ve yetkili kullanıcıların operasyonu takip etmesini sağlamak.</li>
          <li>Oturum güvenliği, erişim kontrolü, hata tespiti, kötüye kullanım önleme ve hizmetin iyileştirilmesi.</li>
          <li>Yasal yükümlülüklere yanıt vermek, hakların tesisi ve korunması için gerekli kayıtları tutmak.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Erişim ve aktarım">
        <p>Bilgilere, görevi gereği erişmesi gereken yetkili galeri kullanıcıları ve sistem yöneticileri erişebilir. Barındırma, veritabanı, dosya saklama, kimlik doğrulama, güvenlik doğrulaması ve hata izleme hizmetleri sağlayan teknik tedarikçilerden yararlanılabilir. Kanunen yetkili kamu kurum ve kuruluşlarının usulüne uygun talepleri de değerlendirilebilir.</p>
        <p>Yurt dışına aktarım gerektiren bir teknik hizmet kullanılması halinde, uygulanabilir veri koruma mevzuatındaki uygun güvence ve aktarım şartları gözetilir.</p>
      </LegalSection>

      <LegalSection title="Saklama ve silme">
        <p>Başvurular, aktif saklama ayarına göre son işlemden sonra arşivlenir. Varsayılan sistem kuralında bu süre 365 gündür; arşivden 30 gün sonra fotoğraflar silinir ve başvuruya ait kişisel iletişim ile hasar bilgileri anonimleştirilir. Yasal zorunluluk veya hakların korunması için daha uzun saklama gerekebilir.</p>
      </LegalSection>

      <LegalSection title="Güvenlik ve tercih teknolojileri">
        <p>Yetki kontrolleri, oturum çerezleri, erişim kısıtları, kayıt izleri ve güvenlik doğrulamaları; hizmeti korumak için kullanılır. Tema tercihi tarayıcınızda saklanabilir.</p>
        <p>Açık tercihinizle Google Analytics 4, site kullanımını ölçmek; Google Ads ise reklam performansını ve dönüşümleri değerlendirmek için kullanılabilir. Kabul etmediğiniz sürece Google ölçüm etiketleri yüklenmez. Panel yolları ölçüm kapsamı dışındadır ve ölçüm sayfa adreslerine sorgu parametreleri eklenmez.</p>
        {googleMeasurementEnabled ? <CookiePreferencesButton /> : null}
      </LegalSection>

      <LegalSection title="İletişim">
        <p>Platform gizliliğiyle ilgili taleplerinizi <a href="mailto:info@otokopru.com">info@otokopru.com</a> adresine iletebilirsiniz. Belirli bir araç başvurusu için kişisel veri talebiniz varsa, hızlı sonuç için ilgili galerinin formda belirtilen KVKK iletişim kanalına da başvurabilirsiniz.</p>
      </LegalSection>
    </LegalPage>
  );
}
