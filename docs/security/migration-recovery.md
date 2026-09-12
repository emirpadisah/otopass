# Güvenlik migration'ları: uygulama ve geri dönüş prosedürü

Durum: yerel hazırlık. Hiçbir migration çalıştırılmadı, production şeması değiştirilmedi ve restore tatbikatı yapılmadı. Canlı function/RLS/ACL, Auth ve backup/PITR snapshot'ları kullanıcı talimatıyla Supabase işiyle birlikte ertelendi.

## Başlangıç ve çalışma dalı

- Çalışma dalı: `codex/security-hardening`.
- Dalın başlangıç commit'i: `d0a6df1e967a5a28d329f52354006902609290f5`.
- Commit edilmemiş önceki çalışmalar aynı çalışma ağacında korunur. Dal açmak bu dosyaları commit etmez veya başka bir diske yedeklemez.
- İlk yerel kaydın dizini: `.local-data/security-phase0/baseline-2026-09-07T21-36-39-203Z/`.
- Canlı şema ile 14 yerel migration'ın eşleşmesi henüz doğrulanmadı. İlk kayıt Git ve dosya kurtarma içindir; veritabanı veya Storage yedeği değildir.

## Her yeni migration için uygulanacak akış

1. `migration-change-template.md` şablonundan değişikliğe özel kayıt oluştur. Etkilenen fonksiyonların tam imzalarını, policy adlarını, tablo/kolonları ve çağıran uygulama sürümünü belirt.
2. Supabase çalışması yeniden başladığında hedef proje kimliğini ve canlı şema sürümünü doğrula. Migration geçmişi boş görünüyorsa yerel dosyaları topluca uygulama veya geçmişi kanıtsız biçimde “uygulandı” olarak işaretleme; önce şema farkını çıkar.
3. Değişecek function tanımı, owner, `search_path`, security-definer durumu, grants, RLS etkinlik/force durumu, policy tanımı ve ilgili constraint/index tanımlarının önceki halini kaydet. Veri dönüşümü varsa etkilenen satırların erişimi sınırlı yedeğini ve bağımsız Storage nesne kurtarma yolunu doğrula.
4. Yeni ileri migration oluştur. Uygulanmış eski dosyayı düzenleme. Geri dönüş SQL'ini otomatik uygulanacak `supabase/migrations/` dizinine sırf taslak olarak koyma; değişiklik kaydı yanında incelemeye hazır tut. Kullanılmasına karar verilirse yeni ileri düzeltme migration'ı olarak sürümle.
5. Uygulama ile şema uyumluluğunu belirle: önce eklemeli şema, sonra onu kullanan kod, en son eski alanın kaldırılması. Eski sürüm güvenlik açığını yeniden açıyorsa bu sürüme deployment rollback kullanma.
6. Migration'ın transaction sınırını açıkça belirt. CLI'nin bütün dosyaları tek transaction'da çalıştırdığını varsayma; bağımsız uygulanabilen adımları ve kısmi hata durumunu test et. `CREATE INDEX CONCURRENTLY` gibi transaction dışı işler için ayrı kurtarma adımı gerekir. Kilit ve statement timeout değerlerini test ölçümünden sonra belirle.
7. İzole veritabanında ileri migration'ı, değişikliğe özel negatif/pozitif güvenlik testlerini ve geri dönüş yolunu çalıştır. Sonrasında ileri migration'ın yeniden uygulanabilirliğini veya yeni ileri düzeltmenin başarılı olduğunu doğrula.
8. Yayın kaydına hedef proje, migration SHA-256, uygulama commit/deployment kimliği, başlangıç/bitiş zamanı, test sonucu ve geri dönüş kararını ekle. Parola, token, JWT ve kişisel verileri bu kayda koyma.

## Hata halinde karar sırası

