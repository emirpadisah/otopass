# 8 Eylül 2026 yayın durumu

Güncel durum: e-posta doğrulaması kullanıcı talimatıyla ertelenerek diğer güvenlik değişiklikleri ana alan adına yayımlandı. Aşağıdaki ilk hazırlık kayıtları tarihsel durumu gösterir; son yayın sonucu belgenin sonundadır.

## Hazırlanan sürüm

- Proje: otopass / prj_og5cVus8zbrkc6xLo8F2Z8BqhufZ.
- Deployment: dpl_Agh5f6mXDUVoMvLxFXgU3RVQeWwh.
- URL: https://otopass-kpj47fs6w-emirs-projects-9e257263.vercel.app
- Vercel CLI 59.11.7 ile production environment ve --skip-domain kullanıldı.
- Kaynak: codex/security-hardening çalışma ağacı; HEAD d0a6df1e967a5a28d329f52354006902609290f5, commit edilmemiş değişiklikler dahil. Bu SHA tek başına yayımlanan içeriği tanımlamaz. Git commit/push yapılmadı.
- Remote build başarılı, build çıktısında 50 saniye bildirildi.
- .vercelignore ile yerel veriler, ortam dosyaları, yedekler, SQL fixture'ları ve test çıktıları dışlandı. Dry-run 227 dosya; src altındaki 187 dosyanın tümü dahil. Manifest yerel ve Git dışında: .vercel/deployment-inputs.json.
- İlk dosya yüklemesi ağ hatası verdi; tgz arşiviyle tekrar yükleme başarılı oldu.

## Doğrulama

- Yeni sürüm /login/verify-email: HTTP 200; no-store, CSP, HSTS, nosniff ve frame DENY başlıkları mevcut.
- Yeni sürüm /admin: oturumsuz HTTP 307 ile /login yönlendirmesi.
- www.otokopru.com/login: HTTP 200.
- Ana alan adı son kontrolde önceki dpl_8u8M8MmMBvJL4R2KEo791uHSGUYq sürümüne bağlı. Yeni sürüm promote edilmedi.
- Supabase hedefi üretim ortamından doğrulandı: dtfkzquumjdeptkyoyfh.supabase.co.
- get_email_verification_status RPC'si sıfır UUID ile salt okunur çağrıldı: PGRST202. Bu fonksiyon API şema önbelleğinde bulunmuyor; migration 004'ün varlığı doğrulanmış değil. Eksik fonksiyon yeni uygulamada giriş sorgusunu engeller.
- Mevcut hesaplara Auth güncellemesi, e-posta gönderimi veya test oturumu işlemi yapılmadı. Canlı SQL migration uygulanmadı.

## Tamamlanmayı engelleyen işler

Yetkili Chrome etsy profilinin bağlantısı, kullanıcı sekmeyi yeniden açtıktan sonra da zaman aşımına düştü. Diğer Chrome profilinde polcarr için erişim reddedildi. Mevcut Supabase CLI hesabının proje listesinde polcarr yok. Service role REST erişimi SQL DDL yönetim yetkisi yerine kullanılmadı.

1. Yetkili bağlantıyı düzelt veya production-preflight.sql salt okunur çıktısını al; geçmiş migration kayıtları bulunmadığından db push/repair çalıştırma.
2. 003'ün canlı durumunu karşılaştır; gerekli migration'ları yayın sırasına göre uygula. 004 bir kerelik mevcut hesap muafiyet snapshot'ını oluşturmalı; tekrar çalıştırılarak genişletilmemeli.
3. Hosted SMTP ve Confirmation/Magic Link kod şablonlarını doğrula; yalnız yeni test hesabıyla teslimat/OTP akışını dene. Bu turda SMTP doğrulanmadı.
4. Hazır deployment'ı promote et ve 005 DB e-posta kapısını aynı yayın penceresinde tamamla; mevcut hesapların muafiyetini, MFA ve tenant sınırlarını test et.
5. Yeni/yetkili oturum testleri ve runtime izleme tamamlanmadan uçtan uca başarılı yayın iddiasında bulunma. Yerel pgTAP ortamı halen doğrulanmamış durumda.

