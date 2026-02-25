import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-caption text-[var(--accent)]">Sistem Yönetimi</p>
        <h2 className="text-h2 mt-2">Ayarlar</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Operasyonel varsayılanlar ve güvenlik bileşenleri.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card tone="flat">
          <CardHeader>
            <CardTitle>Güvenlik Varsayılanları</CardTitle>
            <CardDescription>Sistem genelinde aktif güvenlik kontrolleri</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li>Başvuru fotoğrafları için private storage kullanımı</li>
              <li>Sadece admin tarafında kullanıcı oluşturma yetkisi</li>
              <li>İlk girişte şifre değiştirme zorunluluğu</li>
              <li>Sunucu tarafı doğrulama ve bekleme süresi kontrolü</li>
            </ul>
          </CardContent>
        </Card>

        <Card tone="flat">
          <CardHeader>
            <CardTitle>Ortam Değişkenleri</CardTitle>
            <CardDescription>Operasyon için gereken temel env anahtarları</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mono space-y-2 text-xs text-[var(--text-secondary)]">
              <li>NEXT_PUBLIC_SUPABASE_URL</li>
              <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              <li>SUPABASE_SERVICE_ROLE_KEY</li>
              <li>OPTIONAL_ENABLE_CAPTCHA=false</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
