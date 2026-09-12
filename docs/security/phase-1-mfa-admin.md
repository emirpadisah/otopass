# Faz 1 — MFA ve admin yetki sınırları

Durum: `codex/security-hardening` dalında yerel uygulama. Canlı Supabase'e migration'ları kullanıcı SQL Editor üzerinden uyguladı; bu çalışma sırasında agent tarafından canlı Supabase veya production deployment'a yazma yapılmadı. E-posta sahipliği doğrulamasının tamamı bu iki düzeltmenin kapsamına dahil edilmedi; önceki plandaki ayrı Auth çalışması olarak açık kalır.

Canlı doğrulama kaydı: 8 Eylül 2026. Kullanıcının SQL Editor üzerinden migration'ları çalıştırmasının ardından production projesinde salt okunur kontroller uygulandı. Kontroller, üretim verisini veya hesapları değiştirmedi.

## MFA değişikliği

- `getRequestAccessContext`, doğrulanmış `getClaims()` sonucundan oturumun AAL bilgisini alır. Eksik, hatalı veya tanınmayan değerler erişim vermez.
- `requireUser` ve panel yetki kontrolleri AAL2 ister. Kurulum için gereken düşük yetkili giriş, ayrı `requireAuthenticatedUser` ile yalnız login/MFA/parola akışında tutulur.
- Korunan veri bağlamı AAL2, aktif hesap ve tamamlanmış parola değişimi ister. Galeri üyeliği, fotoğraf API'sinde kullanılan kullanıcı kimliği ve followup erişimi bu bağlamdan geçer.
- Login, admin ve galeri kullanıcılarını panel dışındaki MFA kurulum/doğrulama sayfasına yönlendirir. Doğrulama sonrası sunucu tekrar karar verir; kullanıcı kontrollü serbest yönlendirme adresi kullanılmaz.
- Mevcut doğrulanmış faktörü olan hesabın parola yenilemesi AAL1 ile ilerleyemez. İlk faktörü bulunmayan hesabın parola bootstrap akışı açık kalır, panel erişimi AAL2 ister.
- Kurulum ekranı otomatik olarak faktör silmez. Yeni TOTP kurulumu açık kullanıcı işlemiyle başlar. Faktör listesi veya doğrulama hatası erişime dönüşmez.
- Yerel geliştirme Auth'u ayrı tutulur; `local` oturum etiketi production'da kabul edilmez ve JWT'den `local` etiketi alınmaz.

Yeni SQL: `supabase/migrations/202609080001_require_mfa.sql`.
SHA-256: `df460eee2bf0e6178faa3e5ca53fce4d26160fc871040406a2addb8984b6bfaa`.

SQL; `current_user_is_active()` ve `current_user_has_role(text)` üzerinden kullanıcıya bağlı RPC'leri sınırlar. RLS etkin public tablolarına ve `storage.objects` üzerine authenticated AAL2 için restrictive policy ekler. Mevcut izin/tenant politikalarının yerine geçmez. Service-role ile çalışan public başvuru ve bootstrap okumaları ayrı uygulama yetki kontrollerine bağlı kalır. Sonradan eklenecek tablolar kendi MFA politikasını da tanımlamalıdır.

## Admin değişikliği

- Normal admin başka admin/super_admin hesabının rolünü veya aktiflik durumunu değiştiremez; yeni admin oluşturamaz ve galeri kullanıcısını admin'e yükseltemez.
- Galeri rollerinin yönetimi normal admin için korunur. UI seçenekleri ve server action aynı sınırı uygular; değiştirilmiş form isteği de kontrol edilir.
- Doğrudan geçici parola atama yalnız super_admin içindir. Auth parola API'si ile rol değişimi aynı DB transaction'ını paylaşmadığından, normal admin'e bu yetkinin bırakılması eşzamanlı yükseltme sırasında hedef kontrolünü geçersiz kılabilir. Kullanıcının kendi parola yenileme akışı devam eder.
- DB RPC, hedefin mevcut tüm rollerini transaction içinde okur ve yeni rolü birlikte değerlendirir. Mevcut global advisory lock ve son aktif super_admin kontrolü korunur; hedef satırlar da kilitlenir. Audit kaydı önceki rolleri içerir ve rol değişimiyle aynı transaction'dadır.

Yeni SQL: `supabase/migrations/202609080002_admin_access_boundaries.sql`.
SHA-256: `b90403b52b06e272a5a24a0871c80158d395988f6139be346665e6d9d9355876`.

Bu değişiklik tüm admin işlemlerini tek transaction'a taşımaz: Auth kullanıcı silme/parola API'si ile Postgres arasında dağıtık transaction yoktur. Parola değişimi audit hatası, kullanıcı silme ile eşzamanlı son-super-admin kontrolü ve oturumların tam iptali sonraki operasyonel/hesap güvenliği doğrulamasında ayrıca ele alınmalıdır.

## İleri uygulama ve geri dönüş kaydı