| Durum | Uygulanacak prosedür | Tekrar doğrulama |
| --- | --- | --- |
| Transaction commit edilmeden hata | Transaction'ı rollback et; şema/veri ve migration geçmişinin beklenen durumda kaldığını kontrol et. | Önceki sürüm smoke testi; kilitlerin kalkması; RLS/ACL karşılaştırması. |
| Eklemeli şema sonrası uygulama hatası | Yeni kolon/tabloyu koru; uyumlu ve güvenli önceki uygulama sürümüne dön veya ileri kod düzeltmesi yap. | Eski kodun yeni şemada çalışması; yeni verilerin korunması. |
| Function/policy/ACL hatası | Sorunlu erişim yolunu sınırla ve dar kapsamlı ileri düzeltme uygula. Gerekirse yalnız kanıtlanmış güvenli önceki tanımı owner/grants/search_path ile birlikte geri getir. | Anon, authenticated AAL1/AAL2, viewer/manager/admin, tenant ayrımı; doğrudan REST/RPC. |
| Veri dönüşümü veya silme sonrası kayıp | Ek yazmaları etkisi belli yöntemle durdur. Doğrulanmış yedeği izole hedefe restore et, farkı çıkar, yeni işlemleri koruyacak uzlaştırma hazırla. | Satır sayısı, ilişkiler, anlamlı örnek kayıtlar, audit ve Storage tutarlılığı. |
| Auth/MFA ayarı nedeniyle giriş sorunu | Parola/MFA/e-posta korumasını topluca devre dışı bırakma; etkilenen akışı sınırla, güvenli kurtarma erişimi ve ileri düzeltme kullan. | Gerçek Auth oturumlarıyla doğrulanmamış e-posta, recovery, AAL1/AAL2 ve oturum iptali. |

Deployment geri almak tek başına yazmaları durdurmaz: doğrudan Supabase istemcileri, cron ve diğer çalışanlar ayrıca değerlendirilmelidir. SQL transaction rollback'i e-posta, harici API çağrısı, silinmiş Storage nesnesi veya iptal edilmiş Auth oturumunu geri getirmez.

Production restore/silme gibi veri etkili işlemler bu hazırlık kapsamında uygulanmaz. Kurtarma adımı, etkilediği veri ve kabul edilen kayıp aralığı somutlaştırılarak ayrıca değerlendirilir. Çalıştığı doğrulanmamış PITR veya bakım modu varmış gibi davranılmaz.

## Mevcut 14 migration için kurtarma envanteri

Aşağıdaki yollar dosya incelemesine dayanır. Canlı öncesi snapshot ve restore testi olmadığı için çalıştırılabilir ters SQL veya doğrulanmış kurtarma garantisi değildir. Tarihsel dosyalar değiştirilmedi.

