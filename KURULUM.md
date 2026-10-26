# Islamic — Telefonda Çalıştırma Rehberi

## Sorunun nedeni

Telefonda gördüğünüz **“sürüm uyuşmazlığı”** hatası genelde şu anlama gelir:

1. **Expo Go sürümü ≠ Proje SDK sürümü**  
   Telefondaki Expo Go uygulaması **SDK 52** kullanır. Proje eskiden **SDK 51** idi — bu uyumsuzluk telefonda açılmayı engeller.

2. **npm paket çakışması**  
   `@react-navigation` v7 ile `react-native-screens` v3 birbirine uymuyordu. Bu bilgisayarda `npm install` hata veriyordu.

**Bu sorunlar düzeltildi:** Proje artık **Expo SDK 52** ile uyumlu paketlere güncellendi.

---

## Adım adım kurulum

### 1. Node.js kurulu olsun
[https://nodejs.org](https://nodejs.org) adresinden **LTS** sürümünü indirin.

Terminalde kontrol:
```powershell
node --version
npm --version
```

### 2. Bağımlılıkları yükleyin
```powershell
cd C:\Users\PC\Desktop\Islamic
npm install
```

### 3. Expo Go’yu telefona yükleyin
- **Android:** Google Play → “Expo Go” (güncel sürüm)
- **iPhone:** App Store → “Expo Go”

> Expo Go’yu **güncel** tutun. Eski Expo Go + yeni proje = sürüm hatası.

### 4. Bilgisayar ve telefon aynı Wi‑Fi’de olsun
Farklı ağdaysa QR kod çalışmaz.

### 5. Uygulamayı başlatın
```powershell
cd C:\Users\PC\Desktop\Islamic
npx expo start --clear
```

### 6. QR kodu okutun
- **Android:** Expo Go uygulamasını açın → “Scan QR code”
- **iPhone:** Kamera ile QR’ı okutun → Expo Go ile aç

---

## Hâlâ hata alırsanız

| Hata | Çözüm |
|------|--------|
| `SDK incompatible` / sürüm uyuşmazlığı | Expo Go’yu Play Store / App Store’dan **güncelleyin** |
| `npm ERESOLVE` | Proje klasöründe: `npm install` (`.npmrc` dosyası zaten ayarlı) |
| QR okunuyor ama bağlanmıyor | Aynı Wi‑Fi; Windows güvenlik duvarında Node’a izin verin |
| Expo hesabı istiyor | **Gerekmez.** `w` (web) tuşuna basmayın; sadece QR ile telefonda açın |
| Metro / bundler hatası | `npx expo start --clear` ile önbelleği temizleyin |

### Tunnel modu (Wi‑Fi sorunu varsa)
```powershell
npm run start:tunnel
```
(Bazen Expo hesabı isteyebilir; önce normal modu deneyin.)

---

## iPhone — "Request timed out" hatası

Bu hata, iPhone'un bilgisayardaki Metro sunucusuna **ulaşamadığı** anlamına gelir. Sürüm uyumsuzluğu değildir.

### Hızlı çözüm (sırayla deneyin)

**1. Tunnel modu (en güvenilir)**
```powershell
cd C:\Users\PC\Desktop\Islamic
npm run start:tunnel
```
QR kodu tekrar okutun. Tunnel, ağ engellerini aşar.

**2. Windows Güvenlik Duvarı**
`firewall-izin-ver.bat` dosyasına **sağ tık → Yönetici olarak çalıştır**  
(Port 8081'i açar — Metro bundler bu portu kullanır.)

**3. Manuel URL (Expo Go içinde)**
Expo Go → **Enter URL manually**:
```
exp://192.168.1.5:8081
```
(Bilgisayar IP'niz farklıysa terminaldeki `exp://...` adresini kullanın.)

**4. Ağ kontrol listesi**
- iPhone **Wi‑Fi**'de olsun (mobil veri kapalı)
- Bilgisayar ve telefon **aynı ev ağında** (192.168.1.x)
- iPhone veya PC'de **VPN kapalı**
- iPhone **Kişisel Erişim Noktası** kullanmayın — PC o hotspot'a bağlı olmamalı

**5. Bilgisayar -lan ile başlatın**
```powershell
npm run start:clear
```

### iPhone 14 notu
Kamera ile QR okutunca Expo Go açılır. Timeout alırsanız Expo Go'yu doğrudan açıp **Scan QR code** veya **Enter URL manually** kullanın.

---

## Özet

| Bileşen | Sürüm |
|---------|--------|
| Expo SDK | 54 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| React Navigation | 7.x |
| Expo Go (telefon) | En güncel sürüm |

Sorun **Windows sürücüsü** değil; **yazılım paket sürümlerinin** birbiriyle ve telefonunuzdaki **Expo Go** ile uyuşmamasıydı. Güncellemeden sonra yukarıdaki adımlarla çalışması gerekir.

---

## Arkadaş test sürümü (App Store öncesi)

**Expo Go QR kodunu arkadaşlarınıza göndermeyin** — uzaktaki kişiler bağlanamaz; bildirimler de sınırlıdır.

| Kim | Nasıl |
|-----|--------|
| Siz (geliştirme) | `npx expo start` + Expo Go |
| Arkadaşlar | **APK** (Android) veya **TestFlight** (iPhone) |

### Hızlı başlangıç

1. Detaylı rehber: **[BETA-TEST.md](BETA-TEST.md)**
2. İlk Android APK: **`baslat-beta-android.bat`** çift tık (keystore sorusuna **Yes**)
3. iPhone TestFlight: **`baslat-beta-ios.bat`**
4. Build listesi: https://expo.dev/accounts/aimelih/projects/islamic/builds

### Komutlar

```powershell
npm run build:preview:android
npm run build:preview:ios
npm run submit:ios
```

Gizlilik metni (TestFlight): [docs/PRIVACY.md](docs/PRIVACY.md)