Ek gözlem: Üretim ortam değişken listesinde Turnstile ve Sentry anahtarları görünmedi. Bazı config değerlerinde literal ters eğik çizgi-r/satır sonu bulundu; bu turda hosted değerler değiştirilmedi. Ayrı yapılandırma kontrolünde ele alınmalı. Vercel'in sensitive olarak işaretlediği iki değer indirilirken placeholder döndü; build uzaktaki gerçek production environment ile çalıştı.

Kaynak: [Vercel staged production deployment](https://vercel.com/docs/cli/deploy#skip-domain).

## Kullanıcının paylaştığı preflight sonucu

Kullanıcı polcarr SQL Editor çıktısını paylaştı. 001/002/003 içindeki sekiz fonksiyonun gövdesi, yalnız CRLF/LF normalizasyonuyla yerel dosyalarla birebir eşleşti. Çıktı 17 restrictive MFA politikasını ve submitted_at/purged_at koşulları bulunan iki dealer okuma politikasını içeriyor. Bu kapsamdaki önceki değişikliklerin yeniden uygulanması gerekmiyor.

security_private şeması, muafiyet ve kanıt tabloları yok; e-posta fonksiyonları ve security_email_required politikaları yok. 004/005 bekliyor. Migration geçmişi de yok; bu bilgi şemanın boş olduğu anlamına gelmiyor. Sonraki adım yalnız 004 hazırlık migration'ı ve production-email-preparation-check.sql kontrolü. 005, SMTP/OTP doğrulaması ve uygulama geçişiyle birlikte sonraki adımda uygulanacak. Paylaşılan çıktı SQL davranış testlerinin veya SMTP testinin yerine geçmez.

## 004 sonrası doğrulama

Kullanıcının sonraki production-email-preparation-check çıktısı: exempt_accounts=4, accounts_outside_snapshot=0, email_policy_count=0; sorgudaki tüm güvenlik boolean'ları true. Dört mevcut hesap muafiyetle e-posta kapısını geçiyor, challenge alamıyor; private tablolarda RLS var, istemciler kanıt yazamıyor ve anon/authenticated/service_role muafiyet listesini genişletemiyor. Bu çıktı hesap parolalarının/MFA alanlarının öncesi-sonrası karşılaştırması değildir.

Canlı REST API üzerinden get_email_verification_status sıfır UUID ile tekrar çağrıldı: hata yok ve false döndü. Önceki PGRST202 engeli giderilmiş durumda. 004 tamamlandı; 005 politikaları, hosted SMTP/şablonlar, yeni hesap OTP testi ve ana alan adına promotion bekliyor. Tarayıcı bağlantısı bu turda da zaman aşımına düştüğünden SMTP durumu görülemedi. Mevcut hesaplara test e-postası veya Auth güncellemesi yapılmadı.

## Tamamlanan yayın — e-posta ertelendi

- Kullanıcı e-posta işinin tamamlanmamış olarak kalmasını istedi. Davranış ve açık riskler: [email-verification-deferred.md](email-verification-deferred.md).
- Production environment: `OTOPASS_EMAIL_VERIFICATION_REQUIRED=false`. 005 uygulanmadı; mevcut Auth hesaplarında değişiklik yapılmadı.
- Son deployment: `dpl_7n6jVqdBk3fyH1muzXhafn9c21aU`, READY; https://otopass-ifu8xjv26-emirs-projects-9e257263.vercel.app .
- Önce production environment ile --skip-domain derlendi, kontrollerden sonra Vercel promote başarılı oldu. www.otokopru.com sorgusu yeni deployment ID'sini döndürdü.
- Ana alan adı kontrolleri: /login 200 ve doğrulama bağlantısı yok; /login/verify-email 307 /login; oturumsuz /admin 307 /login; /api/health 200 ready/database reachable.
- Yerel: 182 test, TypeScript, production build ve diff kontrolü geçti. Lint 0 hata, 12 mevcut uyarı. Remote build yaklaşık 51 saniyede READY oldu.
- Runtime error sorgusu son 10 dakikada hata göstermedi; bu kısa gözlem aralığı uzun süreli izleme veya gerçek hesaplarla uçtan uca test değildir.
- Takip özelliğinin gerekli iki DB kolonu limit(0) salt okunur sorguyla doğrulandı. Yayın paketi 228 dosya; src altındaki 188 dosya tam, hassas yerel dosyalar hariç.
- Kaynak halen commit edilmemiş codex/security-hardening çalışma ağacı. Git commit/push yapılmadı; sonraki Git yayınının bu değişiklikleri içermesi gerekir.
- SMTP teslimatı, yeni hesap OTP testleri ve pgTAP ayrı açık işler olarak kalıyor. Mevcut hesaplara giriş/test/şifre/MFA/e-posta güncellemesi yapılmadı. Bootstrap betiği çalıştırılmadı.

## MFA issuer ve yardım akışı yayını

- Yeni izole production deployment: `dpl_2qR6Fc1qFuh5dacSXHfcJ5hB7C2x`, READY; https://otopass-bq76osaqo-emirs-projects-9e257263.vercel.app .
- Bu deployment yalnızca MFA kurulum ekranındaki iki dosyayı içerir: `MfaSetup.tsx` yeni TOTP faktörlerini `issuer: "otoKöprü"` ile oluşturur; `MfaHelpDialog.tsx` ilk kurulumda kılavuz yardımını gösterir.
- Deployment üretim alan adına promote edildi. `www.otokopru.com/login` HTTP 200, oturumsuz `/admin` HTTP 307 → `/login`, `/login/verify-email` HTTP 307 → `/login`, `/api/health` HTTP 200 (`ready`, `database: reachable`).
- Son 10 dakikalık Vercel runtime error sorgusunda hata yok.
- Doğrulama: 182 test geçti; MFA dosyaları için ESLint hatasız; TypeScript kontrolü geçti. Mevcut Authenticator kayıtları değiştirilmedi; `localhost:3000` görünen eski kayıtlar kullanıcı tarafında kalır, yeni kayıtlar `otoKöprü` adıyla oluşturulur.

## Demo MFA istisnası yayını

- Kullanıcının bildirdiği üzere `202609080006_demo_mfa_exemption.sql` production Supabase’de hatasız uygulandı.
- İstisna yalnızca `demo@otokopru.com` kimliğine tanımlıdır; diğer hesaplarda AAL2/MFA zorunluluğu korunur. Demo hesabının aktiflik, rol, parola değişimi ve e-posta kapıları devam eder.
- Bu migrationı kullanan uygulama deployment: `dpl_BWXhquMExYQX4PchMn1AGCbxEQBA`, READY; https://otopass-dgg96a72m-emirs-projects-9e257263.vercel.app . Üretim alan adına promote edildi.
- Canlı smoke testleri: `/login` 200, oturumsuz `/admin` 307 → `/login`, `/login/verify-email` 307 → `/login`, `/api/health` 200 (`ready`, `database: reachable`). Son 10 dakikada runtime error yok.
- MFA istisna davranışı için unit test eklendi; toplam 183 test geçti, TypeScript kontrolü başarılı.

## MFA koyu tema uyarlaması

- MFA kurulum ekranı login sayfasının nötr siyah/gri koyu tema token’larına taşındı; mavi global yüzeyler kaldırıldı. Login ile aynı logo, tema düğmesi, sayfa boşlukları ve arka plan düzeni kullanılıyor.
- MFA kartı, alanlar, butonlar ve yardım dialogu için `mfa.module.css` eklendi; açık tema renkleri korunuyor.
- Son production deployment: `dpl_DdjisZTE7f2kXEEuJvCuHv9CEEZb`, READY; https://otopass-n6qmekpdz-emirs-projects-9e257263.vercel.app . Üretim alan adına promote edildi.
- Canlı smoke testleri: `/login` 200, oturumsuz `/login/mfa/setup` 307 → `/login`, `/api/health` 200 (`ready`, `database: reachable`); son 10 dakikada runtime error yok.
