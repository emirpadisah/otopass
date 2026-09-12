# E-posta doğrulaması — tamamlanmamış iş

## 10 Eylül 2026 — teslimat ve canlı erişim kontrolü tamamlandı

- Kullanıcı, Confirm sign up şablonu da düzeltildikten sonra gerçek gelen e-postanın tasarımını ve teslimatını doğruladı.
- `OTOPASS_EMAIL_VERIFICATION_REQUIRED=true` canlıda etkin; `/login/verify-email` erişilebilir durumda.
- 6 aktif hesap, Auth alanları değiştirilmeden `security_private.email_verification_exemptions` tablosuna alındı. Doğrulama: `active_without_exemption=0`.
- Gerçek test hesabında yanlış OTP reddedildi, doğru OTP ile kanıt kaydı oluşturuldu ve replay reddedildi.
- 007 e-posta kapısı ve mevcut MFA istisnalarını koruyan politikalar canlıda doğrulandı; 17 RLS tablosunda restrictive e-posta politikası mevcut.
- Aşağıdaki 9 Eylül notları tarihsel ilerleme kaydıdır. Canlı aktivasyon için 005 yerine demo MFA istisnasını koruyan 007 planı geçerlidir; hesap geçişi bunun ön koşuludur.

## 9 Eylül 2026 — yeniden başlatıldı, henüz etkin değil

Kullanıcı MFA engelini kendi testiyle doğruladığını bildirdi ve SMTP/e-postaya geçilmesini istedi. Bu bildirim bağımsız canlı MFA regresyon testi değildir.

- Supabase dashboard: custom SMTP kapalıydı. Hostinger `info@otokopru.com` posta kutusu aktif. Gönderen adı `otoKöprü`, sunucu `smtp.hostinger.com`, SSL port `465`, kullanıcı aralığı `60` saniye ile form hazırlandı; kaydetme ve bağlantı testi henüz doğrulanmadı.
- İlk genel DNS sorgularında MX/SPF/DMARC bulunamadı; sonraki yetkili `nova.dns-parking.com` sorgusunda MX (`mx1.hostinger.com`/5, `mx2.hostinger.com`/10), SPF (`v=spf1 include:_spf.mail.hostinger.com ~all`) ve DMARC (`v=DMARC1; p=none`) bulundu. Yayılım ve gerçek mesajdaki SPF/DKIM/DMARC sonuçları ayrıca test edilmeli. `p=none` raporlama politikasıdır, sahte mesajları reddetmez.
- 005, 006'dan sonra doğrudan uygulanırsa demo MFA istisnasını aktiflik fonksiyonundan kaldırır. Yeni `202609090007_require_email_preserve_mfa.sql` aktivasyon migration'ı iki koşulu birleştirir. **SMTP/OTP ve hesap geçişi tamamlanmadan uygulanmaz.** Canlıdaki ertelenmiş 005 yerine 007 kullanılacak; eski migration geçmişi kanıtsız şekilde işaretlenmeyecek. Temiz kurulumda 005 → 006 → 007 son durumda aynı kuralları sağlar.
- 007 mevcut Auth hesaplarını, kanıtları veya muafiyet listesini değiştirmez. 004 sonrası açılan hesapların geçiş kararı hâlâ bekliyor; muafiyet listesi otomatik genişletilmeyecek.
- Birleşik MFA/e-posta, aktiflik ve tenant test senaryoları SQL testine eklendi. pgTAP çalıştırılmadan geçmiş sayılmaz.

Bu bölüm aşağıdaki eski 005 yayın sırasının yerine geçer. Uygulama doğrulama bayrağı, canlı politikalar ve teslimat testi henüz değiştirilmiş/doğrulanmış sayılmaz.

### Aynı gün doğrulanan ilerleme

- Kullanıcı SMTP şifresini kendisi kaydetti. Dashboard yeniden yüklenince custom SMTP açık, `smtp.hostinger.com:465`, gönderen adı `otoKöprü`, aralık 60 saniye olarak görüldü. Kaydın kalıcı olması teslimatın başarılı olduğu anlamına gelmez.
- Site URL `http://localhost:3000` yerine `https://www.otokopru.com` olarak kaydedildi; başarı bildirimi görüldü. Redirect listesine yalnız uygulamanın kullandığı `https://www.otokopru.com/auth/callback?next=/login/reset-password` eklendi ve listede doğrulandı.
- Yetkili DNS'de üç Hostinger DKIM CNAME kaydı (`hostingermail-a/b/c._domainkey`) bulundu. Gerçek mesaj imza kontrolü hâlâ bekliyor.
- Hosted Email OTP: 8 hane, 3600 saniye. Süre henüz değiştirilmedi. Confirm signup şablonu hâlâ varsayılan bağlantı içeriyor; kod şablonu canlıya henüz yazılmadı. Public signup hâlâ açık.
- Test mesajı ve ayrı test hesabı için kullanıcıdan alıcı adresi istendi. Mevcut hesaba mesaj gönderilmedi, kullanıcı/rol/kanıt kayıtları değiştirilmedi, 007 uygulanmadı.
- Kullanıcının isteğiyle Magic link / OTP canlı şablonu da siyah-beyaz tasarıma alındı. `kurtar.sf@gmail.com` adresine ikinci test OTP isteği Supabase tarafından HTTP 200 ile kabul edildi; ilk deneme 60 saniyelik gönderim aralığına takılmıştı. Gmail teslimatı ve görsel inceleme kullanıcı tarafında bekleniyor.
- Kullanıcının onayıyla şablon ikinci kez iyileştirildi: siyah marka üst bandı, adım göstergesi, odaklı kod paneli ve güvenlik kontrol maddeleri eklendi. Bu sürüm Supabase canlı Magic link / OTP şablonuna kaydedildi ve aynı test adresine gönderim HTTP 200 ile kabul edildi.
- Kullanıcı istemcisinde stil görünmediği için şablon tamamen inline CSS ve HTML tablo öznitelikleriyle yeniden düzenlendi; kritik renk, boşluk ve tipografi değerleri artık `<style>` bloğuna bağlı değil. Bu sürüm canlıya kaydedildi ve test gönderimi HTTP 200 ile kabul edildi.