| Alan | Karar / durum |
| --- | --- |
| Hedef proje | BEKLİYOR — kullanıcı Supabase işini erteledi. |
| Önceki canlı function/ACL/policy ve Auth snapshot | BEKLİYOR — dosyalar canlı tanım olarak kabul edilmez. |
| Veri dönüşümü | İki migration da mevcut kullanıcı verisini topluca dönüştürmez; fonksiyon/policy değiştirir. |
| Transaction | Her dosya kendi BEGIN/COMMIT bloğunda; iki dosya tek atomik değişiklik değildir. |
| Uyumluluk | Önce MFA kurulum sayfası ve server guard içeren kod izole ortamda çalışmalı. Ardından 001 ve 002 sırasıyla uygulanıp doğrudan API testleri tamamlanmalı. Bu, production yayın onayı değildir. |
| Bootstrap | En az bir aktif super_admin için gerçek TOTP kurulum/challenge ve güvenli hesap kurtarma yolu test edilmeli; yalnız ilk parola ile panele erişim istisnası yok. |
| Geri dönüş | Commit öncesi transaction rollback. Commit sonrası AAL1 erişimi veya eski peer-admin yetkisini geri açmak yerine hatalı fonksiyon/policy üzerinde yeni ileri düzeltme. Gerekirse etkilenen panel yolunu sınırla. |
| Ters SQL | Canlı snapshot ve güvenli önceki tanım doğrulanmadığından hazırlanmadı; eski geniş izinleri otomatik geri getiren down migration yok. |
| Auth/Storage etkisi | Token/faktör iptali SQL rollback ile geri gelmez. Eski JWT'lerin süresi ve gerçek faktör değiştirme/recovery davranışı staging'de doğrulanmalı. |

## Doğrulama

- Birim/regresyon: 153 test geçti; yeni 11 MFA erişim testi ve 2 rol yönetimi testi dahil.
- TypeScript kontrolü geçti (uygulama değişiklikleri sonrası).
- Production build geçti. Lint: 0 hata, 12 uyarı (mevcut kaynak/çıktılar ve başlangıç yedeğinin taranması dahil).
- Veritabanı: yeni `mfa-admin-boundaries.test.sql` içinde 11 kontrol hazır. Önceki RLS/followup testleri AAL2 pozitif senaryo claim'iyle güncellendi. Kullanıcı Supabase'i ertelediğinden SQL testleri bu turda çalıştırılmadı; önceki bağlantı denemesi ECONNREFUSED idi.
- Gerçek TOTP enrollment/challenge, e-posta akışı, Auth token/faktör recovery, doğrudan REST/RPC ve eşzamanlı DB testleri BEKLİYOR.

## Canlı salt okunur doğrulama sonucu

Production proje: `polcarr` (`dtfkzquumjdeptkyoyfh`).

- `current_user_is_active()` mevcut; `security definer`, `search_path = pg_catalog, public`, anonim `EXECUTE=false`, authenticated `EXECUTE=true`; gövde hash'i beklenen migration ile eşleşti.
- `current_user_has_role(text)` aynı owner/search_path/izin sınırlarına sahip ve gövde hash'i eşleşti.
- `admin_update_user_access(uuid,text,text,uuid,boolean)` mevcut; `security definer`, doğru `search_path`, anonim `EXECUTE=false`, authenticated `EXECUTE=true`; gövde hash'i eşleşti.
- `security_mfa_required` restrictive policy'si **17** tabloda mevcut; `storage.objects` dahil. Hepsi authenticated rolü, `FOR ALL`, AAL2 `USING` ve AAL2 `WITH CHECK` koşullarıyla eşleşti. RLS açık public tablolarda MFA policy eksikliği görülmedi.
- AAL1 simülasyonu: admin yardımcı fonksiyonu `false`, `applications`, `user_profiles` ve `user_roles` sorguları boş; galeri erişimi `false`.
- AAL2 simülasyonu: mevcut aktif admin için admin yardımcı fonksiyonu `true`; aktif galeri üyeliği için tenant erişimi `true`.
- Tanımsız kullanıcı UUID'si: admin erişimi ve application okuması `false`.
- SQL Editor her sorguyu `BEGIN READ ONLY ... COMMIT` içinde çalıştırdı; kalıcı satır değişikliği yapılmadı.

Migration ekranı hâlâ “No migrations” gösteriyor ve `supabase_migrations.schema_migrations` tablosu bulunmadı. Bu, SQL'in çalışmadığını kanıtlamaz; migration'lar SQL Editor'da manuel uygulandığı için CLI migration geçmişine kaydedilmemiş olabilir. Bu nedenle canlıda dosya sürüm takibi ve tekrar çalıştırma güveni henüz sağlanmış değildir. İleride `supabase migration repair` veya eşdeğer kayıt işlemi, canlı şema birebir karşılaştırıldıktan sonra yapılmalıdır; körlemesine repair/push yapılmamalıdır.

Production'da pgTAP kurulu görünmüyor. `mfa-admin-boundaries.test.sql` ve diğer DB testleri veri yazıp rollback yaptığı için production'da çalıştırılmadı. Gerçek testler staging veya disposable local Supabase üzerinde yapılmalıdır.

Canlı açıklar kapandı veya migration'lar doğrulandı olarak işaretlenmemelidir. Yayın öncesinde izole Supabase testleri ve bu kayıttaki bekleyen kontroller tamamlanmalıdır.
