# Islamic+ — Modül kontrolü ve tasarım takımı değerlendirmesi

> 3 Kasım 2026 · Dal: `audit/fixes` · Ortam: yerel web önizlemesi, telefon boyutu (375×812), yerel test hesabı, Supabase kapalı. Bildirim, widget, ezan sesi ve pusula gibi yalnızca telefonda çalışan parçalar burada kod üzerinden değerlendirildi; cihazda ayrıca denenmeli (docs/TEST-HAZIRLIK.md).

## 1. Modül modül kontrol sonucu

Her modül açıldı ve **asıl işi** yaptırıldı (yalnızca ekranın açılması değil). Hata mesajı, `NaN`/`undefined` ve konsol hatası arandı.

| Modül | Denenen | Sonuç |
|---|---|---|
| Hesap aç / giriş / misafir | yerel hesap açma, geçersiz e-posta | ✅ |
| Tanıtım | dil, mezhep, yöntem, GPS'siz şehir seçimi | ✅ |
| Ana sayfa vakitleri | İstanbul vakitleri, işaretleme, sıradaki vakit | ✅ · İngilizcede AM/PM eksikti → **düzeltildi** |
| Kur'an listesi | açılış, arama | ❌ "yasin" hiçbir şey bulmuyordu → **düzeltildi** |
| Kur'an okuyucu | Yâsîn: Arapça + meal + 29 dinleme düğmesi | ✅ (başlık "Sure" yazıyor; içerik notu aşağıda) |
| Hadis | Buhârî › Abdest: 112 hadis + Arapça | ✅ |
| Dualar | "Sınav" amacı → dua detayı (Arapça, okunuş, anlam) | ✅ |
| Öğren | "teyemmum" araması → Teyemmüm | ✅ |
| Tesbih | sayaç 5/33 | ✅ |
| Asistan | "zekat hesapla", "nearest mosque" | ✅ · yanıtlarda `**yıldız**` ve geliştirici dili vardı → **düzeltildi** |
| Zekât | 500.000 TL nakit, gram altın 4.250 → 12.500 TL, nisap 340.765 TL | ✅ |
| Yakındaki camiler | İstanbul, 2 km | ✅ |
| Kıble | 152°, Kâbe'ye 2.405 km | ✅ (pusula cihazda) |
| İmsakiye | Ramazan 1448 tablosu, 97 gün kaldı | ✅ |
| İslami takvim | Kandiller ve bayramlar, kalan gün | ✅ |
| Kaza | ekleme, toplu ekleme doğrulaması | ✅ |
| Alışkanlıklar | ekleme, bugün işaretleme (1/7) | ✅ |
| İstatistikler | seri, haftalık, toplamlar | ✅ |
| Bildirim ayarları | vakit başına ses / zaman / günler | ✅ (bildirimin gelmesi cihazda) |
| Gelişmiş hatırlatıcılar | ekleme, saat doğrulaması | ✅ |
| Aile modu | açma, üye ekleme | ✅ |
| Temalar | 5 tema arasında geçiş | ✅ |
| Widget'lar | önizleme, içerik anahtarları | ✅ (telefon widget'ı cihazda) |
| Bulut senkron | yerel modda açıklama + yedek dışa aktarma | ✅ |
| Ayarlar | dil TR↔EN (Türkçe kalıntı yok), yöntem, meal | ✅ |

**Bu kontrolde bulunup düzeltilenler** (commit `2579f97`):
- **Kur'an araması:** Şapkalı ve Türkçe harfler artık dikkate alınmıyor. "yasin", "ya-sin", "kehf", "al-kahf" ve "ihlas" bulunuyor; testle doğrulandı.
- **Asistan yanıtları:**
  - `**kalın**` işaretleri artık gerçek kalın yazıya dönüşüyor.
  - "adhan kütüphanesi", "Expo Go", "Supabase" ve "featureAccess.ts" gibi geliştirici ifadeleri kullanıcı diline çevrildi.