| Migration | Değişiklik / veri etkisi | İleri düzeltme ve geri dönüş yolu |
| --- | --- | --- |
| `202608170001_baseline.sql` | Temel tablolar, yardımcı fonksiyonlar, constraint ve RLS. | Tabloları topluca düşürme. Hatalı nesneyi yeni migration ile düzelt; tam şema kaybında doğrulanmış yedekten izole restore gerekir. |
| `202608170002_production_hardening.sql` | Şema/ACL/RPC eklemeleri ve mevcut satırlarda normalizasyon, durum düzeltmeleri, submitted_at backfill. | Şema ve veri kurtarmayı ayır. Normalleştirilmiş eski değerler yalnız ters SQL ile çıkarılamaz; önceki satır yedeği gerekir. Eski geniş yetkileri geri açma. |
| `202608170003_remove_transactional_email.sql` | Outbox tablo/fonksiyonu ve marketing_consent kolonu kaldırılıyor, ayar/RPC değişiyor. | Kolonu veya tabloyu yeniden oluşturmak eski veriyi getirmez. Gerekli veri yedekten seçilerek kurtarılır; eski kuyruk kayıtlarını yeniden gönderime açma. Yeni Auth e-postası akışı bu eski iş bildirim kuyruğundan ayrı değerlendirilir. |
| `202608220001_vehicle_body_condition.sql` | body_condition JSON alanı, doğrulayıcı ve constraint. | Alanı ve veriyi koru; hatalı doğrulayıcı/constraint'i ileri düzelt. Kolon kaldırmayı uygulama geri dönüşü için şart koşma. |
| `202608220002_dealer_branding_domains.sql` | Domain tablosu, RLS/resolver ve dealer-assets bucket ayarları. | Domain kaydı/nesneleri koru; resolver ve bucket ayarlarını önceki güvenli snapshot'a göre düzelt. DNS/Vercel alan adı değişiklikleri SQL geri dönüşüyle geri alınmaz. |
| `202608220003_application_deletion.sql` | Silme RPC'sini tanımlar; çağrıldığında ilişkili kayıtlar silinebilir. | RPC düzeltmesi gelecekteki çağrıları etkiler; daha önce silinen başvuru/fotoğrafı geri getirmez. Veri ve Storage kurtarması ayrı yapılır. |
| `202608230001_dealer_contact_social_links.sql` | İletişim alanları, social_links normalizasyonu ve eski alanlardan taşıma. | Yeni alanları koru; dönüşüm hatasında satır bazlı önceki değerlerle düzelt. Sonradan kullanıcı tarafından düzenlenen linkleri ezme. |
| `202608240001_application_engine_info.sql` | engine_info alanı ve uzunluk constraint'i. | Alanı koru; sadece constraint veya onu kullanan kodu uyumlu biçimde düzelt. |
| `202608240002_security_hardening.sql` | Admin mutation politikaları, RPC/ACL, rate limit, audit koruması ve constraint'ler. | Eski geniş yazma yetkilerini geri yükleme. Yeni ileri migration ile erişim hatasını düzelt; admin rol/parola ve audit negatif testlerini tekrar çalıştır. |
| `202608250001_require_application_photos.sql` | Finalize RPC'sine fotoğraf kontrolleri. | Hatalı doğrulamayı dar kapsamlı düzelt; fotoğrafsız başvuruyu onaylayan eski fonksiyonu geri getirme. Upload/finalize tutarlılığını kontrol et. |
| `202608290001_panel_performance.sql` | Listeleme, dashboard, erişim bağlamı ve rate limit RPC'leri. | Fonksiyon imzaları ile çağıran kodu birlikte ele al. Önceki güvenli tanım/grants ile uyumlu geri dönüş veya ileri düzeltme yap; sayfalama ve yetki sonuçlarını karşılaştır. |
| `202609050001_application_followups.sql` | Followup tablosu/RPC'leri, purge ve başvuru sıralaması. | Notları/reminder'ları koru; RPC/sıralamayı ileri düzelt. Purge çalıştıysa silinen notlar fonksiyonu geri almakla dönmez. |
| `202609070001_offer_links.sql` | Token hash ve yanıt tablosu, public yanıt RPC'si. | Link/yanıt kayıtlarını koru; sorunlu public erişimi sınırla ve RPC'yi düzelt. Eski token yanıtlarını yeniden etkinleştirme; kabul edilmiş iş akışını körlemesine ters çevirme. |
| `202609070002_application_tracking.sql` | Nullable tracking_token_hash/review_started_at alanları ve unique indeks. | Önceki uygulama sürümüyle uyumluluğu test ederek alanları koru. Link iptali gerekiyorsa hedefli yap; hash kolonu kaldırarak tüm erişim bilgisini kaybetme. |

## Çıkış kriteri

Bu belge prosedür hazırlığını tamamlar. Yeni bir güvenlik migration'ının yayınlanabilir sayılması için kendi değişiklik kaydı, ileri SQL'i, güvenli geri dönüş kararı, canlı öncesi kanıtları ve başarılı izole test sonuçları ayrıca gerekir. Supabase ertelenmişken bu koşullar tamamlanmış olarak işaretlenmez.
