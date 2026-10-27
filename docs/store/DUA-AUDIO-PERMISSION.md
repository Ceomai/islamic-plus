# Dua sesleri için izin talebi (taslak)

Uygulamadaki 54 dua sesi [Alsarmad/Adhkar-json](https://github.com/Alsarmad/Adhkar-json) deposundan jsDelivr üzerinden çalınıyor. Depoda lisans dosyası yok; bu yüzden mağaza öncesi izin istenmeli. Aşağıdaki metni depoda bir **Issue** olarak açabilir ya da sahibine iletebilirsin.

---

**Title:** Permission to use the adhkar audio files in a free app

Hello, and thank you for this dataset.

I'm building **Islamic+**, a free, ad-free Muslim companion app (prayer times, Quran, duas). The app plays 54 of the audio recordings from this repository through jsDelivr, and credits the repository in its content sources.

The repository has no licence file, so I'd like to ask: may we use the audio files in the app (free on the App Store and Google Play)? If you prefer a specific licence or attribution text, please let me know and I'll add it.

If it's easier for you, you could also add a LICENSE file (for example CC BY 4.0).

Thank you!

---

**Olumlu cevap gelmezse:** Sesler kaldırılabilir (dualar sessiz kalır, metinler değişmez) ya da kendi kaydımızla değiştirilebilir. Kaldırmak tek satır: `src/data/duas.ts` içinde `ADHKAR_AUDIO_ENABLED = false` (Kur’an duaları sesli kalır).
