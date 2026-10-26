# İçerik kaynakları ve lisanslar

Uygulamadaki her içeriğin nereden geldiği ve kullanım durumu. Yayından önce ⚠️ işaretli satırların çözülmesi gerekir.

| İçerik | Kaynak | Lisans / durum | Not |
|---|---|---|---|
| Kur'an Arapça metni | [api.alquran.cloud](https://alquran.cloud) (Tanzil metni) | Tanzil: değiştirmeden ve kaynak belirterek kullanılabilir | Uygulamada kaynak satırı gösterilmeli ⚠️ |
| Kur'an mealleri (Diyanet, Elmalılı, Diyanet Vakfı, Ateş, Sahih Intl., Asad, Pickthall, Ahmed Ali) | alquran.cloud üzerinden | ⚠️ Her mealin telifi çevirmen/yayıncıya ait; alquran.cloud yalnızca aracı. Ticari yayın için izin durumu kontrol edilmeli | Özellikle Diyanet ve Asad |
| Kur'an sesi (Mişari Raşid el-Afasi) | cdn.islamic.network | Genelde ücretsiz uygulamalarda kullanılıyor; yazılı lisans yok ⚠️ | |
| Hadis metinleri (Kütüb-i Sitte, Muvatta, Nevevî 40, Kudsî 40) | [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) | ✅ Unlicense (kamu malı) | Bölüm adları kaynakta yalnızca İngilizce |
| Dua Arapça metinleri (69 dua) | Hisnü'l-Müslim ve Kur'an ayetleri | ✅ Klasik metinler kamu malı | Her biri kaynakla karşılaştırıldı (`npm run duas:verify`) |
| Dua Türkçe/İngilizce meal ve okunuşları | Uygulama için yazıldı | ✅ Bize ait | İlahiyatçı kontrolü önerilir |
| Dua sesleri (54 dua) | [Alsarmad/Adhkar-json](https://github.com/Alsarmad/Adhkar-json) (jsDelivr) | ⚠️ Depoda lisans yok | İzin alınmalı ya da sesler değiştirilmeli |
| Dua sesleri (15 Kur'an duası) | cdn.islamic.network (ilgili ayetin sesi) | Kur'an sesi satırı ile aynı | |
| Ezan (tam, uygulama içi) | Wikimedia Commons: [Beautiful adhan.ogg](https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg) | ✅ CC0 | `assets/sounds/adhan_full.m4a` (dönüştürüldü, ses seviyesi dengelendi) |
| Ezan (kısa, bildirim sesi) | Wikimedia Commons: [Adhan.ogg](https://commons.wikimedia.org/wiki/File:Adhan.ogg) | ✅ CC0 | `assets/sounds/adhan_short.wav` (ilk 28 sn) |
| Öğren kütüphanesi metinleri (36 konu) | Uygulama için yazıldı | ✅ Bize ait | ⚠️ Yayından önce ilahiyatçı kontrolü |
| Namaz vakitleri | [adhan](https://github.com/batoulapps/adhan-js) kütüphanesi (MIT) | ✅ | Diyanet yöntemi Diyanet takvimiyle karşılaştırıldı (İstanbul ve Ankara'da en fazla 1 dk fark) |
| Hicri takvim | hijri-converter (Umm al-Qura) | ✅ MIT | Resmî ilanla 1 gün fark olabilir |
| Yakındaki yerler | OpenStreetMap (Overpass, Nominatim) | ✅ ODbL: “© OpenStreetMap katkıcıları” atfı gösteriliyor | Kullanım sınırları: README |

Not: Commons sayfalarındaki CC0 beyanı yükleyenin beyanıdır; kayıttaki müezzinin kimliği belirtilmemiştir.
