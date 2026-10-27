# Yayın kontrol listesi

**Sahip:** S = sen (hesap, karar, içerik), C = Claude (kod). ✅ yapıldı, ⏳ bekliyor.

## Test grubuna dağıtmadan önce

| # | İş | Sahip | Durum |
|---|---|---|---|
| 1 | Paket kimliği: `com.islamicplus.app` (iOS ve Android) | S → C | ✅ |
| 2 | Supabase'de `007`, `008` ve `009` migration'larını çalıştır (`008`: geri bildirim + hata tabloları, `009`: yoğun gönderim sınırı) | S | `007` ✅, `008` ✅, `009` ✅ |
| 3 | Gizlilik politikasına iletişim e-postası ekle | S → C | ⏳ |
| 4 | EAS geliştirme/test derlemesi: Android APK (ücretsiz). iOS için TestFlight: Apple Developer hesabı (yıllık 99 $) | S + C | ⏳ |
| 5 | Gerçek cihazda: bildirim zamanlaması, ezan sesi, widget, izin pencereleri, kıble | S | ⏳ (Expo Go'da kısmen) |
| 6 | Test grubuna `docs/TEST-PLAN.md` ile yönergeyi ilet; geri bildirimler uygulama içinden gelir | S | ⏳ |
| 7 | Gelen geri bildirim ve hataları izle: Supabase › SQL Editor'e `supabase/queries/test-feedback-report.sql` | S | ⏳ |
| 8 | Vakitler Diyanet ile karşılaştırıldı (İstanbul, Ankara; en fazla 1 dk) | C | ✅ |
| 9 | Hata ekranı, hata kaydı ve uygulama içi geri bildirim | C | ✅ |
| 10 | Kullanılmayan izinler kaldırıldı, iOS bildirim sınırı | C | ✅ |

## Mağazaya göndermeden önce

| # | İş | Sahip |
|---|---|---|
| 1 | Öğren metinleri ve dua mealleri ilahiyatçı kontrolünden geçsin | S |
| 2 | Dua sesleri için izin al ya da sesleri değiştir (`docs/CONTENT-SOURCES.md`) | S |
| 3 | Kur'an meallerinin kullanım izinlerini kontrol et; Tanzil kaynak satırını ekle | S + C |
| 4 | Mağaza metinleri, ekran görüntüleri, simge, yaş sınırı, veri güvenliği formları (Play Data safety, App Privacy) | S |
| 5 | Yakındaki yerler için ölçeklenebilir kaynak (Google Places anahtarı ya da kendi sunucun) | S + C |
| 6 | Android sürüm derlemesinde kod küçültme (R8) ve imzalama anahtarı | C + S |
| 7 | Gerçek YZ asistanı isteniyorsa model sağlayıcısına karar ver (şu an cihaz içi, ücretsiz) | S |
