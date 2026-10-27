# Test grubuna dağıtım öncesi hazırlık

Bu belge, APK'yı test grubuna göndermeden önce senin yapacaklarını sırayla anlatır. Her bölümün sonunda bir **geçme ölçütü** var; ölçüt sağlanmadan bir sonraki bölüme geçme. Testçilerin dolduracağı liste ayrı: [TEST-PLAN.md](TEST-PLAN.md). Grup kurma ve mesaj şablonu: [../BETA-TEST.md](../BETA-TEST.md).

Tahmini süre: cihazlar elindeyse 2–3 gün (bildirim testleri gece ve sabah namazını beklemeyi gerektirir).

---

## 0. Doğru APK'yı al

1. [Builds](https://expo.dev/accounts/aimelih/projects/islamic/builds) sayfasını aç. En üstteki **Android · preview** derlemesi **Finished** olmalı.
2. Derlemenin **Build number** (sürüm kodu) değerini not et. Uygulamada Diğer sekmesinin en altında `1.0.0 (N)` olarak görünür; geri bildirim ve hata kayıtlarında da aynı değer yazar. Hangi testçinin hangi APK'da olduğunu bu sayıyla takip edeceksin.
3. Daha eski, hatalı (Errored) ya da iptal edilmiş derlemeleri kimseye gönderme.

**Geçme ölçütü:** Finished durumda bir derleme ve numarası elinde.

---

## 1. Supabase'i test trafiğine hazırla

Bunlar sunucu tarafı; testçiler gelmeden bir kez yapılır.

1. **Migration 009** — çalıştırdın ✅. Doğrulamak istersen SQL Editor'de:
   ```sql
   select tgname from pg_trigger where tgname in ('app_feedback_rate', 'app_errors_rate');
   ```
   İki satır dönmeli.
2. **E-posta ile kayıt (en kritik madde).** Supabase'in yerleşik e-posta servisi yalnızca proje ekibindeki adreslere ve saatte çok az sayıda e-posta gönderir. Testçiler "hesap oluştur" deyip onay e-postası bekliyorsa e-posta gelmeyebilir. İki seçenek:
   - **Hızlı yol (test turu için önerilen):** Authentication › Sign In / Providers › Email › **Confirm email** seçeneğini kapat. Testçiler onaysız kayıt olur. Yayından önce geri açılmalı.
   - **Kalıcı yol:** Authentication › Emails › SMTP Settings'ten kendi SMTP'ni bağla (ör. Resend'in ücretsiz planı, alan adı gerektirir).
   - Hiçbirini yapmazsan testçilere "misafir olarak devam edin" de; senkron ve hesap silme test edilemez.
3. **Kendi deneme kayıtlarını temizle.** `app_feedback` ve `app_errors` tablolarında senin denemelerin varsa Table Editor'den sil, böylece test turunun raporu temiz başlar.
4. **Projenin uykuya geçmesi.** Ücretsiz Supabase projeleri bir hafta hiç kullanılmazsa duraklatılır. Test süresince kullanım olacağı için sorun değil; test turu arasında uzun ara verirsen Dashboard'dan **Restore** gerekir.

**Geçme ölçütü:** Bir test telefonundan e-postayla kayıt olunabiliyor (ya da misafir yolu kararlaştırıldı).

---

## 2. Test telefonlarını hazırla

### Hangi telefonlar

Her satırdan en az bir cihaz olması en çok sorunu yakalar:

| Grup | Neden önemli | Örnek |
|---|---|---|
| Samsung (One UI) | Türkiye'de en yaygın; pil yönetimi uygulamaları "uyutur" | Galaxy A serisi |
| Xiaomi / Redmi / POCO (HyperOS, MIUI) | Bildirimleri en sert kısan marka; "Otomatik başlatma" kapalı gelir | Redmi Note |
| Oppo / Realme / OnePlus (ColorOS) | Arka plan kısıtı agresif | Realme C / Oppo A |
| Android 14 veya 15 | "Tam zamanlı alarm" izni yeni kurulumda kapalı gelir | herhangi yeni cihaz |
| Eski Android (9–11), düşük RAM | Performans, eski izin akışları | 3–4 yıllık ucuz cihaz |
| Huawei (Google servisleri yok) | İsteğe bağlı; konum ve bildirim farklı yoldan çalışır | — |

iPhone şimdilik test edilemez (Apple Developer hesabı gerekiyor).

### Her telefonda kurulumdan önce

1. Tarih ve saat **otomatik** olsun, saat dilimi Türkiye.
2. Konum servisleri açık olsun.
3. Telefonu bir Google hesabına bağlamak gerekmez; APK Chrome'dan indirilir.
4. Bir kâğıda ya da tabloya telefonun modelini, Android sürümünü ve kurulan derleme numarasını yaz.

### Pil ayarları: iki ayrı durum test et

Testçilerin çoğu pil ayarlarına dokunmayacak. Bu yüzden **en az bir telefonda hiçbir ayarı değiştirmeden** test et; uygulamanın "kutudan çıktığı gibi" davranışını görmen gerekiyor. Diğer telefonlarda aşağıdaki ayarları yap ve farkı karşılaştır:

- **Samsung:** Ayarlar › Pil › Arka planda kullanım sınırları › **Hiç uyumayan uygulamalar** › Islamic+ ekle.
- **Xiaomi / Redmi / POCO:** Islamic+ simgesine basılı tut › Uygulama bilgisi › **Otomatik başlatma** aç; **Pil tasarrufu › Kısıtlama yok**.
- **Oppo / Realme / OnePlus:** Uygulama bilgisi › Pil kullanımı › **Arka planda çalışmaya izin ver** ve **Otomatik başlatma** aç.
- **Huawei:** Ayarlar › Pil › Uygulama başlatma › Islamic+ › **Manuel yönet**, üç seçeneği de aç.

(Menü adları sürüme göre biraz değişebilir; Ayarlar'da "pil" ve "otomatik başlat" diye arama yapmak en hızlısı.)

**Geçme ölçütü:** Her telefon kayıtlı, en az biri ayarlar değiştirilmeden bırakıldı.

---

## 3. Kendi kabul testin (her telefonda)

Sırayla yap; her adımın yanına ✅ / ❌ ve not yaz. ❌ olan her şeyi bana aynen ilet (telefon modeli + derleme numarası + ne yaptın + ne oldu + ekran görüntüsü).

### 3.1 Kurulum ve ilk açılış
1. APK'yı kur. "Bilinmeyen kaynak" uyarısında Chrome'a izin ver.
2. İlk açılış: dil, mezhep ve hesaplama yöntemi seçimi.
3. Konum iznini **"Uygulamayı kullanırken"** ver. Ana sayfada şehrin doğru mu?
4. Bildirim iznini ver (Android 13+ ayrıca sorar).
5. Diğer › Bildirimler'i aç. "Bildirimler dakikasında gelsin" kartı çıktıysa **İzni aç**'a dokun, açılan ekranda izni ver, geri dön; kart kaybolmalı. (Android 12 altında kart hiç çıkmaz; bu doğru.)

### 3.2 Vakitlerin doğruluğu
1. Ana sayfadaki beş vakti [Diyanet](https://namazvakitleri.diyanet.gov.tr) ile karşılaştır. En fazla 1 dakika fark kabul.
2. Mümkünse farklı bir şehirde bulunan bir testçiden de aynısını iste (uygulama şehri GPS'ten alır; elle şehir seçimi yok).

### 3.3 Bildirimlerin zamanında gelmesi (en önemli bölüm)
1. **Hızlı deneme:** Diğer › Bildirimler › Gelişmiş hatırlatıcılar'dan 5 dakika sonrasına bir hatırlatıcı kur, telefonu kilitle, masada bırak. Dakikasında geldi mi?
2. **Gece denemesi:** Telefonu şarja takmadan, ekran kapalı gece bırak. Sabah ezanı bildirimi (imsak/sabah) kaç dakika gecikmeyle geldi? Her telefon için yaz. Doze modu bu testte devreye girer.
3. **Yeniden başlatma:** Telefonu kapat-aç, uygulamayı **açmadan** bir sonraki vakti bekle. Bildirim geldi mi?
4. **Ezan sesi:** Bir vakit için ses olarak "Ezan"ı seç. O vakitte bildirimle birlikte kısa ezan çalmalı. Telefon sessiz moddaysa ses çalmaz; bu beklenen davranış.
5. **Ayarlar değiştirilmemiş telefonla diğerlerini karşılaştır.** Fark büyükse (ör. 10+ dakika gecikme) uygulama içine marka bazlı bir pil uyarısı eklememiz gerekir; sonucu bana yaz.

### 3.4 Ana ekran widget'ı
1. Ana ekrana uzun bas › Widget'lar › Islamic+ ("Namaz Vakitleri") › küçük ve orta boy widget'ı ekle.
2. Sıradaki vakit doğru mu? Bir vakit geçtikten sonra (uygulamayı açmadan) widget sıradakine geçti mi?
3. Birkaç saat sonra tekrar bak: güncel mi? (Arka plan yenilemesi yaklaşık 30 dakikada bir, telefon izin verdiğinde çalışır.)

### 3.5 İnternetsiz kullanım
1. Uçak modunu aç. Vakitler, kıble, tesbih, kaza, dualar (metin) çalışıyor mu?
2. Daha önce açılmış bir Kur'an suresi açılıyor mu? Hiç açılmamış bir sure için anlaşılır bir hata mesajı çıkıyor mu?
3. Uçak modunu kapat, uygulamayı kapatıp aç. Uçak modundayken oluşan hata kayıtları (varsa) şimdi Supabase'e düşmeli.

### 3.6 Geri bildirim ve hata yolu
1. Diğer › Geri bildirim gönder: bir "Hata" ve bir "Öneri" gönder.
2. Supabase › Table Editor › `app_feedback`: iki satır, doğru derleme numarasıyla (`1.0.0 (N)`) görünmeli.
3. **009'u dene (giriş yapmışken):** Bir dakika içinde 6 geri bildirim gönder. 6.'sı "Gönderilemedi…" uyarısı ve "Başka uygulamayla paylaş" düğmesi vermeli. Bir dakika sonra yine gönderilebilmeli.

### 3.7 Hesap ve senkron (1. bölümdeki e-posta kararına göre)
1. Telefon A'da hesap aç, birkaç namazı işaretle, tesbih çek.
2. Telefon B'de aynı hesapla gir: veriler geldi mi?
3. Diğer › Hesabı sil: hesap ve veriler silindi mi? (Supabase › Authentication › Users'tan kontrol et.)

### 3.8 Güncelleme üstüne kurulum
Bir sonraki derleme çıktığında (ya da şimdi aynı APK'yı tekrar kurarak) eski sürümün üstüne kur. Ayarlar, işaretlenen namazlar ve tesbih sayıları korunmalı. Bu, testçilere yeni sürüm gönderdiğinde veri kaybı olmayacağını doğrular.

### 3.9 Görünüm
1. Telefonu karanlık moda al; tüm sekmeler okunuyor mu?
2. Telefonun yazı boyutunu en büyüğe al; ana sayfa, İmsakiye tablosu ve Kur'an okunuyor mu, taşan yazı var mı?
3. Dili İngilizce'ye çevir, birkaç ekranı gez.

**Geçme ölçütü (dağıtıma hazır):**
- Hiçbir telefonda çökme yok.
- Ayarları değiştirilmiş telefonlarda bildirimler en fazla 1 dakika gecikmeli; değiştirilmemiş telefondaki gecikme not edildi.
- Vakitler Diyanet'le en fazla 1 dakika farklı.
- Geri bildirim Supabase'e doğru derleme numarasıyla ulaşıyor.
- Güncelleme üstüne kurulumda veri kaybolmuyor.

---

## 4. Test grubunu hazırla

1. **Kişiler:** 5–15 kişi. Kendi telefonlarını kullanacaklar; tedarik ettiğin cihazları sen ve yakın çevrendeki 1–2 kişi kullanır. Hiç teknik olmayan, uygulamayı "normal kullanıcı" gibi kullanacak 2–3 kişi mutlaka olsun.
2. **Bilgilendirme ve izin:** Testçilere şunu açıkça söyle: konum yalnızca telefonda kullanılır; hesap açarlarsa e-posta ve uygulama verileri Supabase'de saklanır; gönderdikleri geri bildirim ve hata kayıtlarını sen okursun. İsteyen misafir kullanabilir. (Ayrıntı: [PRIVACY.md](PRIVACY.md).)
3. **Kanal:** Tek bir WhatsApp/Telegram grubu. Grup açıklamasına APK bağlantısını ve TEST-PLAN.md'nin bağlantısını sabitle.
4. **Takip tablosu:** Basit bir tablo tut: kişi · telefon modeli · Android sürümü · kurulu derleme numarası · kurulum tarihi · son geri bildirim.
5. **Mesaj:** BETA-TEST.md'deki "Arkadaşlara gönderilecek mesaj" şablonunu kullan; içinde pil ayarı adımı da var.

---

## 5. Testçilere önceden söylenecek bilinen sınırlamalar

Bunları baştan söylersen hata diye bildirilmezler:

- **Yakındaki camiler** ücretsiz OpenStreetMap verisi kullanıyor: yavaş gelebilir, bazı camiler eksik olabilir. Sonuç yoksa "Harita uygulamasında ara" düğmesi var.
- **Asistan** basit bir yönlendiricidir; sohbet etmez, istenen sayfayı açar.
- **Dua sesleri ve Kur'an sesi** internet ister.
- **Ezan sesi** bildirimde kısa (yaklaşık 28 saniye); tam ezan Bildirimler ekranındaki "Ezanı dinle" ile dinlenir.
- **iPhone** sürümü bu turda yok.
- Ramazan dışında İmsakiye bir sonraki Ramazan'ı gösterir; geri sayım yalnızca Ramazan'da çıkar.

---

## 6. Dağıtım günü

1. Grubu kur, mesajı APK bağlantısıyla gönder.
2. İlk gün yalnızca üç şey iste: kurulum, izinler (bildirim ekranındaki "İzni aç" kartı dahil) ve "yarın sabah namazı bildirimi geldi mi?".
3. Akşam `supabase/queries/test-feedback-report.sql` sorgularını çalıştır; ilk sorunları topla.
4. Sonrası için haftalık plan, tur sonu anketi ve yeni sürüm dağıtımı: BETA-TEST.md › "Kısa yol" bölümü (Aşama 2).

---

## Bana getireceğin şey

Test turu boyunca her 2–3 günde bir şunları ilet; düzeltmeleri önceliğe göre sıralayıp yeni APK çıkarırım:
- `test-feedback-report.sql` sorgularının sonuçları (kopyala-yapıştır yeterli),
- gruptan gelen mesajların özeti,
- bu belgedeki ❌ işaretli maddeler (telefon modeli ve derleme numarasıyla).
