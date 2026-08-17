# Otopass Production Runbook

## Sorumluluklar

- Supabase: PostgreSQL, Auth, private Storage, günlük yedek ve PITR.
- Vercel: Next.js runtime, Cron ve production deployment.
- Cloudflare Turnstile: public başvuru bot kontrolü.
- Sentry: client, server ve edge hata izleme; request ID ile korelasyon.

## Zorunlu secret'lar

Vercel production ortamı:

- `OTOPASS_DATA_MODE=supabase`
- `OTOPASS_ENABLE_LOCAL_AUTH=false`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RATE_LIMIT_HMAC_SECRET` (en az 32 rastgele karakter)
- `CRON_SECRET` (en az 32 rastgele karakter)
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

GitHub Actions:

- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

Secret değerlerini repoya, loglara veya olay kayıtlarına yazmayın. Bootstrap değişkenlerini ilk super admin oluşturulduktan hemen sonra silin.

## Release kontrolü

1. Pull request CI kontrollerinin tamamının geçtiğini doğrulayın.
2. Migration içindeki veri düzeltmelerini staging kopyasında çalıştırın; `migration_issues` kayıtlarını inceleyin.
3. Supabase point-in-time recovery durumunun güncel olduğunu doğrulayın.
4. `master` merge sonrasında Production Deploy workflow'unu izleyin.
5. `/api/health` yanıtının `200` ve yalnız genel readiness bilgisi döndürdüğünü doğrulayın.
6. Public başvuru, teklif, kabul/ret, satış ve admin audit akışlarına smoke test uygulayın.

## Yedek ve PITR

Supabase Dashboard içinde günlük yedekleri ve planın desteklediği en düşük recovery point objective ile PITR'ı açın. Bu ayar API anahtarıyla uygulama kodundan yapılmaz; proje sahibi tarafından doğrulanır.

Aylık restore testi:

1. En son günlük yedeği veya seçilen PITR zamanını izole bir Supabase test projesine geri yükleyin.
2. Satır sayılarını production ile zaman farkını dikkate alarak karşılaştırın: `dealers`, `applications`, `offers`, `activity_log`.
3. Private `applications` bucket nesne sayısı ve örnek signed URL erişimini doğrulayın.
4. RLS testlerini restore edilen projede çalıştırın.
5. Test projesini production'a bağlamadan `/api/health` ve kritik smoke testleri çalıştırın.
6. Tarih, geri yükleme noktası, süre, veri farkı ve sorumlu kişiyi `docs/restore-drills/YYYY-MM.md` kaydına yazın.

## Rollback

Uygulama hatası:

1. Vercel'de son sağlıklı deployment'ı Promote to Production ile geri alın.
2. Sorunlu deployment'ı durdurun ve Sentry olaylarına deployment SHA ekleyin.
3. Uygulama geri alındıktan sonra `/api/health` ve smoke testleri çalıştırın.

Migration hatası:

1. Yazma işlemlerini geçici bakım modu veya deployment rollback ile durdurun.
2. Migration henüz veri değiştirmediyse ileri düzeltme migration'ı hazırlayın; uygulanmış migration dosyasını değiştirmeyin.
3. Veri bütünlüğü bozulduysa olay başlangıcından hemen önceki PITR noktasına izole restore yapın ve veri farkını ölçün.
4. Production restore kararı proje sahibi onayıyla verilir. Restore sonrası storage yollarını doğrulayın.

## Olay müdahalesi

1. Etki alanını belirleyin: auth, public form, teklif, storage veya veri izolasyonu.
2. Sentry correlation/request ID, Vercel logları ve değiştirilemez `activity_log` kayıtlarını birlikte inceleyin.
3. Galeriler arası veri sızıntısı şüphesinde yazma ve panel erişimini hemen durdurun; ilgili service role anahtarını döndürün.
4. Secret sızıntısında Supabase service role, Sentry, Turnstile, Vercel ve GitHub token'larını ayrı ayrı yenileyin.
5. Olay kapatılırken kök neden, etkilenen kayıtlar, zaman çizelgesi, düzeltme ve tekrar önleme maddelerini kaydedin.

## Veri yaşam döngüsü

Vercel Cron `/api/cron/maintenance` endpoint'ini çağırır. Endpoint yalnız `CRON_SECRET` ile çalışır ve şu işleri yürütür:

- Süresi dolan rate-limit bucket'larını temizler.
- 24 saati geçen tamamlanmamış upload session ve nesnelerini siler.
- Son hareketten 365 gün sonra başvuruları arşivler.
- 30 günlük ek süreden sonra fotoğrafları siler ve kişisel verileri anonimleştirir.
Cron hatalarında önce Sentry ve Vercel loglarını kontrol edin; aynı job'ı manuel çağırmadan önce önceki çalışmanın tamamlandığını doğrulayın.
