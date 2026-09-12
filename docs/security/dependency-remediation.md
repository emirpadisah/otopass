# Bağımlılık güvenliği — 8 Eylül 2026

Yerel dependency ağacı ve lockfile güncellendi. Production deployment yapılmadı.

| Paket | Önce | Sonra | Tarama riski | Kullanım yolu |
| --- | --- | --- | --- | --- |
| fast-uri | 3.1.5 | 3.1.7 | High | @sentry/nextjs → webpack plugin → webpack → schema-utils → ajv |
| @humanfs/node | 0.16.7 | 0.16.8 | Medium (npm: moderate) | eslint geliştirme bağımlılığı |

fast-uri için ilk tarama dört GHSA bildirimi içeriyordu: GHSA-5jgf-p345-68v8, GHSA-f65p-4m7j-42xc, GHSA-fph4-wmhf-6fwf, GHSA-jqff-g426-hqxp. Yayıncının [IPv6 normalizasyonu bildirimi](https://github.com/fastify/fast-uri/security/advisories/GHSA-f65p-4m7j-42xc), 3.x serisinde 3.1.6 ile düzeltildiğini belirtiyor. Bu projede zararlı URL'nin ilgili fonksiyona ulaştığı bir uygulama SSRF yolu bu çalışma kapsamında kanıtlanmadı; doğrulanan bulgu etkilenen paketin bağımlılık ağacında bulunmasıdır.

@humanfs/node için [GHSA-p498-v437-472g](https://github.com/humanwhocodes/humanfs/security/advisories/GHSA-p498-v437-472g) symlink içeren recursive copy davranışıyla ilgiliydi. Projede ESLint üzerinden dev bağımlılığıdır; production endpoint istismarı gösterilmedi.

`npm update fast-uri @humanfs/node --ignore-scripts --no-audit --no-fund` mevcut sürüm aralıkları içinde uygulandı. package.json'a yeni doğrudan bağımlılık veya override eklenmedi. @humanfs/node'un gerekli alt bağımlılığı @humanfs/core 0.19.1 → 0.19.2 güncellendi ve @humanfs/types 0.15.0 eklendi. package-lock.json registry URL ve integrity değerlerini içerir.

Doğrulama:

- `npm ls fast-uri @humanfs/node`: beklenen sürümler, yinelenen eski fast-uri kopyası yok.
- `npm audit --json`: önce 1 High + 1 Moderate paket; güncelleme sonrası 0 bilinen açık.
- `npm audit --omit=dev --json`: 0 bilinen açık.
- Aynı çalışma ağacında 178 uygulama testi, typecheck ve production build geçti. Lint 0 hata, 12 önceki uyarı.

Yayın, güncel lockfile ile kurulum/build gerektirir; önceki production çıktıları yerel npm update ile değişmez. Audit sonucu bilinen bağımlılık bildirimlerini kapsar; uygulama güvenliğinin tamamına veya supply-chain risklerinin yokluğuna dair puan değildir.
