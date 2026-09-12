# Migration değişiklik kaydı — ŞABLON

Durum: TASLAK / TEST EDİLDİ / UYGULANDI / GERİ ALINDI. Doldurulmamış bu şablon çalıştırma talimatı değildir.

## Değişiklik

- Bulguyla ilişkisi ve beklenen yeni davranış:
- İleri migration dosyası ve SHA-256:
- Uygulama commit/deployment kimliği:
- Hedef proje kimliği ve ortam:
- Etkilenen tablo/kolon, constraint/index, policy, tam RPC imzaları:
- Beklenen veri dönüşümü ve satır kapsamı:
- Sorumlu kişi ve uygulama zamanı:

## Ön koşullar

- Canlı şema/migration eşleşme kanıtı:
- Önceki function/RLS/ACL tanımlarının erişimi sınırlı snapshot konumu:
- Veri yedeği / Storage yedeği ve son başarılı restore tatbikatı:
- Auth ayar değişikliği varsa önceki ve hedef ayarlar (secret değerleri hariç):
- Eski/yeni uygulama sürümünün eski/yeni şema ile uyumluluk tablosu:
- Transaction sınırı, kilit/statement timeout ve beklenen süre:
- Eşzamanlı cron, worker ve doğrudan DB/API yazmalarına etkisi:

## İleri uygulama

1. Hedef ve ön koşul doğrulaması:
2. Şema/veri uygulama sırası:
3. Uygulama deployment sırası:
4. Hata halinde durma eşiği ve kısmi uygulama tespiti:
5. Başarı kanıtı ve ölçümleri:

## Geri dönüş

- Tetikleyici hata ve etkilenen erişim yolu:
- Tercih: transaction rollback / uyumlu uygulama rollback / ileri düzeltme / izole restore:
- Çalıştırılacak kesin SQL veya deployment hedefi ve dosya konumu:
- Owner, grants, search_path ve RLS durumunun korunması:
- Eski güvenlik açığının yeniden açılmadığının kanıtı:
- Geri getirilemeyen veri/oturum/harici etki:
- Geçişten sonra oluşmuş verinin korunma yöntemi:
- Yeni migration sürümüyle ileri düzeltme veya yeniden uygulama yolu:

## Test ve sonuç kaydı

| Kontrol | Beklenen | Gerçek sonuç / kanıt |
| --- | --- | --- |
| Yetkili kullanıcı, doğru tenant ve workflow | İzin verilen işlem başarılı | BEKLİYOR |
| Anon / rolü olmayan / başka tenant | Yetkisiz veri veya mutation yok | BEKLİYOR |
| AAL1 / AAL2 ve e-posta sahipliği | Değişiklikte tanımlı erişim sınırı | BEKLİYOR |
| Pasif kullanıcı/galeri ve parola değişimi | İlgili engeller korunur | BEKLİYOR |
| Tekrar istek / yarış durumu | Yetki ve veri bütünlüğü korunur | BEKLİYOR |
| İleri migration → geri dönüş | Güvenli davranış ve veri korunur | BEKLİYOR |
| Geri dönüş → ileri düzeltme | Migration geçmişi/şema tutarlı | BEKLİYOR |
| Uygulama smoke ve doğrudan REST/RPC | Aynı yetki sınırları | BEKLİYOR |

Uygulanamaz kontroller için gerekçe yazılır; çalıştırılmamış kontrol “geçti” sayılmaz. Parola, token, JWT veya kişisel veri rapora eklenmez.
