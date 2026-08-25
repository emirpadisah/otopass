import type { Metadata } from "next";
import { LegalList, LegalNote, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Kullanım koşulları | otoköprü",
  description: "otoköprü platformunun kullanım koşulları.",
};

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Yasal bilgiler"
      title="Kullanım koşulları"
      description="Bu koşullar; otoköprü üzerinden araç başvurusu gönderen ziyaretçilerin, galeri ekiplerinin ve yönetim paneli kullanıcılarının platformdan yararlanmasına ilişkin çerçeveyi açıklar."
      effectiveDate="25 Ağustos 2026"
    >
      <LegalSection title="Hizmetin kapsamı">
        <p>otoköprü; araç başvurularının toplanması, ekspertiz ve fotoğraf bilgilerinin düzenlenmesi, galerilerin ön değerlendirme teklifi oluşturması ve operasyon sürecinin yetkili kullanıcılar tarafından izlenmesi için teknik altyapı sağlar.</p>
        <LegalNote>Platformda paylaşılan fiyatlar ön değerlendirme niteliğindedir. Başvuru gönderimi, kesin satın alma taahhüdü veya araç satış sözleşmesi oluşturmaz.</LegalNote>
      </LegalSection>

      <LegalSection title="Hesaplar ve yetkiler">
        <p>Panel hesapları yetkili yönetici tarafından oluşturulur. Her kullanıcı yalnız kendisine tanımlanan rol ve galeri kapsamındaki verilere erişebilir. Hesap sahibi, oturum bilgilerinin gizliliğinden ve hesabı üzerinden yapılan işlemlerden sorumludur.</p>
        <p>Yetkisiz erişim, rol dışı işlem veya güvenlik riski tespit edilmesi halinde erişim geçici olarak sınırlandırılabilir ya da kapatılabilir.</p>
      </LegalSection>

      <LegalSection title="Başvuru ve teklif süreci">
        <LegalList>
          <li>Başvuru sahibi araç, iletişim ve ekspertiz bilgilerini doğru, güncel ve paylaşmaya yetkili olduğu şekilde sunar.</li>
          <li>Galeri, başvuruyu kendi ticari değerlendirmesine göre inceler ve gerekli görürse başvuru sahibiyle doğrudan iletişime geçer.</li>
          <li>Teklif, kabul, ret ve satış adımları yalnız yetkili panel kullanıcıları tarafından kaydedilir.</li>
          <li>Galerinin müşteriyle yaptığı görüşmeler, satış koşulları ve nihai ekspertiz değerlendirmesi platformun teknik hizmet kapsamından bağımsızdır.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Kabul edilebilir kullanım">
        <LegalList>
          <li>Başkalarına ait kişisel verileri, fotoğrafları veya içerikleri hukuka aykırı biçimde yüklemeyin.</li>
          <li>Platformun güvenliğini ihlal etmeye, otomatik veri toplamaya, erişimi engellemeye veya başka kullanıcıların hesaplarını kullanmaya çalışmayın.</li>
          <li>Başvuru ve teklif alanlarını yanıltıcı, sahte veya kötüye kullanıma elverişli içeriklerle doldurmayın.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Hizmet sürekliliği ve değişiklikler">
        <p>Bakım, güvenlik, mevzuat veya altyapı gereksinimleri nedeniyle hizmetin bazı bölümleri geçici olarak değiştirilebilir, sınırlandırılabilir ya da erişilemeyebilir. Platformun güncel işlevleri ve bu koşullar gerektiğinde güncellenir; yürürlük tarihi bu sayfada gösterilir.</p>
      </LegalSection>

      <LegalSection title="İletişim ve uyuşmazlıklar">
        <p>Koşullara ilişkin bildirimlerinizi <a href="mailto:info@otokopru.com">info@otokopru.com</a> üzerinden iletebilirsiniz. Galeri ile başvuru sahibi arasındaki ticari görüşme ve sözleşmelere ilişkin uyuşmazlıklarda, ilgili tarafların kendi aralarındaki sözleşme ve uygulanabilir mevzuat esas alınır.</p>
      </LegalSection>
    </LegalPage>
  );
}
