import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Kullanım koşulları | POL-CAR" };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back"><ArrowLeft size={16} /> Ana sayfaya dön</Link>
      <article className="panel legal-document">
        <header><BrandLogo size="compact" /><p className="section-label mt-5">Yürürlük tarihi: 22 Ağustos 2026</p><h1>Kullanım koşulları</h1></header>
        <h2>Hizmetin kapsamı</h2><p>POL-CAR, araç sahipleri ile galeriler arasındaki başvuru, ön değerlendirme ve teklif sürecini dijital ortamda yürütmek için teknik altyapı sağlar. Form gönderimi satış sözleşmesi veya kesin fiyat taahhüdü oluşturmaz.</p>
        <h2>Başvuru sahibinin sorumluluğu</h2><p>Paylaşılan bilgilerin doğru ve güncel olması, yüklenen içeriklerin paylaşım hakkına sahip olunması başvuru sahibinin sorumluluğundadır. Hukuka aykırı veya üçüncü kişilerin haklarını ihlal eden içerik yüklenemez.</p>
        <h2>Hesap ve erişim güvenliği</h2><p>Panel kullanıcıları hesap bilgilerini gizli tutmak ve yalnızca kendilerine tanımlanan yetki kapsamında işlem yapmakla yükümlüdür. Yetkisiz erişim girişimleri engellenebilir ve güvenlik amacıyla kayıt altına alınabilir.</p>
        <h2>Hizmetin kullanılabilirliği</h2><p>Bakım, güvenlik veya teknik gereklilikler nedeniyle hizmette geçici kesintiler yaşanabilir. Veri bütünlüğünü ve hizmet sürekliliğini korumak için gerekli önlemler uygulanır.</p>
        <h2>Koşullardaki değişiklikler</h2><p>Bu koşullar, mevzuat veya hizmet kapsamındaki değişikliklere göre güncellenebilir. Güncel sürüm ve yürürlük tarihi bu sayfada yayımlanır.</p>
      </article>
    </main>
  );
}
