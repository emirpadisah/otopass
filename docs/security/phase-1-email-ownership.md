# Faz 1 — Yalnız yeni hesaplar için e-posta doğrulaması

8 Eylül 2026. Kullanıcının son talimatı: mevcut hesaplar bu yeni kurala tabi değildir; yalnız bundan sonra açılan hesaplar e-posta sahipliğini doğrular. Önceki belgedeki mevcut hesapları yeniden doğrulama zorunluluğu bu kararla kaldırıldı. Canlı hesap, Auth ayarı veya deployment bu turda değiştirilmedi.

## Mevcut ve yeni hesap ayrımı

**Güncel karar:** SMTP/e-posta doğrulaması kullanıcı talimatıyla ertelendi. 004 canlıda dört hesabı muaf tutuyor; 005 uygulanmayacak. Uygulama erteleme ayarı ve yeniden etkinleştirme koşulları [tamamlanmamış iş kaydında](email-verification-deferred.md). Aşağıdaki zorunlu doğrulama tasarımı, yeniden etkinleştirme sonrasındaki hedef davranıştır.

004 migration'ı çalıştığında o anda `auth.users` içinde bulunan kullanıcı kimlikleri bir kez `security_private.email_verification_exemptions` tablosuna kaydedilir. Kısa süreli SHARE kilidiyle eşzamanlı kullanıcı oluşturma snapshot tamamlanana kadar bekler. Kesim noktası migration'ın snapshot'ıdır; uygulama deployment zamanı veya kullanıcı tarafından değiştirilebilen `created_at` alanı değildir.

Bu liste yalnız kullanıcı kimliği içerir; hesapların e-posta, parola, MFA, rol veya aktiflik alanları değiştirilmez. Muafiyet e-posta sahipliğinin kanıtı olarak etiketlenmez. Anon/authenticated/service_role listeyi genişletemez; sonraki hesaplar otomatik muaf olmaz. Hesap silinirse muafiyet cascade ile silinir. Migration tekrar çalıştırılarak liste yenilenmez; yayımlanmış snapshot'a yeni kullanıcı eklemek bu tasarımın parçası değildir.

Mevcut hesaplar için e-posta kapısı sağlanmış sayılır. Önceki MFA, parola değişimi, aktiflik ve tenant kontrolleri devam eder. Muaf hesaplar yeni gönderim/doğrulama action'larına elle istek yollasa bile uygulama Auth API'sine kod gönderme, doğrulama veya oturum kapatma çağrısı yapmaz.

## Yeni hesapların akışı

Yeni admin/galeri/bootstrap hesabı `email_confirm: false` ile oluşturulur. `/login/verify-email` sayfasında kullanıcı kendi isteğiyle kod gönderir. Public signup kapalı kalır. Henüz Auth onayı olmayan yeni hesapta `resend(type: signup)`; Auth tarafından onaylanmış ancak uygulama kanıtı olmayan yeni hesapta `signInWithOtp(shouldCreateUser: false)` kullanılır. İkinci yol, başarısız kayıt işlemi sonrası tekrar doğrulama gibi durumları da kapsar.

Kod `verifyOtp(type: email)` ile doğrulanır. Her işlem ayrı anonim istemci kullanır. Dönen oturum tarayıcı çerezine veya yanıta aktarılmaz; yalnız bu geçici oturum için signOut denenir. Doğrulama sonrasında kullanıcı normal parola/MFA ekranından devam eder. Bu uygulama davranışı, Supabase'in diğer Auth yöntemlerini platform genelinde kapattığı anlamına gelmez.

Kanıt RPC'si yalnız service_role tarafından çağrılabilir. Kullanıcı kimliği ve onay zamanı başarılı OTP yanıtından alınır, form/metadata bayrakları kullanılmaz. Güncel Auth e-postası, onay zamanı ve aktif profil transaction içinde eşleştirilir; muaf hesaplarda RPC kayıt yapmaz. Kanıt ve `EMAIL_OWNERSHIP_VERIFIED` audit olayı atomiktir.

`security_private.email_verifications` API'ye açılmaz, RLS açıktır ve istemci izinleri yoktur. Kanıt adres/onay zamanına bağlıdır; yeni hesabın adresi veya onay zamanı değişirse yeniden doğrulama gerekir. Kullanıcı silinince kanıt silinir. Audit metadata'sı kod, e-posta veya token içermez; kanıt tablosundaki e-posta kişisel veri envanterinin parçasıdır.

## Erişim kontrolü

Uygulamanın ve SQL'in kullandığı `get_email_verification_status`, **muaf mevcut hesap VEYA geçerli yeni hesap kanıtı** varsa true döner. `emailVerified` alanı bu kapının sonucudur, bütün mevcut hesapların posta kutusunun doğrulandığı iddiası değildir.