8 Eylül 2026: kullanıcı SMTP/e-posta doğrulamasını erteledi; diğer güvenlik iyileştirmelerinin yayını devam ediyor.

## Bu yayındaki davranış

- Production için `OTOPASS_EMAIL_VERIFICATION_REQUIRED=false`. Yalnız açıkça `false` değeri ertelemeyi etkinleştirir; eksik/hatalı değer e-posta zorunluluğunu korur. Sunucu ayarıdır.
- Uygulama e-posta kanıtı istemez ve kanıt RPC'sini çağırmaz. `emailVerified` sahte biçimde true yapılmaz. MFA, aktiflik, rol/tenant ve ilk şifre değişimi kontrolleri devam eder.
- Yeni admin hesabı önceki parola giriş davranışını sürdürmek için Auth `email_confirm:true` ile oluşturulur. Bu, posta kutusu sahipliğinin doğrulandığı anlamına gelmez; kanıt veya muafiyet kaydı oluşturulmaz. Bootstrap betiği aynı ayarı okur; canlıda çalıştırılmadı.
- Doğrulama bağlantısı gizlenir; sayfa `/login` adresine yönlendirir. Doğrudan kod gönderme/doğrulama action'ları Auth veya DB çağrısı yapmadan reddedilir.
- Mevcut dört hesaba Auth güncellemesi yapılmaz. 004'teki sabit muafiyet listesi korunur.
- `202609080005_require_email_ownership.sql` **uygulanmaz**. SQL politikasını etkinleştirmek, uygulama erteleme ayarından bağımsız olarak yeni hesapların DB erişimini engeller.

## Kalan işler ve yeniden etkinleştirme

1. Custom SMTP ve gönderen alan adını doğrula; Confirmation ve Magic Link şablonlarına tek kullanımlık kodu ekle.
2. Yeni test hesabıyla teslimat, yanlış/süresi dolmuş/tekrar kullanılmış OTP ve MFA akışlarını test et.
3. Erteleme sırasında 004 snapshot'ından sonra açılan hesaplar muaf değildir. Yeniden etkinleştirmeden önce bu hesapların kesintisiz geçişini kullanıcıyla netleştir; mevcut hesaplara dokunmama talimatı sürer. Muafiyet snapshot'ını otomatik yenileme ve 004'ü tekrar çalıştırma.
4. Uygulama ayarını true yapıp yeni deployment hazırla; hazır SMTP ve hesap geçişiyle birlikte 005'i koordineli yayımla. Sadece environment değerini değiştirmek eski deployment'ı yeniden derlemez.
5. Eski dört hesabın muafiyetini ve MFA/tenant sınırlarını; yeni hesapların doğrulamasız erişemediğini doğrula.

Risk kabulü: erteleme süresince admin tarafından açılan yeni hesapların e-posta adresi sahipliği kanıtlanmaz. Bu iş kapatılmış veya güvenlik kazanımı olarak puanlanmaz. Şifre sıfırlama gibi diğer e-posta akışlarının SMTP bağımlılığı devam eder.

Yerel doğrulama: 30 dosyada 182 test ve TypeScript kontrolü başarılı. Testler ertelemede kanıt yazılmadığını, OTP çağrılarının durduğunu, MFA/aktiflik/ilk şifre sınırlarının korunduğunu kapsar. Canlı hesap oluşturarak uçtan uca giriş testi yapılmadı.

## Canlı Auth ayarı gözlemi

Supabase Auth public settings endpoint'i (anon anahtarla, salt okunur) 8 Eylül 2026'da 200 döndü: `external.email=true`, `mailer_autoconfirm=false`, `disable_signup=false`. Bu, e-posta Auth yönteminin açık, otomatik onayın kapalı ve hosted Auth üzerinde public signup'ın açık olduğunu gösterir. Uygulama profil/rol kaydı olmayan kullanıcıları panele almıyor; yine de admin-only ürün modeli için `disable_signup=false` artıklandırılmış Auth kullanıcıları ve spam/orphan hesapları oluşturabilir. Custom SMTP'nin etkin olup olmadığı bu public endpoint'ten görülemez; dashboard veya Supabase Management API ile ayrıca doğrulanmalıdır. Bu turda ayar değiştirilmedi.
