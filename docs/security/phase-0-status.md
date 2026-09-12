# Güvenlik çalışması — Faz 0 durum kaydı

Kayıt tarihi: 8 Eylül 2026 (Europe/Istanbul).
Yetkili kapsam: Faz 0 hazırlıkları. Kullanıcının son talimatıyla Supabase işleri yükseltme sonrasına ertelendi; sıradaki bağımsız adımlar olan güvenlik dalı ve migration geri dönüş prosedürü hazırlandı. Önceki iki adımlık ilerleme düzeni korunarak bu turda 5 ve 6 ele alındı.

## 1. Başlangıç kaydı

Yerel kayıt tamamlandı ve dosya bütünlüğü doğrulandı.

- Dal: `main`
- HEAD: `d0a6df1e967a5a28d329f52354006902609290f5`
- Kayıt anında: 12 değişmiş takipli dosya, 29 yeni dosya; staged değişiklik yok.
- 278 dosyanın çalışma kopyası ve SHA-256 özeti saklandı.
- Git geçmişi ve referansları `repository.bundle` içinde saklandı; bundle doğrulandı.
- Çalışma değişiklikleri `working-tree.patch`, staged durumu `index.patch` içinde kaydedildi.
- 14 yerel migration'ın hash değerleri kaydedildi. Sonuncusu `202609070002_application_tracking.sql` henüz Git tarafından takip edilmiyordu.

Yerel kayıt dizini:
`.local-data/security-phase0/baseline-2026-09-07T21-36-39-203Z/`

Envanter: `manifest.json`. Ayrı bir dizine geri yükleme açıklaması: `RESTORE.md`.
Kayıt betiği: `.local-data/security-phase0/capture-baseline.mjs`.

Bu kayıt aynı diskteki yerel bir geri dönüş noktasıdır; bağımsız felaket kurtarma yedeği veya production veritabanı yedeği değildir. Ortam dosyaları ve çalışma zamanı verileri kapsam dışıdır. Git bundle geçmişi de içerdiğinden erişimi sınırlı tutulmalıdır; geçmişin secret taramasından geçtiği iddia edilmemektedir.

### Migration durumu sınırı

Yerel migration envanteri doğrulandı. Doğru Chrome profili bağlandıktan sonra production projesine erişildi. Dashboard'daki Database Migrations ekranı kayıtlı migration göstermiyor; “Run your first migration” mesajı görüntüleniyor. Bu, şemanın boş olduğunu veya yerel SQL değişikliklerinin hiç uygulanmadığını kanıtlamaz; manuel SQL ile uygulanmış değişiklikler migration geçmişinde yer almayabilir. Yerel 14 migration ile canlı şemanın eşleşmesi **doğrulanması gerekiyor**. CLI çalışma dizini halen bir projeye bağlı değil.

Kanıt sayfası: https://supabase.com/dashboard/project/dtfkzquumjdeptkyoyfh/database/migrations
Başlangıç manifesti ilk kayıt anını korur; daha sonra edinilen bu gözlem burada ek kayıt olarak tutulur.

## 2. Bağımsız staging

**Durum: kullanıcı talimatıyla yükseltme sonrasına ertelendi; bulut projesi oluşturulmadı.**

- İzole hazırlık dizini: `.local-data/security-phase0/staging-workspace/`.
- Yerel proje adı: `otokopru-staging`.
- Başlangıç kaydındaki 14 migration bu dizine kopyalandı; her kopyanın SHA-256 değeri doğrulandı.
- Production anahtarları, kullanıcılar ve veriler kopyalanmadı. Hiçbir migration uzaktan çalıştırılmadı.
- Kopyalanan CLI yapılandırması yerel geliştirme başlangıç noktasıdır; bulut Auth/Storage ayarlarının uygulanmış veya production ile eşleşmiş olduğu anlamına gelmez.

Kullanıcının belirttiği Chrome `etsy` / `Profile 6` profili bağlandı ve doğru production projesine erişim doğrulandı:

- Organizasyon: `polcar` (`ryvricimdavbhxsrqoiy`), Free plan.
- Production projesi: `polcarr` (`dtfkzquumjdeptkyoyfh`).
- Production bölgesi: South Asia (Mumbai), `ap-south-1`.
- Production durum göstergesi: Healthy; compute: nano.
- Bu organizasyonun proje listesinde yalnızca `polcarr` görünüyor; mevcut staging görünmedi.

### Güncel engel: ücretsiz proje kotası

Yeni proje oluşturma sayfası, hesabın organizasyonlar genelinde sahip/yönetici olduğu aktif ücretsiz projeler için **2 proje sınırına** ulaştığını belirtiyor. `Create new project` düğmesi devre dışı. Sayfa, devam etmek için başka bir projenin duraklatılması/silinmesi veya planının yükseltilmesi gerektiğini bildiriyor.

Kanıt sayfası: https://supabase.com/dashboard/new/ryvricimdavbhxsrqoiy

Kullanıcı `chatbt` projesinin duraklatılmasına izin verdi. `chatbt` organizasyonundaki tek proje `WP CHATBOT UYGULAMASI DB` (`ibyuredgbydxagvyurit`), dashboard'da zaten “Project is paused” durumunda. Bu nedenle herhangi bir duraklatma işlemi yapılmadı ve kota açılmadı.

Kota engelinin kaynağını belirlemek için proje listeleri kontrol edildi:

