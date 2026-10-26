# Veri güvenliği formları (Google Play Data safety · Apple App Privacy)

Kodun gerçekte topladığı veriye göre hazırlanmıştır (Ekim 2026). Kod değişirse güncelleyin.

## Özet

| Veri | Ne zaman | Nereye | Kullanıcıyla ilişkili mi | Amaç | Zorunlu mu |
|---|---|---|---|---|---|
| Hassas konum | Vakit ve kıble için | Yalnızca cihaz | — | Uygulama işlevi | Hayır (şehir olmadan vakit çıkmaz) |
| Hassas konum | Yakındaki yerler aranınca | OpenStreetMap (Overpass, Nominatim) | Hayır | Uygulama işlevi | Hayır |
| Yaklaşık konum (şehir, koordinat) | Hesap açılınca, senkron için | Supabase (bizim sunucu) | Evet | Uygulama işlevi | Hayır |
| E-posta adresi | Hesap açılınca | Supabase Auth | Evet | Hesap yönetimi | Hayır (misafir mod var) |
| Uygulama içi işlemler (namaz işaretleri, alışkanlık, okuma ilerlemesi, tesbih, kaza, zekât hesapları) | Hesap açılınca | Supabase | Evet | Uygulama işlevi (senkron) | Hayır |
| Uygulama etkileşimi (hangi özelliğin açıldığı) | Hesap açılınca | Supabase | Evet | Analitik | Hayır |
| Diğer kullanıcı içeriği: asistan mesajları | Hesap açılınca | Supabase | Evet | Analitik, uygulama geliştirme | Hayır |
| Diğer kullanıcı içeriği: geri bildirim mesajı | Kullanıcı gönderirse | Supabase | Hesap varsa evet | Uygulama geliştirme | Hayır |
| Çökme kayıtları ve tanılama | Hata olunca, herkes | Supabase | Hesap varsa evet | Uygulama geliştirme | — |
| Cihaz bilgisi (işletim sistemi, sürüm) | Hata ve geri bildirimle | Supabase | Hesap varsa evet | Uygulama geliştirme | — |

## Google Play cevapları

- Veri topluyor musunuz veya paylaşıyor musunuz? **Evet** (toplama). Üçüncü taraflarla **paylaşım yok**: OpenStreetMap'e giden konum, hizmetin kendisini sağlamak için yapılan bir istektir; Google'ın tanımına göre "paylaşım" sayılmaz, yine de beyan etmeniz önerilir.
- Aktarım sırasında şifreleniyor mu? **Evet** (tüm istekler HTTPS).
- Kullanıcı verilerinin silinmesini isteyebilir mi? **Evet**: uygulama içinde Ayarlar › Hesabı sil. Web üzerinden silme talebi için bir bağlantı da istenir: destek e-postası eklendiğinde politikaya yazın.
- Veri türleri: Konum (yaklaşık, hassas), Kişisel bilgiler (e-posta), Uygulama etkinliği (uygulama içi işlemler, diğer kullanıcı içeriği), Uygulama bilgileri ve performans (çökme kayıtları, tanılama), Cihaz kimlikleri: **yok**.

## Apple App Privacy cevapları

- **Data Linked to You:** Contact Info (Email), Location (Coarse — saved city), User Content (Other: assistant and feedback messages), Usage Data (Product Interaction), Diagnostics (Crash Data), Other Data (prayer, reading and tracking records for sync).
- **Data Not Linked to You:** Location (Precise — nearby search sent to OpenStreetMap), Diagnostics (Crash Data from guests).
- **Tracking:** Hayır. Reklam, reklam kimliği (IDFA) veya veri komisyoncusu yok.

## İzinler ve gerekçeleri

| İzin | Gerekçe |
|---|---|
| Konum (uygulama kullanılırken) | Namaz vakitleri, kıble, yakındaki camiler |
| Bildirim | Namaz vakti ve hatırlatıcı bildirimleri |
| Tam zamanlı alarm (Android `SCHEDULE_EXACT_ALARM`) | Namaz bildiriminin dakikasında gelmesi. Play'de "alarm/takvim benzeri" beyanı istenebilir |
| Açılışta yeniden kurma (`RECEIVE_BOOT_COMPLETED`) | Telefon yeniden başlayınca bildirimleri yeniden planlama |
