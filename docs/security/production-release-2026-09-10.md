# 10 Eylül 2026 güvenlik paketi yayını

Kapsam: bilinen bağımlılık açıkları ve e-posta doğrulamasına güvenli geçiş hazırlığı. Kullanıcının mevcut hesapları koruma ve demo MFA istisnası talimatları sürer.

## Bağımlılıklar

| Paket | Önce | Sonra |
| --- | --- | --- |
| next / eslint-config-next | 16.3.2 | 16.3.4 |
| sharp | 0.35.3 | 0.35.4 |
| js-yaml | 4.3.1 | 4.3.2 |
| vitest | 3.2.7 | 4.1.11 |

Tarama önce 1 Critical, 2 High, 2 Moderate etkilenen paket bildirdi. Güncelleme sonrası `npm audit --json` ve `npm audit --omit=dev --json`: 0 bilinen açık. Bu sonuç istismar testi veya tüm sistem için güvenlik garantisi değildir.

183 test geçti, TypeScript ve yerel production build başarılı. Uygulama/test/config dosyalarına kapsamlı ESLint: 0 hata, 1 mevcut img uyarısı. Genel `npm run lint`, Git dışındaki eski `.local-data/prepare-mfa-release.cjs` dosyasında 4 require-import hatası ve üretilmiş/örnek dosyalarda uyarı verdi; genel komut geçmiş olarak işaretlenmedi. Vitest yükseltmesinde npm 10.9.2 peer çözümleyicisi hata verdi; npm 11.11.0 ile normal peer çözümü başarılı oldu. force/legacy-peer-deps kullanılmadı.

## Yayın kaynağı

- Başlangıç canlı deployment: `dpl_DdjisZTE7f2kXEEuJvCuHv9CEEZb`.
- Canlı Vercel kaynak arşivi indirildi, yol ve dosya türleri doğrulanarak ayrı dizine çıkarıldı. Arşiv SHA-256: `39d9da5baf85287b8a90aac8e2c2cce6f955656ea62c13de80ab7df0dbf0e42b`.
- Hazırlık dizini: `.local-data/releases/security-20260910`.
- Yalnız package.json/package-lock.json paket güncellemeleri ve yerel dosyaları dışlayan `.vercelignore` aktarıldı. Çalışma ağacındaki yayımlanmamış takip/form değişiklikleri bu yayına alınmadı.
- Production environment ile `--skip-domain --archive=tgz` kullanıldı. Hazırlanan URL: `https://otopass-6796l3bci-emirs-projects-9e257263.vercel.app`.
- Deployment `dpl_B1QBndhFwRUwrPSDyViHJ6SP1r2y` READY oldu ve `vercel promote` başarılı tamamlandı. `www.otokopru.com` inspect sonucu aynı deployment ID'sini doğruladı.
- Yeni sürümde uzak production build ve TypeScript başarılı; build logu Next.js 16.3.4 kullanımını doğruladı.
- Yayın öncesi Vercel korumalı URL üzerinde `vercel curl` ile login 200, admin 307 → /login ve health ready/database reachable doğrulandı.
- Ana alan adında login 200; oturumsuz admin/MFA setup 307 → /login; ertelenmiş verify-email 307 → /login; health 200 ready/database reachable. CSP ve HSTS mevcut.
- Deployment için son 10 dakikalık error log sorgusu 0 kayıt döndürdü. Bu kısa pencere uzun süreli izleme veya oturumlu uçtan uca test değildir.
- Sentry build uyarısı: auth token bulunmadığından release ve source map yüklemesi yapılmadı; izleme hazırlığı ayrı açık iştir.
- Git commit/push yapılmadı. Kaynak kontrolüne alınmamış önceki güvenlik değişiklikleri ile bu paket güncellemeleri sonraki Git yayınına dahil edilmelidir.

## E-posta geçişi

SMTP teslimatı ve tasarım kullanıcı tarafından doğrulandı. Canlı e-posta kapısı etkin; mevcut 6 aktif hesap kontrollü biçimde muafiyet listesine alındı ve yeni hesaplar doğrulama kanıtı olmadan erişemiyor. Auth alanları değiştirilmedi. Gerçek OTP testinde yanlış kod reddedildi, doğru kod kabul edildi ve aynı kodun tekrar kullanımı reddedildi. Güncel ayrıntılar: [email-verification-deferred.md](email-verification-deferred.md).

## Auth saldırı koruması ve izleme — 10 Eylül 2026

- Supabase Auth rate limitleri: e-posta gönderimi 10/saat, OTP/token doğrulama 10/5 dakika, signup/sign-in 15/5 dakika.
- E-posta sağlayıcısında secure password change, mevcut parola zorunluluğu ve 12 karakter + büyük/küçük harf, rakam ve sembol politikası etkin.
- Auth audit loglarının `auth.audit_log_entries` tablosuna yazılması etkin.
- CAPTCHA ve sızdırılmış parola koruması etkinleştirilmedi: CAPTCHA sağlayıcı anahtarı bekliyor, sızdırılmış parola kontrolü Supabase Free planında kullanılamıyor.
- Sentry production DSN/auth token henüz tanımlı değil; uygulama hata alarmı ayrı takip maddesi olarak kaldı.
