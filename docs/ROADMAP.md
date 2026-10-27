# Islamic+ — yol haritası (test grubundan mağazaya)

Sorumlu: **S** = sen, **C** = Claude ile birlikte. Her aşama bir öncekinin bitmesini bekler; aşama içindeki adımlar paralel yürüyebilir.

## Aşama 1 — Test derlemesini dağıt (bu hafta)

1. **S** · Supabase › SQL Editor'de `supabase/migrations/009_feedback_flood_guard.sql` dosyasını çalıştır (geri bildirim tablolarına dakika sınırı).
2. **S** · EAS'teki son Android APK'yı kendi telefonuna kur; `docs/TEST-PLAN.md` adımlarını sen bir kez yürü (bildirim, ezan sesi, widget, kıble, konum izni).
3. **S** · Sorun yoksa APK bağlantısını ve `BETA-TEST.md`'yi test grubuna gönder (5–15 kişi; en az biri eski/ucuz Android, biri Samsung, biri Xiaomi olsun: bildirim kısıtları en çok bunlarda çıkar).
4. **C** · `feat/test-release` PR'ını birleştir.

## Aşama 2 — Test turu (1–2 hafta)

5. **S** · Her 2–3 günde bir `supabase/queries/test-feedback-report.sql` sorgularını çalıştır; sonuçları buraya yapıştır.
6. **C** · Gelen hataları ve geri bildirimleri önceliklendir: çökme > yanlış vakit/bildirim > içerik > öneri. Düzeltmeleri küçük PR'lar halinde yap, yeni APK çıkar.
7. **S** · Dua sesleri için `docs/store/DUA-AUDIO-PERMISSION.md`'deki metni Alsarmad/Adhkar-json deposuna Issue olarak aç. Cevap gelmezse `ADHKAR_AUDIO_ENABLED = false` (tek satır).
8. **S** · Hoca incelemesi: `docs/review/LEARN.md` ve `docs/review/DUAS.md`'yi gönder; işaretli dönüşleri **C** uygular, `npm run content:review` ile dökümü yeniler.

## Aşama 3 — Mağaza ön hazırlığı (test turuyla paralel)

9. **S** · Destek e-postası aç (ör. ayrı bir Gmail). **C** bunu gizlilik politikasına, mağaza metnine ve bir "hesap silme talebi" sayfasına ekler (Google Play web üzerinden silme bağlantısı istiyor).
10. **S** · Google Play Console hesabı (tek seferlik 25 $). Kimlik doğrulaması birkaç gün sürebilir: erken başla.
11. **S** · Apple Developer hesabı (yıllık 99 $) — iOS ve TestFlight için. iOS'u sonraya bırakmak istersen Android ile başla.
12. **C** · Gizlilik politikasını GitHub Pages'te yayınlanacak bir sayfaya taşı (mağazalar düz bir web adresi ister).
13. **S + C** · Gerçek cihazdan ekran görüntüleri (Android telefon, 6,7" iPhone); `docs/store/LISTING.md` listesine göre. Widget görüntüsü yalnızca cihazdan alınabilir.

## Aşama 4 — Kapalı test ve yayın (Android önce)

14. **C** · `production` profiliyle AAB derle (`npm run build:production` yerine yalnızca Android).
15. **S** · Play Console'da "Kapalı test" kanalı aç. Yeni kişisel hesaplarda yayından önce **en az 12 test kullanıcısının 14 gün** kapalı testte kalması zorunlu; test grubunu buraya taşı.
16. **S** · Play formları: veri güvenliği (`docs/store/DATA-SAFETY.md`), içerik derecelendirmesi, hedef kitle, `SCHEDULE_EXACT_ALARM` beyanı (namaz vakti = alarm/takvim benzeri işlev).
17. **S** · 14 gün dolunca üretime yükselt. iOS hazırsa TestFlight → App Store incelemesi.

## Aşama 5 — Yayından sonra

18. **C** · Sürüm notları ve uygulama içi "Yenilikler" ekranı.
19. **C** · Mağaza puanlama isteği (birkaç gün kullanımdan sonra, bir kez).
20. **C** · Önerilen sonraki özellikler, kullanıcı geri bildirimine göre sıralanacak:
    - Kur'an için tam çevrimdışı indirme (metin + ses, sure sure)
    - Cuma ve kandil hatırlatıcıları, dini günler takvimi
    - iOS widget kilit ekranı / Android Material You renkleri
    - Ezan sesi seçenekleri (farklı müezzinler, lisanslı kayıtlar)
    - Erişilebilirlik turu: ekran okuyucu ile tüm sekmeler, büyük yazı boyutunda düzen
21. **C** · Kök dizindeki eski yardımcı dosyalar (`GUNCELLEME-README.txt`, `IPHONE-TIMEOUT-COZUM.md`, `baslat-*.bat`, `beta-links.json`) — güncel değilse `docs/archive/` altına taşı veya sil (senin onayınla).

## Her sürümde

- `npm run check` (tip, çeviri anahtarları, testler) — CI aynı şeyleri ve Android paket derlemesini PR'larda çalıştırır.
- Vakit hesabına dokunulduysa Diyanet takvimiyle karşılaştır (İstanbul, Ankara, bir doğu ve bir batı şehri).
- `src/data` değiştiyse `npm run content:review` ve gerekirse `npm run duas:verify`.
