# Faz 1 — Taslak ve silinmiş başvuru izolasyonu

Durum: yerel uygulama ve migration hazır; bu değişiklik henüz Supabase'e uygulanmadı. Mevcut canlı migration geçmişi boş göründüğünden, canlı şema dosyalarla birebir karşılaştırılmadan SQL Editor veya CLI ile çalıştırılmamalıdır.

## Kapatılan yollar

- Galeri kullanıcısı yalnız gönderilmiş (`submitted_at IS NOT NULL`) ve kişisel verisi purge edilmemiş (`purged_at IS NULL`) kendi başvurularını RLS ile görebilir. Admin okuma politikası bu kuraldan ayrıdır.
- Aynı filtre, teklif RLS'ine uygulanır. Eski veya hatalı bir veri yoluyla taslak/silinmiş kayda bağlanmış teklif, galeri kullanıcısına görünmez.
- Teklif oluşturma, teklif yanıtı ve satışa alma RPC'leri kaydı kilitledikten sonra gönderilmiş ve purge edilmemiş olmasını zorunlu tutar. Yetkili ama geçersiz kayıt için `APPLICATION_NOT_SUBMITTED`, başka galeri veya yetkisiz kullanıcı için `FORBIDDEN` döner.
- Servis-rolüyle çalışan galeri dashboard ve sayfalı liste RPC'leri ile uygulama içindeki doğrudan sorgular aynı filtreyi kullanır. Yerel geliştirme deposu da üretimdeki görünürlük kuralına eşlendi.

Yeni dosya: `supabase/migrations/202609080003_isolate_unsubmitted_applications.sql`.
SHA-256: `71603794c1469bb593e7ce1bbff9b70daa2482b282f30df5bd6e9c5a2b77dd19`.

## Etki ve uyumluluk

- Gönderilmemiş form kayıtları, galeri panelinden ve teklif iş akışından kaybolur. Public formun finalize akışı kaydın `submitted_at` değerini atadığında görünür olur.
- Purge edilmiş kayıtların eski teklifleri galerinin dashboard, liste ve detay akışına düşmez. Bu migration eski satırları silmez veya değiştirmez.
- Uygulama eski migration ile geçici olarak çalışabilir; uygulama tarafı filtreleri taslak/purge edilmiş kaydı zaten gizler. DB migration uygulanmadan doğrudan REST/RPC istekleri eski veri için güvenlik sınırını tam sağlayamaz. Bu nedenle uygulama ve SQL aynı yayın penceresinde ileri yönde uygulanmalıdır.
- İş akışı hatası kullanıcıya "Bu başvuru henüz gönderilmemiş veya silinmiş." olarak gösterilir; hata metni başka galerinin kaydını tanımlamaz.

## İzole testler

`supabase/tests/database/draft-isolation.test.sql` 14 pgTAP kontrolü içerir:

- AAL2 manager için taslak, purge edilmiş ve başka galeri kayıtlarının RLS ile gizlenmesi,
- Taslak/purge edilmiş kayıtta teklif oluşturma, eski teklifi yanıtlama ve satışa alma denemelerinin reddi,
- Gönderilmiş kayıtta teklif akışının devam etmesi,
- Service-role dashboard ve sayfalı liste RPC'lerinin eski teklifler dahil gizli kayıtları saymaması.

`tests/offer-workflow-access.test.ts`, kullanıcı arayüzünde database ve yerel mod hatasının güvenli biçimde işlendiğini doğrular.

Bu testler disposable local veya staging veritabanında, migration uygulandıktan sonra çalıştırılmalıdır. Production'da pgTAP testi çalıştırılmaz; test transaction içinde rollback kullansa da test kullanıcıları ekler.

Bu çalışma sırasında `npm run test:db` yeniden denendi; yerel PostgreSQL `127.0.0.1:54322` bağlantısını reddetti. Docker CLI kurulu olmadığından yerel Supabase başlatılamadı. Bu nedenle pgTAP kontrolleri çalışmış veya geçmiş sayılmaz.

## Uygulama öncesi ve sonrası kontrol

1. `202609080001_require_mfa.sql` ve `202609080002_admin_access_boundaries.sql` tanımlarının canlıda beklenen body, owner, ACL ve policy ile eşleştiğini doğrula; `202609080003` için mevcut `applications_dealer_read`, `offers_dealer_read` ve dört RPC'nin snapshot'ını al.
2. İzole ortamda tüm migration'ları sırayla uygula; `npm run test:db`, `npm test`, `npm run typecheck` ve `npm run build` çalıştır.
3. Uygulama ile migration'ı aynı ileri yayın penceresinde dağıt. Anon, AAL1, AAL2 viewer, AAL2 manager, başka galeri manager ve admin için doğrudan REST/RPC negatif testleri yap.
4. Sonrasında SQL Editor'da yalnız salt okunur olarak policy, function `proconfig` (`search_path`), `prosecdef`, grants ve dashboard/page sonucunu doğrula. Gerçek kişisel veri veya token rapora alınmaz.

Transaction commit edilmeden hata olursa rollback yeterlidir. Commit sonrasında eski geniş RLS veya workflow tanımını geri açan down migration kullanılmaz; erişim arızası, snapshot ile karşılaştırılan dar kapsamlı yeni ileri migration ile düzeltilir.
