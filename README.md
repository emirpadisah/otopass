# POL-CAR

POL-CAR, galeri bazlı araç başvurusu, teklif ve satış operasyonlarını yöneten Next.js 16 uygulamasıdır. Production veri ve kimlik doğrulama katmanı Supabase; dağıtım Vercel; bot koruması Cloudflare Turnstile; hata izleme Sentry üzerinde çalışır.

## Yerel geliştirme

```bash
npm ci
npm run dev
```

Public demo varsayılan olarak local veri modunda `/form/test-galeri` adresinde çalışır. Kayıtlar Git tarafından izlenmeyen `.local-data/` dizininde tutulur. Local kullanıcı ve panel oturumları devre dışıdır; admin ve galeri paneli Supabase gerektirir.

## Production kurulumu

1. `.env.example` içindeki değişkenleri Supabase ve Vercel ortamlarında tanımlayın. Production için `OTOPASS_DATA_MODE=supabase` kullanın.
2. Supabase CLI ile projeyi bağlayıp migration'ları uygulayın:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --linked
```

3. Supabase Auth üzerinde public signup'ı kapalı tutun ve uygulama URL'si ile `/auth/callback` adresini izinli redirect listesine ekleyin.
4. İlk yöneticiyi bir kez oluşturun:

```bash
npm run bootstrap:admin
```

5. Bootstrap secret'larını ortamdan kaldırın. Sonraki kullanıcıları `/admin/users` üzerinden yönetin.
6. Supabase Dashboard'dan günlük yedek ve PITR'ı etkinleştirin. Aylık geri yükleme testini [production runbook](docs/production-runbook.md) ile kaydedin.

Veritabanı şemasının tek kaynağı `supabase/migrations/` dizinidir.

## Kalite kapıları

```bash
npm run lint
npm run typecheck
npm test
npm run test:db
npm run test:e2e
npm audit --omit=dev --audit-level=high
npm run build
```

RLS testleri Docker üzerinde çalışan local Supabase gerektirir. Playwright masaüstü ve mobil Chromium projelerini, kritik başvuru akışını ve axe erişilebilirlik kontrollerini çalıştırır.

## Dağıtım

`master` dalındaki CI başarılı olduğunda deployment workflow sırasıyla Supabase migration'larını uygular, sabitlenmiş Vercel CLI ile build alır ve production'a dağıtır. Gerekli GitHub secret listesi ve geri alma adımları [production runbook](docs/production-runbook.md) içindedir.