`getProtectedAccessContext` ve `requireAuthenticatedUser` yeni doğrulamasız hesabı panelden engeller. 005 migration'ı aynı şartı `current_user_is_active` ve public RLS tabloları/Storage üzerindeki restrictive politikalarla DB/RPC erişimine uygular. Kanıt sorgusu hata verirse erişim verilmez. Sonradan eklenen RLS tablolarına MFA/e-posta politikaları ayrıca eklenmelidir. Servis rolünün erişimi uygulama guard'larıyla korunur.

## Limitler ve hosted ayarlar

Gönderim: adres başına 5/saat, IP başına 20/saat ve adres başına 1/60 saniye limiter kovası. Kod kontrolü: adres başına 10/10 dakika, IP başına 40/10 dakika. Limiter hata verirse işlem ilerlemez. Muaf/bulunmayan hesap ve sağlayıcı teslimat hatası genel yanıt verir; mesaj teslimat garantisi değildir.

Yerel config yeni test ortamı içindir: signup kapalı, 8 haneli kod, 600 saniye süre ve Confirmation/Magic Link kod şablonları. Hosted Supabase bu dosyadan otomatik güncellenmez. **Mevcut hesaplara dokunmamak için hosted Auth onay bayrakları veya parola/MFA ayarları topluca değiştirilmez.** Yeni hesap şartını uygulama ve DB kapısı sağlar. SMTP ve şablon hazırlığı sırasında mevcut kurtarma akışının etkilenmediği doğrulanır; OTP süre ayarı diğer e-posta bağlantılarının süresini de etkileyebilir.

## Yayın sırası

1. Canlı şemayı dosyalarla karşılaştır; geçmiş boşken toplu db push/kanıtsız migration repair yapma. 003 dahil önceki bekleyen migration'ların durumunu doğrula.
2. Önce `202609080004_email_ownership_evidence.sql`: iki özel tablo, muafiyet snapshot'ı ve dört fonksiyon. Önceki sürümü henüz yayımlanmamış olan bu migration kullanıcının yeni talimatına göre güncellendi.
3. Yeni test hesabıyla hosted SMTP/kod şablonları ve kod doğrulamasını test et. Mevcut hesaplara test e-postası gönderme veya yeniden doğrulama isteme.
4. Uygulama sürümünü dağıt. **004 uygulanmadan bu sürüm dağıtılırsa eksik RPC yüzünden giriş sorgusu hata verir.** Mevcut hesabın aynı parola/MFA ile girişini, yeni hesabın doğrulamadan engellendiğini kontrol et.
5. `202609080005_require_email_ownership.sql` ile DB kuralını etkinleştir. Muaf mevcut oturumlar erişimini korur. 004–005 arasındaki geçişte yeni hesaplar için doğrudan DB e-posta şartı henüz etkin değildir; aynı yayın penceresinde tamamla.
6. Yeni hesabın doğru/yanlış/süresi dolmuş/tekrar kullanılmış kod, MFA, başka tenant ve e-posta değişimi senaryolarını doğrula. Mevcut hesaplarda mail gönderimi ve hesap değişikliği olmadığını kontrol et.

Her dosya ayrı transaction'dır. Commit öncesi hata rollback edilir; commit sonrası dar kapsamlı ileri düzeltme kullanılır. Yeni hesapları muafiyet listesine eklemek hata giderme yöntemi değildir. Auth kullanıcı kaydı güncellenmediğinden mevcut hesaplara yönelik parola/MFA/e-posta dönüşümü yoktur.

Güncel SHA-256: 004 `7fde32359c9c65213bfaf83d5500172498af9cf1ddf87c0bb763f1fcd5a0f5f4`; 005 `8080aee6a958a3974b6e0a208009a0b0ee1d9db8b575b75bafd4d4300573f71c`. Önceki sürümlerin hash değerleri artık geçerli değildir.

## Test durumu

- 30 dosyada 178 uygulama testi geçti. Yeni regresyon mevcut muaf hesapta gönderim/doğrulama/oturum değişikliği yapılmadığını kapsar.
- TypeScript kontrolü ve production build geçti. Lint: 0 hata, 12 mevcut uyarı.
- SQL testleri yeni hesap için kanıt, mevcut hesap için muafiyet, mevcut admin erişimi, muafiyetin MFA/aktiflik/tenant sınırlarını aşmaması, istemci/service_role muafiyet yazma yasağı ve yeni hesabın created_at/metadata ile muaf olamamasını kapsayacak şekilde güncellendi.
- pgTAP çalıştırılması yerel PostgreSQL bağlantısı olmadığı için bekliyor. Fixture'lar production'a uygulanmaz.
- Gerçek mail teslimatı, tarayıcı uçtan uca testi, canlı migration ve deployment bekliyor.

Referanslar: [Supabase OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [şablonlar](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Bunlar tasarım referansıdır; canlı ayar doğrulaması değildir.