| Organizasyon | Proje | Gözlenen durum |
| --- | --- | --- |
| chatbt | WP CHATBOT UYGULAMASI DB (`ibyuredgbydxagvyurit`) | Duraklatılmış |
| feedbackArttırıcı | feedbackxd (`hkktxtubroashuyclacp`) | Duraklatılmış |
| menupix | menupix (`cdkeexmudegzzcamsvan`) | Aktif nano proje; duraklatma uyarısı yok |
| polcar | polcarr (`dtfkzquumjdeptkyoyfh`) | Aktif production projesi |

Hiçbir proje duraklatılmadı veya silinmedi; ücretli plan değişikliği yapılmadı. `chatbt` için verilen izin başka bir projeye uygulanmadı. Kullanıcı **menupix'in duraklatılmasını açıkça reddetti**. Son karara göre kota açmak amacıyla başka projeye müdahale edilmeyecek; kullanıcı yükseltme yaptıktan sonra staging adımına dönülecek. Bu kayıt bir otomatik takip veya plan yükseltme talimatı değildir.

### Kota açıldığında bu adımın kalan işleri

1. Organizasyonun proje listesini tekrar kontrol et; aynı adlı staging bu sırada oluşturulmuşsa yeniden oluşturma.
2. Mevcut planın izin verdiği kapsamda ayrı staging projesi oluştur; bölge ve Postgres sürümünü production ile karşılaştırarak seç. Ücretli plan değişikliğini kapsam dışında tut.
3. Staging proje kimliğinin production'dan farklı olduğunu doğrula. Yönetim bağlantısını yalnızca izole staging çalışma dizininde kur.
4. Bağımsız staging anahtarlarını gizli ortam yapılandırmasında tut; production deployment değişkenlerine dokunma.
5. Projenin sağlığını ve ayrılığını kontrol et; proje kimliği, bölge, sürüm ve sonuçları bu kayda ekle.

## 3. RLS, MFA, Auth ve workflow test kullanıcıları

**Durum: tekrar kullanılabilir SQL test verileri ve kontrol dosyası hazır; veritabanında çalıştırma ve gerçek Auth hesapları bekliyor.**

- `supabase/tests/fixtures/security-actors.sql`: 13 kullanıcı profili, 3 galeri, 4 başvuru; parola, canlı e-posta, oturum veya MFA sırrı içermez.
- `supabase/tests/database/security-actors.test.sql`: ortak verileri kullanan 9 pgTAP kontrolü; tenant ayrımı, viewer yetkisi, pasif kullanıcı/galeri, üyeliği olmayan rol ve doğrudan admin rol yükseltmesini kapsar.
- `docs/security/test-accounts.md`: test kimlikleri, MFA/e-posta sınırları ve staging üzerinde tamamlanacak doğrulamalar.

Kontroller yalnız test transaction'ı içinde kullanıcı oluşturur ve `ROLLBACK` ile geri alır. Gerçek giriş yapılabilir Auth hesabı veya TOTP faktörü oluşturmaz. Test dosyası migration değildir; production'a uygulanmaz.

Doğrulama denemesi: `npm run test:db`, `127.0.0.1:54322` bağlantısında `ECONNREFUSED` ile durdu. Testler yürütülemedi ve başarılı kabul edilmedi. Uygulama davranışı veya production ayarları değiştirilmedi.

Bu adımın tamamlanması için izole Supabase üzerinde testlerin geçmesi, gerçek giriş yapılabilir hesapların oluşturulması ve e-posta/MFA akışlarının doğrulanması gerekir.

## 4. Canlı function ACL, RLS, backup/PITR ve Auth snapshot'ları

**Durum: Supabase işiyle birlikte kullanıcı talimatıyla ertelendi.** Yerel SQL dosyaları canlı ayarların snapshot'ı olarak değerlendirilmez. Bu turda Supabase'e bağlanılmadı.

## 5. Ayrı güvenlik dalı

**Durum: tamamlandı.** `main` üzerindeki `d0a6df1e967a5a28d329f52354006902609290f5` commit'inden `codex/security-hardening` dalı açıldı. Önceki commit edilmemiş çalışmalar aynı çalışma ağacında korundu; stash/reset, commit, push veya deployment yapılmadı.

## 6. İleri migration ve geri dönüş prosedürü

**Durum: prosedür ve değişiklik kaydı şablonu hazır.**

- `docs/security/migration-recovery.md`: 14 mevcut migration için veri etkisi ve kurtarma yolu; transaction, şema/uygulama uyumluluğu, yetki kontrolleri ve hata sonrası doğrulama.
- `docs/security/migration-change-template.md`: her yeni migration için ileri/geri dönüş, snapshot, veri koruma ve test kanıtı alanları.

Yeni güvenlik migration'ı henüz yazılmadığından ona özel ters SQL/test sonucu mevcut değildir. Canlı tanımlar ve veri yedeği bilinmeden geri dönüş SQL'i uydurulmadı. Restore tatbikatı ile migration uygulama/doğrulama Supabase yeniden ele alındığında tamamlanacaktır.

## Sonraki çalışma

Faz 0'ın Supabase'e bağlı çıkış kriterleri halen açık. Bu kayıt tüm fazın tamamlandığını belirtmez. Kullanıcının sırayla devam talimatıyla Faz 1'in ilk iki düzeltmesi yerelde ele alındı; güncel durum `docs/security/phase-1-mfa-admin.md` dosyasındadır. Canlı Supabase ayarı/migration yayını, gerçek Auth/MFA testleri ve restore işlemleri ertelenmiş kalır.
