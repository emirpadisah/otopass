import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Kullanım Koşulları | POL-CAR" };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back"><ArrowLeft size={16} /> Ana sayfaya dön</Link>
      <article className="panel legal-document">
        <header><BrandLogo size="compact" /><p className="section-label mt-5">POL-CAR</p><h1>Kullanım Koşulları</h1></header>
        <h2>Hizmetin kapsamı</h2><p>POL-CAR, araç sahipleri ile galeriler arasındaki ön değerlendirme ve teklif operasyonunu dijital ortamda düzenler. Form gönderimi satış veya kesin fiyat taahhüdü oluşturmaz.</p>
        <h2>Kullanıcı sorumluluğu</h2><p>Gönderilen bilgilerin doğru, güncel ve paylaşım yetkisine sahip olması kullanıcının sorumluluğundadır. Hukuka aykırı veya üçüncü kişilerin haklarını ihlal eden içerik yüklenemez.</p>
        <h2>Güvenlik</h2><p>Yetkisiz erişim, otomatik kötüye kullanım ve hizmetin çalışmasını bozacak girişimler engellenebilir ve kayıt altına alınabilir.</p>
        <h2>Değişiklikler</h2><p>Koşullar mevzuat ve hizmet kapsamındaki değişikliklere göre güncellenebilir. Güncel sürüm bu sayfada yayımlanır.</p>
      </article>
    </main>
  );
}
