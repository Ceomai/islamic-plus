# Islamic+ — Yayın Öncesi Denetim Raporu

> Tarih: 3 Kasım 2026 · Dal: `audit/fixes` (`feat/test-release` 939830b üzerinden, 27 commit) · Ortam: yerel web önizlemesi (Supabase bağlantısı kapalı, yerel demo hesap), kod incelemesi, otomatik testler. **Production veritabanına ve canlı servislere hiçbir yazma yapılmadı**; Supabase migration'ı ve Edge Function değişiklikleri yazıldı ama uygulanmadı/yayınlanmadı.

## 1. Yönetici özeti

**Denetim öncesi 6/10 → düzeltmelerden sonra 8/10.**

Temel ibadet özellikleri (vakitler, Kur'an, hadis, dua, tesbih, imsakiye) baştan beri çalışıyor ve görsel olarak tutarlıydı. Denetim, gerçek kullanıcıya zarar verecek üç sorun sınıfı buldu ve hepsi kapatıldı:

1. **Sessiz veri kaybı (Kritik):** Yeni cihazda bulut ayarları varsayılanlarla eziliyordu. Namaz kayıtları 500'de kesildiği için yaklaşık 100 gün sonra geçmiş siliniyor, senkronda en yeni işaretler kayboluyordu. Ayrıca şu kayıplar düzeltildi:
   - açılış senkronu sırasında yapılan değişikliklerin ezilmesi,
   - misafir verisinin hesap açınca kaybolması,
   - silinenlerin senkronda geri gelmesi,
   - hızlı dokunuşlarda sayımların kaybolması.
2. **Yanlış sonuç veren hesaplar (Yüksek):** Zekât "100.000 TL" girişini 100 TL okuyordu; kutup bölgelerinde vakitler "NaN:NaN" ya da sırasızdı.
3. **Erişilemeyen ana özellikler (Yüksek):**
   - Konum izni ya da GPS yoksa vakit hiç gösterilemiyordu; artık 81 il ve 29 yurt dışı şehirden elle seçim var.
   - Çevrimdışı açılışta oturum düşüyordu.
   - Yer imleri görülemiyor ve kaldırılamıyordu.
   - Kur'an listesi internetsiz açılmıyordu.

**Puanın 10 olmamasının nedenleri:**
- Supabase'deki kötüye kullanım sınırları (migration 010) ve Edge Function kotaları henüz **uygulanmadı**.
- İki bulgu gerçek cihaz gerektirdiği için doğrulanamadı.
- Yedeği geri yükleme yeni bir yerel modül (yeni APK) gerektirdiği için bekliyor.
- Derleme araçlarında `npm audit` uyarıları sürüyor.

| Ölçüm | Önce | Sonra |
|---|---|---|
| Otomatik test | 5 dosya / 108 test | 9 dosya / **148 test** (tümü geçiyor) |
| ESLint | yapılandırma yok (geçici çalıştırmada 17 hata) | **0 hata**, 53 uyarı; CI'da çalışıyor |
| TypeScript / çeviri anahtarları | ✅ / 499 | ✅ / 521 |
| Derleme (`expo export`) | Android / iOS / Web ✅ | Android / iOS / Web ✅ |
| 1000 alışkanlıkla ekran açılışı | 10,9 sn, 32.777 DOM düğümü | **0,19 sn**, 551 düğüm |
| Aynı anda 2 dokunuşta namaz işareti | 3/3 denemede yanlış | 3/3 doğru |

## 2. Mimari haritası ve özellik envanteri

### 2.1 Katmanlar

```
App.tsx
 ├─ ErrorBoundary + global hata yakalayıcı (errorLog.ts → app_errors, çevrimdışı kuyruk)
 ├─ AuthProvider (context/AuthContext.tsx)
 │    └─ services/auth.ts ── 'supabase' → supabaseAuth.ts (Supabase Auth, secureSessionStorage)
 │                       └─ 'local'    → localAuth.ts (SHA-256 + tuz, AsyncStorage) — .env yoksa "demo mod"
 ├─ AppProvider (context/AppContext.tsx): ayarlar, konum, günün vakitleri, alışkanlıklar, aile,
 │    istatistik, asistan sohbeti, bildirim planlama, widget, senkron tetikleme
 └─ Onboarding (screens/OnboardingScreen.tsx) ya da AppNavigator (navigation/AppNavigator.tsx)
      Sekmeler: Ana Sayfa (HomeStack) · İbadet (QiblaScreen) · Öğren (LearnStack) · Diğer (MoreStack)
      Misafir kısıtı: config/featureAccess.ts + components/GuestGate.tsx (7 özellik)

Depolama: services/storage.ts — AsyncStorage anahtarları hesaba göre kapsamlanır ("anahtar@@kapsam");
          cihaz geneli: oturum, çevrimdışı ses, dil, Kur'an/hadis önbelleği (@qurancache/…).
Senkron:  cloudSync.ts (birleştirme + silme kayıtları/tombstones.ts), userDataCloud.ts (push/pull,
          sync_user_app_data RPC, tek "default" kapsam), readingProgressCloud.ts (üyeye özel okuma ilerlemesi).
Backend:  Supabase — migrations 001–010; Edge Functions: assistant (Claude), places (OSM/Google Places).
Dış:      api.alquran.cloud (Kur'an metin/ses), jsDelivr (hadis, dua sesi), Overpass/Nominatim, EAS Update.
Yerel:    adhan (vakit), expo-notifications (60 bildirim bütçesi), expo-widgets + expo-background-task, expo-audio.
```

### 2.2 Özellik envanteri

| Özellik | Ekran(lar) | Servis / veri | Dış bağımlılık |
|---|---|---|---|
| Hesap / misafir / şifre sıfırlama / hesap silme | AuthScreen, DeleteAccountScreen, PasswordResetForm | auth.ts, supabaseAuth.ts, localAuth.ts, authValidation.ts | Supabase Auth, migration 001/006 |
| Tanıtım (dil, mezhep, yöntem, konum/şehir, bildirim) | OnboardingScreen | AppContext, location.ts, data/cities.ts, notifications.ts | — |
| Konum / şehir seçimi | CityPickerScreen, components/CityPicker | location.ts, data/cities.ts | GPS (isteğe bağlı) |
| Namaz vakitleri + işaretleme + seri | HomeScreen | prayerTimes.ts, prayerTracking.ts, prayerHistory.ts, statistics.ts | adhan |
| Vakit bildirimleri, ezan sesi, gün bazlı kapatma | NotificationSettingsScreen | notifications.ts, notificationBudget.ts, audio.ts | expo-notifications |
| Gelişmiş hatırlatıcılar | AdvancedRemindersScreen | advancedReminders.ts | expo-notifications |
| Kur'an listesi / okuyucu / ses / yer imi / hatim | QuranScreen, QuranReaderScreen | data/surahs.ts, quranApi.ts, readingProgress.ts, audio.ts | alquran.cloud |
| Hadis (Kütüb-i Sitte, Türkçe bölüm adları) | HadithScreen | hadithApi.ts, data/hadithIndex.json, hadithSectionsTr.json | jsDelivr |
| Dualar (69, amaç araması, ses, çevrimdışı indirme) | DuasScreen, DuaDetailScreen | data/duas.ts, audio.ts | jsDelivr |
| Öğren kütüphanesi (36 konu) | EducationScreen, EducationDetailScreen | data/learn.ts, educationProgress.ts | — |
| Tesbih + istatistik | TasbihScreen, TasbihStatsScreen | tasbihStorage.ts | — |
| Kaza takibi | KazaScreen | kaza.ts | — |
| Zekât + geçmiş, görevler | DutiesScreen | zakat.ts, zakatHistory.ts | — |
| İmsakiye / Ramazan sayacı | ImsakiyeScreen | ramadan.ts | — |
| Hicri takvim | CalendarScreen | hijriCalendar.ts | — |
| Kıble | QiblaScreen (İbadet sekmesi) | qibla.ts | sensör |
| Yakındaki camiler | PlacesScreen | places.ts | Overpass/Nominatim (+ places edge fn) |
| Alışkanlıklar, aile modu, istatistikler | HabitsScreen, FamilyModeScreen, StatisticsScreen | AppContext, statistics.ts | — |
| Asistan (5 dilde istek, cihazda) | AIAssistantScreen | assistant/ (+ assistantRemote.ts, kapalı) | (assistant edge fn) |
| Ana ekran düzenleme, temalar, widget'lar | HomeLauncherEditScreen, ThemesScreen, WidgetsScreen | homeWidget.ts, widgetBackground.ts | expo-widgets |
| Bulut senkron / yedek | CloudSyncScreen | cloudSync.ts, userDataCloud.ts, tombstones.ts | Supabase |
| Geri bildirim / hata raporu | FeedbackScreen | errorLog.ts | Supabase (008/009) |

### 2.3 Başlangıç ölçümleri (Aşama 0)

| Kontrol | Sonuç |
|---|---|
| `tsc --noEmit` | ✅ hata yok |
| `jest --ci` | ✅ 5 dosya, 108 test |
| Çeviri anahtarları | ✅ 499 anahtar, TR/EN eşit |
| Derleme (`expo export`) | ✅ Android 93 sn / iOS 83 sn / Web 81 sn; Hermes paketi ~9,6 MB |
| ESLint (geçici kuruldu) | ⚠️ 17 hata, 29 uyarı; projede lint yapılandırması yoktu |
| `npm audit --omit=dev` | ⚠️ 1 kritik, 8 yüksek; çoğu derleme aracı (@expo/cli) |

### 2.4 Yöntem

- **Aşama 1, canlı simülasyon:** Web önizlemesinde, Supabase kapalıyken (production'a yazmamak için) 7 persona uygulandı:
  - yeni kullanıcı,
  - yaşlı / yavaş kullanıcı,
  - hızlı kullanıcı,
  - kötü niyetli kullanıcı (XSS / SQL girdileri, devasa sayılar),
  - kesik internetli kullanıcı,
  - 1000 kayıtla çalışan kullanıcı,
  - kutup bölgesinde / farklı saat diliminde yaşayan kullanıcı.
- **Aşama 2, uzman denetimi:** 6 uzman rol paralel çalıştı (güvenlik, veri, frontend + performans, UX + erişilebilirlik + çeviri, ürün + QA, kod kalitesi). Her rolün bulgularını ayrı bir doğrulayıcı koda bakarak çürütmeye çalıştı.
- **Aşama 3, eleme:** 78 uzman bulgusu ve 13 canlı bulgu, tekrarlar birleştirilince 51 ayrı soruna indi. 1 bulgu çürütüldü, 2'si gerçek cihaz gerektirdiği için doğrulanamadı.

## 3. Bulgular

Kaynak: **C** = canlı persona simülasyonu, **U** = uzman kod denetimi ve doğrulayıcı. Durumlar:

- **Düzeltildi:** Aynı senaryoyla yeniden denendi, mümkünse otomatik test eklendi.
- **Düzeltildi – uygulanması bekliyor:** Kod hazır; Supabase'e uygulanması ya da yayınlanması sizde.
- **Bekliyor:** Bilinçli olarak bırakıldı; gerekçesi 5. bölümde.
- **Doğrulanmadı:** Gerçek cihaz gerekiyor.

### Kritik

| # | Başlık | Kategori | Dosya:satır | Nasıl üretilir | Beklenen / Gerçekleşen | Çözüm | Durum |
|---|---|---|---|---|---|---|---|
| K1 | Yeni cihazda buluttaki ayarlar varsayılanlarla eziliyor | Veri kaybı | src/services/cloudSync.ts:149 | Cihaz A'da TR/Diyanet; cihaz B'de aynı hesapla giriş | Bulut ayarları gelmeli / B'nin varsayılanları buluta yazılıyordu (`exportedAt` hep "şimdi") | Ayarlara `updatedAt` (yalnızca kullanıcı değişikliğinde); birleştirme onu karşılaştırıyor | **Düzeltildi** (test: sync.test.ts) |
| K2 | Namaz kayıtları 500'de kesiliyor: ~100 gün sonra geçmiş/seri kaybı, senkronda en yeni işaretler siliniyor | Veri kaybı | src/services/prayerTracking.ts:42 · cloudSync.ts:255 | 100+ gün kullanım ya da 500+ kayıtla senkron | Geçmiş korunmalı / eski ve en yeni kayıtlar düşüyordu | 3 yıllık tarih penceresi, kesmeden önce sıralama, tek ortak birleştirme (prayerHistory.ts) | **Düzeltildi** (test) |

### Yüksek

| # | Başlık | Kategori | Dosya | Nasıl üretilir | Çözüm | Durum |
|---|---|---|---|---|---|---|
| Y1 | Zekât: "100.000 TL" → 100 TL | Hesap hatası | src/services/zakat.ts `parseAmount` (önce DutiesScreen.tsx:15) | Nakit alanına "100.000" | Dile göre ayırıcı kuralı; negatif/metin reddi | **Düzeltildi** (test) |
| Y2 | Açılış senkronu sırasında yapılan değişiklikler eziliyor; ilk push birleştirilmemiş veriyi yazıyor | Veri kaybı | src/services/userDataCloud.ts | Açılışta senkron bitmeden işaretle | Yerel veri sunucu cevabından sonra okunuyor; birleşik veri gönderiliyor | **Düzeltildi** (test) |
| Y3 | Misafirden hesaba geçişte tüm veri kayboluyor | Veri kaybı | src/services/auth.ts · storage.ts | Misafir olarak kullan → hesap aç | Kayıtta misafir verisi yeni hesaba kopyalanıyor | **Düzeltildi** (test + canlı: kaza, işaret, şehir taşındı) |
| Y4 | Çevrimdışı soğuk açılışta oturum düşüyor | Oturum | src/services/supabaseAuth.ts · auth.ts | Uçak modunda kapat-aç | Ağ hatasında saklı oturumla devam | **Düzeltildi** (test) |
| Y5 | Konum/GPS yoksa vakit yok; tanıtımda düğme sonsuz dönüyor | Ana özellik | location.ts · OnboardingScreen.tsx | Konum iznini reddet / GPS kapalı | 15 sn zaman aşımı + son bilinen konum; 81 il + 29 şehirden elle seçim | **Düzeltildi** (test + canlı) |
| Y6 | Kutup bölgesinde "NaN:NaN", ardından sırasız vakitler | Ana özellik | src/services/prayerTimes.ts | Svalbard, Kasım | Önerilen yüksek enlem kuralı; kullanılamayan günlerde 48,5° kuralı | **Düzeltildi** (13 test + canlı) |
| Y7 | Yer imleri listelenemiyor/kaldırılamıyor | Eksik özellik | QuranScreen.tsx · QuranReaderScreen.tsx · HadithScreen.tsx | Yer imi ekle → listeyi ara | "Yer imlerim" listesi, kaldırma, aç-kapa düğmesi | **Düzeltildi** (test) |
| Y8 | Aile üyesi değişince veriler karışıyor, silinenler geri geliyor | Veri tutarlılığı | userDataCloud.ts · AppContext.tsx | Aile modunda üye değiştir | Uygulama verisi tek bulut kapsamında; okuma ilerlemesi üyeye özel | **Düzeltildi** (test) |
| Y9 | Kötüye kullanım: anon `log_auth_event` sınırsız, senkronda kapsam/boyut sınırı yok, tesbih/zekât her push'ta yeniden ekleniyor | Güvenlik (DoS/kota) | supabase/migrations/005, 003 | anon anahtarla döngüde RPC | Migration 010: hız sınırı, kapsam biçimi + en fazla 10 kapsam, boyut/satır sınırları, ekleme yerine değiştirme | **Düzeltildi – uygulanması bekliyor** |
| Y10 | Başkasının e-posta özeti önceden alınarak kayıt engellenebiliyor | Güvenlik | supabase/migrations/001:61, 002:37 | Kurbanın özetini `upsert_user_profile` ile yaz | Özet sunucuda e-postadan üretiliyor; istemci değeri yok sayılıyor; hatalı kayıtlar düzeltiliyor | **Düzeltildi – uygulanması bekliyor** |

### Orta

| # | Başlık | Dosya | Durum |
|---|---|---|---|
| O1 | Silinenler senkronda geri geliyor | tombstones.ts (yeni), cloudSync.ts, readingProgressCloud.ts | **Düzeltildi** (test) |
| O2 | Hızlı dokunuşta kayıp: namaz, tesbih, kaza | prayerTracking.ts, tasbihStorage.ts, kaza.ts, utils/serial.ts | **Düzeltildi** (test + canlı) |
| O3 | Bildirimler her ayar değişiminde iki kez paralel planlanıyor | AppContext.tsx `updateSettings` | **Düzeltildi** |
| O4 | Kur'an listesi internetsiz açılmıyor; istekte zaman aşımı yok | QuranScreen.tsx, quranApi.ts, data/surahs.ts | **Düzeltildi** (test + canlı) |
| O5 | Yüklenmeyen sure "kaldığın yer"i ayet 1 ile eziyor | QuranReaderScreen.tsx | **Düzeltildi** |
| O6 | Okuma ilerlemesinde "son senkronlanan" kazanıyor | readingProgressCloud.ts | **Düzeltildi** (test) |
| O7 | "Şimdi senkronize et" hatada başarılı gösteriyor | AppContext.tsx `syncNow` | **Düzeltildi** |
| O8 | Bildirim izni reddedilince uyarı yok | NotificationSettingsScreen.tsx, notifications.ts | **Düzeltildi** |
| O9 | Kaza toplu eklemede sınır yok ("1e9" → 365 milyar) | KazaScreen.tsx, kaza.ts | **Düzeltildi** (test + canlı) |
| O10 | Büyük listeler sanallaştırılmamış; hadis bölümünde Android geri tuşu ekrandan çıkıyor | HabitsScreen.tsx, HadithScreen.tsx | **Düzeltildi** (liste canlı ölçüldü; geri tuşu cihazda doğrulanmalı) |
| O11 | Asistan ekrandan çıkınca bile yönlendiriyor; çift gönderim | AIAssistantScreen.tsx | **Düzeltildi** |
| O12 | Dua indirmesi HTTP hatasını sessiz dosya olarak kaydediyor | services/audio.ts | **Düzeltildi** |
| O13 | Diğer › "Ana ekranı düzenle" çalışmıyor | AppNavigator.tsx | **Düzeltildi** |
| O14 | Erişilebilirlik: adsız alanlar/anahtarlar, AA altı kontrast, küçük dokunma hedefleri | ui/TextField.tsx, ui/Chip.tsx, theme/tokens.ts, constants/themes.ts | **Düzeltildi** (canlı erişilebilirlik ağacı) |
| O15 | Onaysız silmeler (hatırlatıcı, sohbet) | utils/confirm.ts, ilgili ekranlar | **Düzeltildi** |
| O16 | "Şu günlerde bildirme" görsel anlamı ters | NotificationSettingsScreen.tsx | **Düzeltildi** |
| O17 | Edge function maliyet istismarı | supabase/functions/assistant, places | **Düzeltildi – uygulanması bekliyor** |
| O18 | Geri bildirim flood guard'ı global | migration 009 | **Bekliyor** |
| O19 | Yedek dışa aktarılıyor ama geri yüklenemiyor | CloudSyncScreen.tsx | **Bekliyor** |
| O20 | Kur'an/hadis önbelleği Android'de 6 MB sınırını doldurabilir | quranApi.ts | **Doğrulanmadı** |
| O21 | En büyük yazı boyutunda ana sayfa taşması | HomeScreen.tsx | **Doğrulanmadı** |

### Düşük

| # | Başlık | Durum |
|---|---|---|
| D1 | E-posta özeti tuzsuz SHA-256 | **Bekliyor**: benzersizlik için gerekli; artık sunucuda üretiliyor (Y10) |
| D2 | Yerel (demo) hesapta tek tur SHA-256 | **Bekliyor**: yalnızca `.env` olmayan demo modunda |
| D3 | Asistan sohbeti sınırsız büyüyor | **Düzeltildi** (son 200 mesaj) |
| D4 | Yakındaki yerlerde eski sonuç yeniyi eziyor | **Düzeltildi** |
| D5 | AppContext değeri memo'lanmıyor | **Bekliyor**: geniş kapsamlı yeniden düzenleme |
| D6 | Kıble pusulası Türkçede N/E/S/W | **Düzeltildi** (K/D/G/B) |
| D7 | "İbadet" sekmesi yalnızca kıble | **Bekliyor**: ürün kararı |
| D8 | Asistanın "5 dil" iddiası | **Düzeltildi** (mağaza metni) |
| D9 | İşaret aç-kapa ile puan | **Bekliyor**: yalnızca yerel puan |
| D10 | Widget ekranı yanlış metin | **Düzeltildi** |
| D11 | Kritik mantıkta test eksikliği | **Kısmen**: senkron, auth, depolama, sıra ve kutup testleri eklendi; bildirim planlama testi yok |
| D12 | Eski dokümanlar/betikler | **Düzeltildi** |
| D13 | E-posta doğrulaması `<script>…@x.com` kabul ediyor | **Düzeltildi** (test + canlı) |
| D14 | Başlıkta şehir yerine "Konumunuz" | **Kısmen**: elle seçimde şehir adı görünüyor; web'de GPS'ten şehir adı yok |
| D15 | Metin hatası; geri düğmesi "Home" | **Düzeltildi** |
| D16 | Uzunluk sınırı yok | **Düzeltildi** (alışkanlık 80, asistan 500 karakter) |
| D17 | Web'de Alert çalışmıyor (silme/sıfırlama) | **Düzeltildi** |
| D18 | Lint yapılandırması yok; `npm audit` | Lint **düzeltildi**; audit **bekliyor** |

**Son turda bulunup düzeltilenler:**
- Tanıtımda elle seçilen şehir için "İzin verildi" yazısı.
- Web'de onay kutularının durum bilgisi.
- Kutup bölgesinde sırasız vakitler (Y6'nın devamı).

**Çürütülen bulgu:** "Hesap silmede geri bildirim/hata kayıtları kalıyor." Bu bilinçli bir tercih ve gizlilik sayfasında açıklanmış.

## 4. Yapılan değişiklikler (dal: `audit/fixes`)

| Commit | Açıklama |
|---|---|
| 7aae25a | Namaz kayıtları 3 yıl tutuluyor, hızlı dokunuşlar sırayla (K2, O2) |
| 20cbf4d | Yeni cihaz ayarları ezmiyor, senkron en yeni işaretleri koruyor, tek bildirim planlaması (K1, K2, O3) |
| cc725e0 | Zekât binlik ayırıcı (Y1) |
| 20b38e2 | Kutup bölgelerinde NaN yerine gerçek vakit (Y6) |
| eebb635 | Çevrimdışı açılışta oturum korunuyor (Y4) |
| 935413e | Misafir verisi yeni hesaba taşınıyor (Y3) |
| ec7738c | Elle şehir seçimi, GPS zaman aşımı (Y5) |
| 32295f2 | Açılış senkronu yarışı, tek uygulama-veri kapsamı, "Şimdi senkronize et" hatası (Y2, Y8, O7) |
| e5881c8 | Yer imleri listesi ve kaldırma (Y7) |
| 0cdd25f | Migration 010: kötüye kullanım sınırları, sunucuda e-posta özeti (Y9, Y10) |
| 120a803 | Tesbih ve kazada her dokunuş sayılıyor (O2) |
| bf5dbc5 | Kaza toplu ekleme doğrulaması (O9) |
| b883117 | Kur'an çevrimdışı liste, önce önbellek, zaman aşımı, kaldığın yer (O4, O5) |
| bbfc4bc | Silinenler silinmiş kalıyor, son okunan yer (O1, O6) |
| 06ce2e7 | Diğer › Ana ekranı düzenle; bildirim izni uyarısı (O13, O8) |
| bd4e557 | Asistan yönlendirmesi, onay pencereleri (O11, O15, D16, D17) |
| 17cea5f | Sanallaştırılmış alışkanlık listesi (O10) |
| d8d29f5 | Hadis bölümünde Android geri tuşu (O10) |
| 2b1167a | Dua indirmesinde HTTP kontrolü (O12) |
| f7de2eb | Erişilebilirlik: etiketler, kontrast, dokunma hedefleri, Türkçe pusula (O14, D6, D15) |
| 53df029 | Bildirim günleri seçicisinin anlamı (O16) |
| 320a5f0 | Edge function kotaları ve sınırları (O17) |
| 456e0a5 | Sohbet sınırı, yer yarışı, widget metni, e-posta doğrulaması (D3, D4, D10, D13) |
| a8e35f8 | Eski doküman/betik düzeltmeleri (D12, D8) |
| bc37d7c | ESLint + CI (D18) |
| 510bfb1 | Web onay kutusu durumu; elle şehirde doğru metin |
| 70c3c65 | Kutup bölgesinde sıralı vakitler (48,5° kuralı) |

**Kapsam:** 72 dosya, +6621 / −1562 satır.

**Yeni test dosyaları:** `sync.test.ts`, `auth.test.ts`, `userDataCloud.test.ts`, `readingProgress.test.ts`. Mevcut test dosyalarına da yeni testler eklendi.

### Son tur (Aşama 5) sonuçları

| Persona / senaryo | Sonuç |
|---|---|
| Yeni kullanıcı, GPS yok → tanıtım → listeden İzmir | ✅ düğme takılmıyor, vakitler İzmir'e göre |
| Yaşlı/yavaş kullanıcı: konumsuz ana sayfa | ✅ "Konum seçilmedi" kartı + "Listeden şehir seç" |
| Hızlı kullanıcı: aynı anda 2 ve 7 dokunuş | ✅ 3/3 doğru (önce 3/3 yanlış); 3 hızlı kaza "+" = 3 |
| Kötü niyetli: XSS/SQL e-posta, "1e9"/"-3" kaza | ✅ reddediliyor, açıklayıcı mesaj |
| Kesik internet: Kur'an listesi | ✅ internetsiz açılıyor (Türkçe sure adları) |
| Büyük veri: 1000 alışkanlık | ✅ 0,19 sn (önce 10,9 sn) |
| Farklı ülke: Svalbard, Kasım | ✅ NaN yok, vakitler sıralı |
| Misafir → hesap açma | ✅ kaza, işaret ve şehir korunuyor |
| Ekran okuyucu | ✅ form alanları, anahtarlar, onay kutuları adlı ve durumlu |

**Son komut çıktıları:**
- `npx tsc --noEmit`: ✅
- `npm run lint`: 0 hata, 53 uyarı
- `npx jest --ci`: 148/148 ✅
- `node scripts/check-i18n.js`: 521 anahtar ✅
- `expo export`: Android, iOS ve Web ✅

## 5. Düzeltilmeyen sorunlar ve nedenleri

- **Migration 010 ve Edge Function değişiklikleri uygulanmadı (Y9, Y10, O17).** Production veritabanını değiştirmek bu denetimin kapsamı dışında. Yapılması gerekenler:
  - Supabase › SQL Editor'de `010_abuse_limits.sql` dosyasını çalıştırmak.
  - Ardından `supabase functions deploy assistant places` komutunu çalıştırmak.

  SQL yerel bir Postgres'te çalıştırılamadı; production'dan önce bir test projesinde denenmesi önerilir.
- **O18 (global flood guard):** Cihaz kimliği olmadan misafirleri ayrı ayrı sınırlamak mümkün değil. Test turu için kabul edilebilir.
- **O19 (yedek geri yükleme):** Dosya seçici yeni bir yerel modül gerektiriyor; bu da yeni APK ve sürüm artışı demek. Bir sonraki yerel sürümle eklenmeli. O zamana kadar bulut senkronu yedek işlevini görüyor.
- **O20, O21:** Gerçek bir Android cihaz gerekiyor (6 MB AsyncStorage sınırı, en büyük yazı boyutu). Test turunda kontrol edilmeli.
- **D1, D2, D5, D7, D9:** Gerekçeleri tabloda; zararları düşük ya da ürün kararı gerektiriyor.
- **`npm audit`:** 1 kritik ve 8 yüksek uyarı var, neredeyse tamamı derleme araçlarında (@expo/cli). Çalışma zamanındaki tek yol `@react-navigation/core → query-string → decode-uri-component`; bozuk bir derin bağlantıyla yavaşlamaya yol açabilir. Expo ve React Navigation güncellemesiyle kapanır.
- **ESLint'in 53 uyarısı:** Çoğu React Compiler önerisi ve `exhaustive-deps`. Davranış hatası olduğu doğrulananlar düzeltildi.
- **Web'de üst bardaki geri bağlantısı:** Hadis bölümünde hâlâ ekrandan çıkarıyor (yalnızca web önizlemesi). Android'in fiziksel geri tuşu düzeltildi.

## 6. Güvenlik özeti

- **Kimlik doğrulama ve yetki:**
  - Tüm kullanıcı tabloları RLS ile korunuyor; RPC'ler `auth.uid()` ile sınırlı; SECURITY DEFINER fonksiyonlarında `search_path` sabit.
  - Başka kullanıcının verisine erişim (IDOR) bulunmadı.
  - Bulunan yetki açığı: e-posta özetinin istemciden alınması, başkasının kaydını engellemeye izin veriyordu (Y10). Migration 010 ile kapatılıyor.
- **Kötüye kullanım ve maliyet:**
  - Anon kullanıcı `auth_logs` tablosunu sınırsız doldurabiliyordu.
  - Senkron RPC'leri depolamayı şişirebiliyordu (Y9).
  - Google Places ve Claude çağrılarında kota eksikti (O17).

  Hepsi için sınırlar yazıldı; uygulanmaları bekliyor.
- **Enjeksiyon ve XSS:** `<script>`, `<img onerror>` ve `' OR 1=1 --` girdileri canlı denendi. React metni kaçırdığı için çalışmıyor; SQL tarafı parametreli ya da RPC. E-posta doğrulaması da sıkılaştırıldı.
- **Gizli anahtarlar:** Depoda ve geçmişte gerçek anahtar yok; yalnızca `sk-ant-...` gibi yer tutucular var. Anon anahtarın istemcide olması Supabase'in tasarımı gereği.
- **Depolama:** Oturum Supabase'de `secureSessionStorage` ile tutuluyor. Demo modundaki yerel hesaplar AsyncStorage'da; bu mod yalnızca `.env` yokken devreye giriyor.

## 7. Önerilen sonraki adımlar

1. **Supabase:** `010_abuse_limits.sql` dosyasını önce bir test projesinde, sonra production'da çalıştırın; ardından `assistant` ve `places` fonksiyonlarını yayınlayın.
2. **Birleştirme:** `audit/fixes` dalını `main`'e birleştirin (PR, CI yeşil olunca).
3. **Dağıtım:** Düzeltmelerin çoğu yalnızca JavaScript, yani uygulama içi güncellemeyle gönderilebilir. Yine de yeni bir test APK'sıyla tam tur yapılması önerilir.
4. **Gerçek cihaz testi (docs/TEST-HAZIRLIK.md):** O20, O21, hadis geri tuşu, elle şehir seçimi ve bildirim izni kartı.
5. **Bir sonraki yerel sürüm:** Yedek geri yükleme (O19) ve Expo / React Navigation güncellemesi (`npm audit`).
6. **Teknik borç:**
   - AppContext'in bölünmesi ve memo'lanması (D5),
   - bildirim planlama testleri (D11),
   - kalan ESLint uyarıları.
