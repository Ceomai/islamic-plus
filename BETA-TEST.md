# Islamic+ — Arkadaş beta test rehberi

App Store / Play Store yayını **olmadan** arkadaşlarınıza uygulamayı dağıtmak için bu rehberi kullanın.

**Expo proje paneli:** https://expo.dev/accounts/aimelih/projects/islamic  
**Gizlilik politikası:** [docs/PRIVACY.md](docs/PRIVACY.md) (TestFlight için App Store Connect’e bu URL’yi girin)

---

## Kısa yol: test turunu adım adım yürütmek

**Aşama 1 — Önce sen dene (1–2 gün)**
1. Supabase › SQL Editor'de `supabase/migrations/009_feedback_flood_guard.sql` dosyasını çalıştır.
2. [Builds](https://expo.dev/accounts/aimelih/projects/islamic/builds) sayfasında son Android derlemesi **Finished** olunca telefondan aç → **Install** → APK'yı kur (Chrome'a "bilinmeyen uygulama" izni ver).
3. `docs/TEST-PLAN.md` listesini bir kez yürü. Özellikle Expo Go'da denenemeyenler: vakit bildirimi ve ezan sesi (telefon kilitliyken), ana ekran widget'ı, telefonu yeniden başlatınca bildirimlerin sürmesi.
4. Bir test geri bildirimi gönder (Diğer › Geri bildirim gönder) ve Supabase'de `app_feedback` tablosunda göründüğünü kontrol et.

**Aşama 1 — Test grubunu kur**
5. 5–15 kişi seç; farklı marka telefonlar olsun (Samsung, Xiaomi/Redmi, eski bir Android). Bildirimleri en çok bu markaların pil tasarrufu keser.
6. Bir WhatsApp/Telegram grubu aç; aşağıdaki "Arkadaşlara gönderilecek mesaj"ı APK bağlantısıyla gönder. Bağlantı, Builds sayfasındaki derlemenin adresidir (giriş gerektirmez; "internal distribution").
7. Herkesten ilk gün yalnızca kurulum + izinler + "yarın sabah namazı bildirimi geldi mi?" sorusunu iste.

**Aşama 2 — Test turu (1–2 hafta)**
8. Görev ver, serbest bırakma: 1. hafta vakitler/bildirim/widget, 2. hafta Kur'an, dualar, tesbih, kaza, Öğren. Her hafta başında gruba 3–4 maddelik kısa bir görev listesi at.
9. Geri bildirimler uygulama içinden gelir; 2–3 günde bir `supabase/queries/test-feedback-report.sql` sorgularını çalıştır. Gruptaki mesajları da aynı listeye ekle.
10. Düzeltmelerden sonra yeni APK derle (`npm run build:preview:android`). Yeni APK eskisinin üstüne kurulur, veriler silinmez; gruba "yeni sürüm" mesajını değişiklik listesiyle at.
11. Turun sonunda gruba 5 soru sor: en çok kullandığın 3 bölüm, hiç açmadığın bölüm, bildirimler doğru zamanda geldi mi, bir şey kafanı karıştırdı mı, arkadaşına önerir misin (1–10).

---

## Geliştirici: ilk kurulum (bir kez)

```powershell
cd C:\Users\PC\Desktop\Islamic
npm install
npx eas login
npm run eas:init          # zaten yapıldıysa atlayın
node scripts/generate-assets.js
```

EAS projesi: `@aimelih/islamic` — ID `f0b025b3-ca20-44b4-98e6-e257b7124521`

---

## Android — APK dağıtımı

### Derleme

**İlk build:** Keystore oluşturmak için etkileşimli mod gerekir — `baslat-beta-android.bat` çalıştırın ve “Generate new keystore?” → **Yes**.

Sonraki build’ler:

```powershell
npm run build:preview:android
```

Bittiğinde: [expo.dev → Builds](https://expo.dev/accounts/aimelih/projects/islamic/builds) → son build → **Download** / **Install** linki.

Son başarılı build linkini `beta-links.json` dosyasına kaydedin (örnek aşağıda).

### Arkadaşlara gönderilecek mesaj (Android)

```
Islamic+ beta (Android)

1) Bu linke tıkla ve APK indir: [APK_LINK]
2) Ayarlar → Güvenlik → "Bilinmeyen uygulamalar" / Chrome'dan yüklemeye izin ver
3) APK'yı kur, Konum ve Bildirim izinlerini aç
4) Geri bildirim: uygulamada Diğer sekmesi › Geri bildirim gönder (hata olduysa "Hata kayıtlarını ekle" açık kalsın)
5) Xiaomi/Samsung: Ayarlar › Uygulamalar › Islamic+ › Pil › Kısıtlama yok (yoksa bildirimler gecikebilir)
```

---

## iPhone — TestFlight

### Ön koşullar

- Apple Developer Program (~99 USD/yıl)
- [App Store Connect](https://appstoreconnect.apple.com) → yeni uygulama → Bundle ID: `com.islamicplus.app`
- Gizlilik politikası URL: GitHub’daki `docs/PRIVACY.md` ham linki veya Pages

### Derleme ve yükleme

```powershell
npm run build:preview:ios
npm run submit:ios
```

İlk seferde Apple hesabı / sertifika soruları için terminalde etkileşim gerekebilir (`eas credentials`).

### Testçi ekleme

1. App Store Connect → **Islamic+** → **TestFlight**
2. **External Testing** → yeni grup → build seçin
3. **Beta App Review** (ilk build, ~24–48 saat)
4. Davet: e-posta veya **Public Link**

### Arkadaşlara gönderilecek mesaj (iPhone)

```
Islamic+ beta (iPhone)

1) App Store'dan "TestFlight" uygulamasını indir
2) Davet linkine tıkla: [TESTFLIGHT_LINK]
3) Islamic+ yükle, izinleri ver
4) Geri bildirim: [FORM_LINK]
```

---

## Yeni sürüm gönderme

1. `app.json` → `version` artır (ör. `1.0.1`)
2. `npm run build:preview` veya platforma özel script
3. Android: yeni APK linki paylaş
4. iOS: `npm run submit:ios` → TestFlight’ta build’i test grubuna ata

---

## Test kontrol listesi

Arkadaşlarınızdan şunları denemelerini isteyin:

- [ ] Kayıt / giriş / misafir modu
- [ ] Konum açıkken namaz vakitleri
- [ ] Namaz bildirimi (gerçek build’de; Expo Go’da Android’de çalışmaz)
- [ ] Kıble pusulası
- [ ] Ana ekranı düzenle (ekle / kaldır / sıra)
- [ ] Kur’an okuma + yer imi + okumaya devam
- [ ] Hadis + yer imi
- [ ] Tesbih sayacı
- [ ] Karanlık mod / dil (TR-EN)

---

## Geri bildirim formu

Google Forms ile ücretsiz form oluşturun. Önerilen alanlar:

| Alan | Tür |
|------|-----|
| Ad (isteğe bağlı) | Kısa metin |
| Telefon modeli | Kısa metin (ör. iPhone 14, Samsung A54) |
| Android / iPhone | Çoktan seçmeli |
| Sürüm | Kısa metin (ör. 1.0.0) |
| Ne denediniz? | Uzun metin |
| Hata / öneri | Uzun metin |
| Ekran görüntüsü | Dosya yükleme |

Form linkini buraya yapıştırın: **https://forms.google.com/...** (siz oluşturduktan sonra)

---

## Sık sorulan sorular

**Expo Go QR kodu paylaşmalı mıyım?**  
Hayır. Uzak arkadaşlar için APK / TestFlight kullanın.

**Play Store gerekli mi?**  
Android APK için hayır. Mağaza yayını için ileride Play Console ($25) gerekir.

**Build kuyruğu uzun sürüyor**  
expo.dev → Builds sayfasından durumu izleyin; ücretsiz planda sıra olabilir.

**`com.islamic.app` başkası tarafından alınmış**  
`app.json` içinde `bundleIdentifier` / `package` değiştirip yeniden derleyin.
