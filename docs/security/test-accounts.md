# Faz 0 — Güvenlik test kullanıcıları

Bu dosya, staging ertelenirken hazırlanmış test verilerini ve kalan işleri tanımlar. Hesaplar production'da veya bulutta oluşturulmadı. SQL test verileri gerçek Supabase Auth girişinin yerine geçmez.

## Hazırlanan kimlikler

SQL kaynağı: `supabase/tests/fixtures/security-actors.sql`.
Tüm adresler dışarıya e-posta gönderimi için kullanılmayan `security.test` alanındadır. Auth UUID'leri `90000000-0000-4000-8000-` öneki ile aşağıdaki son eklerden oluşur.

| Test kimliği | UUID son eki | Yetki / durum | Amaç |
| --- | --- | --- | --- |
| super_admin | 000000000001 | super_admin | Üst yetki ve son yönetici koruması |
| admin | 000000000002 | admin | Sınırlı yönetim aktörü |
| admin_peer | 000000000003 | admin | Başka admin üzerinde rol/parola saldırı zinciri hedefi |
| owner_a | 000000000004 | dealer_owner, Galeri A | Galeri sahibi yetkileri |
| manager_a | 000000000005 | dealer_manager, Galeri A | Yazma ve iş akışı kontrolü |
| viewer_a | 000000000006 | dealer_viewer, Galeri A | Salt okuma sınırı |
| manager_b | 000000000007 | dealer_manager, Galeri B | Tenant ayrımı / BOLA |
| inactive | 000000000008 | Pasif kullanıcı, Galeri A | Pasif hesap erişim engeli |
| unconfirmed | 000000000009 | email_confirmed_at boş, Galeri A | Doğrulanmamış e-posta |
| password_change | 000000000010 | must_change_password=true | İlk parola değişimi sınırı |
| no_membership | 000000000011 | dealer_manager, üyelik yok | Rolün tek başına erişim vermemesi |
| inactive_dealer | 000000000012 | Pasif galeride manager | Galeri kapatılması sonrası erişim |
| legacy_confirmed | 000000000013 | Doğrulanmış flag, sahiplik kanıtı yok | Eski otomatik onaylı hesapların geçişi |

`legacy_confirmed`, mevcut şemada normal doğrulanmış hesapla aynı duruma sahiptir. SQL'de `email_confirmed_at` yazılması e-posta sahibinin doğrulama yaptığına kanıt değildir. Sahiplik geçişinin gerçek doğrulaması ileride Auth akışı üzerinden yapılmalıdır.

Galeri A için taslak, gönderilmiş ve `purged_at` dolu başvuru; Galeri B için gönderilmiş başvuru hazırlanır. Teklif/accept/reject/sold geçişleri test sırasında RPC üzerinden yapılmalıdır. Test verilerinde gerçek müşteri bilgisi bulunmaz.

## Çalıştırma ve sınırlar

Migration'ları uygulanmış, izole yerel Supabase hazır olduğunda depo kökünde:

```powershell
npm run test:db
```

Mevcut komut yerel veritabanına bağlanır. Production bağlantı bilgisi eklemeyin. Fixture kendi başına çalıştırılmaz; pgTAP dosyası tarafından `BEGIN` / `ROLLBACK` içinde dahil edilir. İsim/UUID çakışmasında upsert yapmaz, hata verir; test bittikten sonra hesapları kalıcı bırakmaz.

Hazırlanan 9 kontrol mevcut yetki sınırları için başlangıç regresyonudur. E-posta doğrulaması, MFA zorunluluğu, taslak erişimi ve parola değişimi açıklarının kapandığını iddia etmez. Bu kontroller ilgili düzeltmelerde ayrıca eklenecektir.

`pg_temp.security_actor('manager_a', 'aal1')` ve `aal2` aynı kullanıcının DB istek claim'lerini farklı seviyelerde temsil eder. Çağıran test ayrıca `SET LOCAL ROLE authenticated` kullanmalıdır. Bu yardımcı JWT imzalamaz, gerçek oturum oluşturmaz ve MFA doğrulaması yapmaz. RLS kontrolleri service_role/postgres ile yapılmamalıdır; bu roller RLS'yi aşabilir.

## Staging kurulunca tamamlanacak Auth doğrulaması

1. Bu matrisle eşleşen gerçek test hesaplarını yalnız staging Auth API üzerinden, her hesaba ayrı rastgele parola ile oluştur. Parolaları ve TOTP sırlarını repository veya rapora yazma.
2. E-posta daveti/doğrulama için kullanıcı kontrolündeki test posta kutusunu veya izole posta yakalayıcısını kullan. `security.test` adreslerine gerçek SMTP ile posta gönderme. Doğrulanmamış hesabı otomatik `email_confirm: true` ile açma.
3. Manager ve admin rollerinde MFA'sız hesap, enroll edilmiş fakat challenge tamamlamamış AAL1 oturumu ve challenge tamamlamış gerçek AAL2 oturumu hazırla. Recovery ve faktör değiştirme durumlarını da ayrı oturumlarla test et.
4. Doğru parola + doğrulanmamış e-posta, süresi dolan/tekrar kullanılan doğrulama bağlantısı, yeniden gönderim limiti ve generic hata mesajlarını kontrol et. Eski otomatik onaylı hesabın e-posta sahipliğini yeniden doğrulama geçişini ayrıca test et.
5. Aynı hesabın yetkilerini doğrudan REST/RPC, server action ve panel üzerinden karşılaştır. AAL1/AAL2, pasiflik ve zorunlu parola değişiminin bu giriş noktalarında tutarlı olduğunu doğrula.
6. Senaryolarda oluşan oturumları iptal et ve yalnız bu çalışmada oluşturulduğu kaydedilen test verilerini kaldır; diğer veriler için toplu silme kullanma.

## Çalıştırma kaydı

8 Eylül 2026: `npm run test:db` denendi. Yerel `127.0.0.1:54322` çalışmadığı için `ECONNREFUSED` alındı. SQL fixture ve dokuz kontrol veritabanında henüz yürütülmedi; Auth/MFA/e-posta uçtan uca testleri de bekliyor.