- **İngilizce vakit şeridi:** "3:39" gibi belirsiz saatlerin altına küçük AM/PM eklendi.

**İçerik notu:** Diyanet meali bazı ayetleri birleştirdiği için (ör. Yâsîn 2–3) aynı meal iki ayetin altında tekrar görünüyor. Bu veri kaynağından geliyor. Birleşik ayetlerde meali bir kez gösterip "2–3. ayetler" diye işaretlemek okuru şaşırtmaz.

---

## 2. Tasarım takımı değerlendirmesi

Değerlendirmeyi on bakış açısından yaptım. Her birinde neyin iyi olduğu, gözlenen sorunlar ve öneri var. Öneriler küçükten büyüğe sıralı; en büyükleri 3. bölümde birleştiriliyor.

### 2.1 Ürün stratejisi
**İyi olan:**
- Temel ibadet ihtiyaçları (vakit, Kur'an, dua, kıble, imsakiye) tek uygulamada, reklamsız ve Diyanet uyumlu.
- Türkçe içerik kalitesi rakiplerden iyi.

**Sorunlar:**
- **Özellik sayısı derinlikten fazla:** 25 modül var; bazıları yarım. Aile modu yalnızca okuma ilerlemesini ayırıyor. "Yapay zekâ asistanı" aslında cihazdaki bir yönlendirici. Yedek dışa aktarılıyor ama geri yüklenemiyor.
- **Ayrışma noktası belirsiz:** "Herşeyi olan İslami uygulama" kalabalık bir pazar. Asıl güçlü yanlar Diyanet doğruluğu, Türkçe içerik ve sadelik.

**Öneriler:**
- Konumlandırmayı "Türkçe konuşan Müslümanın günlük ibadet arkadaşı: doğru vakit, sade Kur'an, güvenilir içerik" olarak netleştirin.
- Yarım özellikleri ya tamamlayın ya kaldırın. Aile modu, "Premium ve Pro" bölümü ve asistanın "yapay zekâ" adı ilk adaylar.

### 2.2 Kullanıcı araştırması (persona testleri)
**Gözlemler:**
- **Yaşlı kullanıcı:** Ana sayfada 13 eş görünümlü yeşil kutu var ve hiçbiri öne çıkmıyor. "Ne yapmalıyım?" sorusunun cevabı yok.
- **Yeni kullanıcı:** Tanıtım iyi ve kısa. Ama sonunda kullanıcı uygulamanın neler yapabildiğini görmeden ızgaraya düşüyor.
- **Düzenli kullanıcı:** Günlük döngüsü (vakit → namazı işaretle → tesbihat → Kur'an'a devam) dört ayrı ekrana dağılmış.
- **Gurbetçi:** Şehir seçimi artık var; ama hesaplama yöntemi ülkeye göre önerilmiyor (Almanya'da çoğu kişi Diyanet yöntemini kullanır, ISNA'yı değil).

**Öneriler:**
- Ana sayfayı günün akışına göre kurun (bkz. 3.2).
- Şehir seçilince ülkeye göre yöntem önerin. Türkiye ve Avrupa'daki Türk camileri için Diyanet; Suudi Arabistan için Ümmü'l-Kurâ.

### 2.3 Bilgi mimarisi
**Sorunlar:**
- **İbadet sekmesi:** Yalnızca kıbleyi açıyor; adıyla uyumsuz. Kıble ayrıca ana sayfa ızgarasında da var.
- **Öğren sekmesi:** Sekme adı "Öğren", ekran başlığı "Eğitim".
- **Diğer sekmesi:** Doğrudan uzun bir ayarlar sayfası. Ayarlara üç yerden gidiliyor: dişli simgesi, ızgaradaki "Ayarlar" kutusu ve Diğer sekmesi.
- **Saklı özellikler:** Zekât hesaplayıcı ve Yakındaki camiler varsayılan ana sayfada yok; yalnızca "Düzenle" ile ya da asistana sorarak bulunuyor.
- **Tek sayfada toplanan ayarlar:** Dil, mezhep, 12 hesaplama yöntemi, 8 meal, mezhep tercihi, "Premium ve Pro" bağlantıları, test/destek ve hesap aynı ayarlar sayfasında.

**Öneriler:**
- Sekmeleri **Bugün · Kur'an · İbadet · Öğren** olarak yeniden kurun; ayarlar ve profil sağ üstteki profil simgesine taşınsın (bkz. 3.1).
- Ayarları gruplara bölün: Namaz vakitleri · Bildirimler · Kur'an ve okuma · Görünüm · Hesap · Destek.

### 2.4 Görsel tasarım
**İyi olan:** Sakin yeşil-krem palet, tutarlı köşe yuvarlaklığı ve boşluk sistemi. Yeni cami logosu marka ile uyumlu.

**Sorunlar:**
- **Hiyerarşisiz ızgara:** 13 kutunun simge rengi ve arka planı aynı; tanınması kelimeyi okumaya bağlı.
- **Üç kez tekrarlanan bilgi:** "Sıradaki vakit" büyük kartta, vakit şeridinde ve "Ana ekran widget" kartında tekrar ediyor. Ekranın üst yarısı aynı bilgiye gidiyor.
- **Widget kartı:** Uygulamanın içinde "Ana ekran widget" başlıklı kart kafa karıştırıcı; telefonun widget'ı sanılıyor. Kartın içindeki dua satırı Arapça-Türkçe karışık kesiliyor.
- **Arapça tipografi:** Kur'an metni sistem yazı tipiyle gösteriliyor. Mushaf hissi için Kur'an'a özel bir yazı tipi (KFGQPC Uthmanic Hafs, Amiri Quran) gerekir.

**Öneriler:**
- **Kategori renkleri:** Okuma yeşil, ibadet altın, takip mavi, araçlar gri. Simgeler daha büyük, etiketler tek satır.
- **Tek hero:** "Sıradaki vakit" yalnızca bir kez, büyük gösterilsin; widget kartı kaldırılsın ya da "günün duası" kartına dönüşsün.
- **Kur'an yazı tipi:** Kur'an'a özel yazı tipi ve ayet sonu işareti (۝) eklensin.
- **Günün saatine göre hero:** Kart vakte göre renk alsın (imsakta gece mavisi, öğlede açık, akşamda turuncu-mor). Sakin ve hatırlatıcı bir ipucu olur.

### 2.5 Etkileşim tasarımı
**Sorunlar:**
- **Kart ve şerit arasındaki fark:** Yatsıdan sonra büyük kart yarının imsakını (06:04), şerit bugününkünü (06:03) gösteriyor. Kullanıcı farkı hata sanabilir.
- **Saat girişi:** Hatırlatıcı saati serbest metinle ("SS:DD") giriliyor.
- **Aile modu avatarı:** Avatar seçilmeden üye eklenince varsayılan simge 👨 oluyor (ör. "Ayşe").
- **Okuyucu başlığı:** Ekran başlığı sure adı yerine "Sure".
- **Tesbih:** Sayaç dokunuşlarında titreşim var ama sesli ya da sessiz mod seçimi yok. Ekranın kapanmasını engelleme seçeneği de yok; uzun zikirde ekran kararıyor.

**Öneriler:**
- **Yatsıdan sonra yarın:** Yatsıdan sonra şerit "Yarın" başlığıyla yarının vakitlerine geçsin.
- **Saat seçici:** Hatırlatıcıda yerel saat seçici kullanılsın.
- **Okuyucu başlığı:** Başlıkta sure adı ve numarası, ilerledikçe "Ayet 12 / 83" gösterilsin.
- **Tesbih:** "Ekranı açık tut" ve tam ekran sayma modu (ekranın her yerine dokunarak) eklensin.

### 2.6 İçerik ve dini doğruluk
**İyi olan:** Kaynaklar yazılı (Tanzil, Diyanet meali, hadis koleksiyonları). Kişisel fetva uyarısı her yerde var. Vakitler Diyanet ile ±1 dakika uyumlu.

**Sorunlar:**
- **Birleşik ayetler:** Meal tekrarı (ör. Yâsîn 2–3).
- **Hoca incelemesi:** Öğren ve dua metinleri henüz bir alimden geçmedi (`docs/review/`).
- **Asistanın 5 dil iddiası:** İstekleri 5 dilde anlıyor ama içerik yalnızca TR/EN.

**Öneriler:**
- **Hoca incelemesi:** Yayından önce tamamlanıp uygulamada "İçerik: … tarafından incelendi" diye belirtilsin. Güven en büyük ayrışma noktası.
- **Günün içeriği:** Ana sayfaya günün ayeti, hadisi ve duası eklensin; Cuma ve kandil günlerinde özel içerik gösterilsin.

### 2.7 Erişilebilirlik ve yaşlı kullanıcı
**İyi olan:** Bu denetimde form etiketleri, kontrast (AA), dokunma hedefleri ve onay pencereleri düzeltildi.

**Sorunlar:**
- **Yazı boyutu:** Uygulama içinde bir yazı boyutu ayarı yok; sistem büyütmesinde ana sayfa şeridinin taşması cihazda denenmeli.
- **Adsız simge düğmeleri:** Tesbih ve aile ekranlarında bazı yalnız-simge düğmelerin adı yok.

**Öneri:** Ayarlara **"Büyük ve sade görünüm"** ekleyin:
- Ana sayfada yalnızca vakitler ve 4 büyük düğme (Kur'an, Dualar, Tesbih, Kıble).
- %130 yazı boyutu.
- Ezan sesi varsayılan açık.

Türkiye'de kullanıcıların önemli bir kısmı 50 yaş üstü.

### 2.8 Bağlılık ve büyüme
**Sorunlar:**
- **Seri hesabı:** Beş vaktin tamamını istiyor; tek bir vakit kaçınca seri sıfırlanıyor, bu cezalandırıcı hissettirir.
- **Puanlama ve paylaşım:** Mağaza puanlama isteği ve paylaşılabilir içerik (ayet kartı görseli) yok.
- **Misafir kilitleri:** Misafirlere 7 özellik kilitli. Uygulama ücretsiz ve veriler zaten cihazda olduğu için bu kilit kullanıcıyı itiyor.

**Öneriler:**
- **Seri:** "Bugün 3/5" ilerleme halkası kullanılsın; seri yerine haftalık hedef konsun.
- **Misafir:** Yalnızca bulut senkron hesap istesin; diğer her şey misafire açık olsun.
- **Ayet kartı:** Ayet paylaşırken metin yerine görsel kart (marka + ayet + meal) oluşturulsun.
- **Puanlama:** 7. kullanımdan sonra bir kez puanlama istensin.

### 2.9 Platform ve bildirim
**Öneriler:**
- **Android:** Sıradaki vakit için kalıcı bildirim (isteğe bağlı) ve kilit ekranı widget'ı.
- **iOS:** Kilit ekranı widget'ı ve Ramazan'da iftar geri sayımı için Live Activity.
- **Bildirim eylemleri:** Bildirimde "Kıldım" düğmesi olsun; namaz uygulama açılmadan işaretlensin. Günlük döngüyü en çok kısaltacak tek değişiklik budur.

### 2.10 Teknik tasarım
**İyi olan:** Servis katmanı ve veri modeli düzgün. Denetimden sonra senkron, depolama ve vakit hesabı testlerle korunuyor.

**Sorun:** `AppContext` her şeyi taşıyor (ayarlar, konum, vakit, alışkanlık, aile, istatistik, sohbet, senkron, bildirim). Her tesbih dokunuşu tüm ekranları yeniden çiziyor ve yeni özellik eklemek zorlaşıyor.

**Öneri:** Yeniden tasarımla birlikte durumu alanlara bölün (`useSettings`, `usePrayerDay`, `useTracking`, `useReading`). Bir durum kütüphanesi (Zustand gibi) kod tekrarını azaltır.

---

## 3. Büyük öneriler

### 3.1 Yeni bilgi mimarisi (önerilen)

```
Bugün      — vakitler, bugünün ilerlemesi, günün içeriği, devam et, arama
Kur'an     — sureler, cüzler, yer imleri, hatim, dinleme
İbadet     — tesbih, dualar, kaza, alışkanlıklar, zekât, imsakiye, takvim, kıble, yakındaki camiler
Öğren      — konular, hadis koleksiyonları
(profil ⚙) — ayarlar, hesap, aile, tema, bildirimler, destek
```

**Neden:**
- Izgara ve "Düzenle" sistemi dağınıklığı kullanıcıya yüklüyor.
- Görevlere göre gruplanmış dört sekme hem yaşlı hem düzenli kullanıcı için daha öngörülebilir.
- Zekât, camiler ve kıble kendiliğinden doğru yere oturuyor.

### 3.2 "Bugün" ekranı

Yukarıdan aşağı:

1. **Arama çubuğu:** "Sure, dua, konu ara ya da sor…" Mevcut asistanın yerini alır. Asistan zaten cihazda çalışan bir arama ve yönlendirici; "yapay zekâ" adı beklentiyi yanlış kuruyor.
2. **Sıradaki vakit:** Tek büyük kart, günün saatine göre renk, geri sayım; "Ezanı dinle" ve "Kıble" kısayolları.
3. **Bugünün beş vakti:** İşaretlenebilir zaman çizelgesi ve "3/5" ilerleme halkası. Yatsıdan sonra "Yarın" görünümü.
4. **Devam et:** Kur'an'da kalınan yer, açık tesbihat, bugünkü alışkanlıklar.
5. **Günün içeriği:** Ayet, hadis ya da dua; paylaşılabilir kart.
6. **Bağlamsal kart:** Cuma, kandil, Ramazan ya da kaza hatırlatması; yalnızca gerektiğinde görünür.

### 3.3 Ramazan modu
Ramazan'da uygulama kendini yeniden düzenler:
- İftar ve sahur geri sayımı üstte büyük gösterilir.
- İmsakiye tek dokunuşla açılır.
- Oruç takibi ve teravih hatırlatıcısı gelir.
- Kadir Gecesi'ne özel içerik sunulur.

Bu dönem, yıl içinde indirmelerin ve kullanımın zirve yaptığı zamandır.

### 3.4 "İlerlemem" (takip merkezi)
Şu an ayrı ayrı duran parçalar tek ekranda, aynı görsel dille toplanır:
- namaz serisi,
- alışkanlıklar,
- kaza sayacı,
- tesbih istatistikleri,
- hatim.

Haftalık özet verir, cezalandırmaz.

### 3.5 Baştan yazmak gerekir mi?

**Hayır, tamamen baştan yazmayı önermiyorum; "v2 kabuk" yaklaşımını öneriyorum.**

- **Kalacaklar:** Veri ve servis katmanı (vakit hesabı, senkron, depolama, içerik, bildirim bütçesi) bu denetimle sağlamlaştı ve 149 testle korunuyor. Baştan yazmak bu emeği ve test güvencesini çöpe atar.
- **Yeniden yapılacaklar:**
  - gezinme (3.1),
  - Bugün ekranı (3.2),
  - tasarım sistemi (kategori renkleri, Kur'an yazı tipi, hero),
  - `AppContext`'in bölünmesi.
- **Tahmini iş:**
  - Bilgi mimarisi ve Bugün ekranı: 2–3 hafta.
  - Tasarım sistemi ve ekranların taşınması: 2–3 hafta.
  - Ramazan modu ve İlerlemem: 2 hafta.

---

## 4. Önerilen sıra

| Aşama | Süre | İçerik |
|---|---|---|
| **Hemen (test turundan önce)** | 2–3 gün | "Premium ve Pro" etiketini kaldır · Öğren/Eğitim başlığını eşitle · okuyucu başlığında sure adı · yatsıdan sonra şeritte "Yarın" · widget kartını kaldır ya da günün duasına çevir · zekât ve camileri varsayılan ana sayfaya ekle |
| **Kısa vade** | 1–2 hafta | bildirimde "Kıldım" eylemi · misafir kilitlerini kaldır (senkron hariç) · seri yerine "Bugün 3/5" · hatırlatıcıda saat seçici · ülkeye göre yöntem önerisi · tesbihte ekranı açık tut |
| **v2 kabuk** | 4–6 hafta | yeni bilgi mimarisi · Bugün ekranı ve arama · tasarım sistemi ve Kur'an yazı tipi · `AppContext` bölünmesi · büyük ve sade görünüm |
| **Sezonluk** | Ramazan 1448'den (8 Şubat 2027) önce | Ramazan modu · iftar Live Activity / kalıcı bildirim · paylaşılabilir ayet kartları |

Hoca incelemesi ve gerçek cihaz testi bu sıralamadan bağımsız olarak, test turunda yürütülmeli.

## 5. Uygulama durumu (4 Kasım 2026)

**Hemen** ve **Kısa vade** aşamaları `audit/fixes` dalında uygulandı. Web önizlemede denendi, testler eklendi (158 test).

| Öneri | Ne yapıldı |
|---|---|
| "Premium ve Pro" etiketi | Ayarlarda "Diğer özellikler" oldu. |
| Öğren / Eğitim | Konular ekranının başlığı da "Öğren". |
| Okuyucu başlığı | "Sure" yerine "36. Yâsîn" gibi numara ve ad. |
| Yatsıdan sonra | Şeridin altında yarının vakitleri "Yarın" başlığıyla; bugünün vakitleri işaretlenebilir kalır. |
| Widget kartı | "Günün duası" kartı oldu (başlık, Arapça, meal; dokununca dua açılır). Widget'lar ekranı artık yalnızca telefon widget'ının nasıl ekleneceğini anlatır. |
| Zekât ve camiler | Yeni kurulumlarda ana ekranda. Mevcut kullanıcılar "Düzenle"den ekleyebilir. |
| "Kıldım" | Vakit bildiriminde düğme. Android'de uygulama açılmadan çalışır (arka plan görevi, işaret uygulama açılınca hesaba yazılır); iOS'ta uygulamayı açar. |
| Misafir kilitleri | Yalnızca bulut senkron hesap ister; giriş ve misafir metinleri buna göre değişti. |
| Seri yerine 3/5 | Ana sayfada "Bugün n/5" ve beş nokta; İstatistikler'de "Bu hafta kılınan n/35". |
| Saat seçici | Hatırlatıcıda saat/dakika düğmeleri (dakika 5'er), hazır saatler duruyor. |
| Yöntem önerisi | Listeden şehir seçilince ülkenin yaygın yöntemi farklıysa sorulur (Türkiye ve Avrupa'da Diyanet; ABD/Kanada ISNA; İngiltere Hilal Gözlem; Suudi Arabistan Ümmü'l-Kurâ; Mısır; BAE). |
| Tesbihte ekran | Tesbih ekranı açıkken ekran kararmaz. |

**Cihazda denenmesi gerekenler:** "Kıldım" düğmesi (uygulama kapalıyken ve açıkken), tesbihte ekranın kararmaması. Yeni yerel modül eklenmedi (`expo-keep-awake` Expo ile zaten derlemede), bu yüzden OTA güncellemesi yeterli.

**Sıradaki:** v2 kabuk (yeni sekmeler, Bugün ekranı, tasarım sistemi) ve Ramazan modu, test grubunun geri bildiriminden sonra.
