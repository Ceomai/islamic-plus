import type { AppLanguage } from '../types';

export interface AppKnowledgeEntry {
  id: string;
  keywords: string[];
  routeHint?: string;
  en: string;
  tr: string;
}

/** In-app guide: every major feature and how to reach it */
export const APP_KNOWLEDGE: AppKnowledgeEntry[] = [
  {
    id: 'home_launcher',
    keywords: ['home', 'launcher', 'ana ekran', 'customize', 'edit', 'düzenle', 'icon', 'widget modül'],
    routeHint: 'Home → Edit',
    en: 'On Home, tap **Edit** to add, remove, and reorder features like an iPhone home screen. Prayer times and the home widget are optional modules. Settings also has “Customize home screen”.',
    tr: 'Ana sayfada **Düzenle** ile özellikleri iPhone gibi ekleyip kaldırabilir ve sıralayabilirsiniz. Namaz vakitleri ve widget modül olarak eklenir. Ayarlar’da da “Ana ekranı özelleştir” var.',
  },
  {
    id: 'prayer_times',
    keywords: ['prayer', 'namaz', 'vakit', 'fajr', 'imsak', 'dhuhr', 'öğle', 'asr', 'maghrib', 'isha', 'adhan', 'calculation'],
    routeHint: 'Home → Prayer module / Settings',
    en: 'Prayer times use your GPS location and the `adhan` library. Change calculation method and madhab (Hanafi/Shafi Asr) in **Settings**. Add the prayer-times module on Home if removed.',
    tr: 'Namaz vakitleri konumunuza ve `adhan` kütüphanesine göredir. **Ayarlar**’dan hesaplama yöntemi ve mezhep (Hanefi/Şafii ikindi) değiştirilir. Ana ekrandan namaz modülünü ekleyebilirsiniz.',
  },
  {
    id: 'notifications',
    keywords: ['notification', 'bildirim', 'reminder', 'hatırlat', 'adhan sound', 'alarm'],
    routeHint: 'More → Notifications / Advanced Reminders',
    en: '**Notifications**: per-prayer on/off, sounds, and weekday mute chips. **Advanced Reminders**: custom dhikr, dua, or Quran times by weekday. Full alerts need a real app build (not Expo Go on Android).',
    tr: '**Bildirimler**: namaz bazlı aç/kapa, ses ve haftanın günlerine göre kapatma. **Gelişmiş hatırlatıcılar**: özel zikir, dua, Kur’an saati. Tam bildirim için gerçek uygulama derlemesi gerekir (Android Expo Go’da sınırlı).',
  },
  {
    id: 'quran',
    keywords: ['quran', 'kur\'an', 'kuran', 'surah', 'sure', 'ayah', 'ayet', 'bookmark', 'yer imi', 'read'],
    routeHint: 'Learn → Quran',
    en: '**Quran**: pick a surah, read with your chosen translation in Settings. Tap the bookmark icon on an ayah. **Continue reading** appears on Home. Progress is saved per family profile.',
    tr: '**Kur’an**: sure seçin; meal Ayarlar’daki Kur’an dilinden gelir. Ayette yer imi ikonuna dokunun. Ana sayfada **okumaya devam** görünür. İlerleme aile profiline göre kaydedilir.',
  },
  {
    id: 'hadith',
    keywords: ['hadith', 'hadis', 'bukhari', 'muslim', 'sunnah'],
    routeHint: 'Learn → Hadith',
    en: '**Hadith**: collections filtered by sect in Settings. Tap a hadith to save progress; use **Bookmark**. Sample texts are offline; connect a full API later for complete libraries.',
    tr: '**Hadis**: Ayarlar’daki mezhep tercihine göre koleksiyonlar. Hadise dokunarak ilerleme kaydedilir; **yer imi** kullanın. Şu an örnek metinler çevrimdışıdır.',
  },
  {
    id: 'duas',
    keywords: ['dua', 'dualar', 'adhkar', 'zikir', 'audio', 'ses', 'listen', 'dinle'],
    routeHint: 'Worship → Duas',
    en: '**Duas & Adhkar**: each dua has its own recitation audio (Hisnul Muslim). Tap **Listen** on the detail screen; enable offline audio in Settings to download MP3s.',
    tr: '**Dualar**: her duanın ayrı ses kaydı vardır (Hissn-ül Müslim). Detayda **Dinle**; çevrimdışı için Ayarlar’da ses indirmeyi açın.',
  },
  {
    id: 'qibla',
    keywords: ['qibla', 'kıble', 'compass', 'pusula', 'kaaba', 'kabe'],
    routeHint: 'Worship → Qibla',
    en: '**Qibla**: enable location, hold the phone flat, rotate until the gold needle points up toward the Kaaba.',
    tr: '**Kıble**: konumu açın, telefonu düz tutun, altın ibre üst yöne gelene kadar çevirin.',
  },
  {
    id: 'tasbih',
    keywords: ['tasbih', 'tesbih', 'dhikr', 'zikir', 'counter', 'sayaç'],
    routeHint: 'Worship → Tasbih',
    en: '**Tasbih**: tap the circle to count; choose 33/99/100 targets. Counts are stored per active family profile.',
    tr: '**Tesbih**: daireye dokunarak sayın; 33/99/100 hedef seçin. Sayım aktif aile profiline kaydedilir.',
  },
  {
    id: 'places',
    keywords: ['mosque', 'cami', 'mescit', 'halal', 'helal', 'restaurant', 'nearby', 'yakın'],
    routeHint: 'More → Nearby / Home icons',
    en: '**Nearby**: mosques, prayer rooms, and halal restaurants via OpenStreetMap. Refresh location if empty.',
    tr: '**Yakınımda**: cami, mescit ve helal restoranlar (OpenStreetMap). Boşsa konumu yenileyin.',
  },
  {
    id: 'calendar',
    keywords: ['calendar', 'takvim', 'hijri', 'hicri', 'ramadan', 'ramazan', 'event'],
    routeHint: 'More → Islamic Calendar',
    en: '**Islamic Calendar**: today’s Hijri date and upcoming events. Gregorian date shown for reference.',
    tr: '**İslami takvim**: Hicri tarih ve yaklaşan günler. Miladi tarih referans olarak gösterilir.',
  },
  {
    id: 'education',
    keywords: ['education', 'eğitim', 'learn', 'öğren', 'topic', 'sect', 'mezhep'],
    routeHint: 'Learn → Education',
    en: '**Education**: multi-perspective Islamic topics. Filtered by sect preference in Settings. For personal fatwa, ask a qualified scholar.',
    tr: '**Eğitim**: çok yönlü konular. Mezhep tercihi Ayarlar’dan. Kişisel hüküm için ehil alime danışın.',
  },
  {
    id: 'habits',
    keywords: ['habit', 'alışkanlık', 'goal', 'hedef', 'streak', 'seri'],
    routeHint: 'More → Spiritual Habits',
    en: '**Spiritual Habits**: add goals and check them off daily. Data is per family profile when Family Mode is on.',
    tr: '**Manevi alışkanlıklar**: hedef ekleyin, günlük işaretleyin. Aile modunda profil başına kayıt.',
  },
  {
    id: 'zakat',
    keywords: ['zakat', 'zekat', 'sadaqa', 'sadaka', 'charity', 'nisab', 'calculator', 'hesap'],
    routeHint: 'More → Zakat & Sadaqa',
    en: '**Zakat & Sadaqa**: wealth-based Zakat estimate and monthly sadaqa planner. Consult a scholar for your situation.',
    tr: '**Zekât ve sadaka**: zekât tahmini ve aylık sadaka planlayıcı. Durumunuza göre alime danışın.',
  },
  {
    id: 'ai',
    keywords: ['ai', 'assistant', 'asistan', 'yz', 'help', 'yardım', 'how to', 'nasıl'],
    routeHint: 'Home → AI Assistant',
    en: 'You are chatting with the in-app **AI Assistant**. Ask how to use any feature or general Islamic topics. I guide you to the right screen — not personal fatwa.',
    tr: 'Uygulama içi **YZ asistanı** ile konuşuyorsunuz. Her özelliğin kullanımını veya genel İslami konuları sorabilirsiniz. Doğru ekrana yönlendiririm — kişisel fetva değilim.',
  },
  {
    id: 'family',
    keywords: ['family', 'aile', 'profile', 'profil', 'child', 'çocuk'],
    routeHint: 'Settings → Family Mode',
    en: '**Family Mode**: separate habits, tasbih, and reading progress per member. Switch active profile in Family Mode screen.',
    tr: '**Aile modu**: her üye için ayrı alışkanlık, tesbih ve okuma verisi. Aile modu ekranından aktif profili değiştirin.',
  },
  {
    id: 'statistics',
    keywords: ['statistics', 'istatistik', 'stats', 'activity', 'analytics'],
    routeHint: 'Home → Statistics',
    en: '**Statistics**: prayer streaks, weekly activity ring, habit score, and dua/Quran session counts per profile.',
    tr: '**İstatistikler**: namaz serisi, haftalık aktivite, alışkanlık puanı; profil bazlı dua/Kur’an oturumları.',
  },
  {
    id: 'themes',
    keywords: ['theme', 'tema', 'dark', 'karanlık', 'color'],
    routeHint: 'Settings → Themes',
    en: '**Themes**: five color palettes plus system dark mode toggle in Settings.',
    tr: '**Temalar**: beş renk paleti; karanlık mod Ayarlar’da.',
  },
  {
    id: 'widgets',
    keywords: ['widget', 'home widget', 'ana ekran widget'],
    routeHint: 'Settings → Widgets / Home module',
    en: '**Widgets**: configure next prayer, Hijri date, and daily dua on the home widget module. Add `Widget` from Home → Edit.',
    tr: '**Widget**: sıradaki namaz, Hicri tarih, günlük dua. Ana ekrandan Düzenle ile widget modülünü ekleyin.',
  },
  {
    id: 'cloud_sync',
    keywords: ['cloud', 'sync', 'bulut', 'senkron', 'backup', 'yedek'],
    routeHint: 'Settings → Cloud Sync',
    en: '**Cloud Sync**: export/import JSON backup of settings and habits (device-level demo sync). Sign in required for guests.',
    tr: '**Bulut senkron**: ayar ve alışkanlık yedeği dışa/içe aktarma. Misafir modunda kilitli olabilir.',
  },
  {
    id: 'auth',
    keywords: ['sign in', 'login', 'register', 'giriş', 'kayıt', 'guest', 'misafir', 'account', 'hesap'],
    routeHint: 'App launch / Settings',
    en: '**Account**: register or sign in with email. Data uses pseudonym + hashed email in Supabase when configured. **Guest** skips login but locks premium features (AI, cloud, family, stats, themes, widgets, advanced reminders) — see developer config `featureAccess.ts`.',
    tr: '**Hesap**: e-posta ile kayıt/giriş. Supabase açıksa takma ad + e-posta hash saklanır. **Misafir** girişsiz devam eder; premium özellikler kilitli (YZ, bulut, aile, istatistik, tema, widget, gelişmiş hatırlatıcı) — `featureAccess.ts`.',
  },
  {
    id: 'settings',
    keywords: ['settings', 'ayar', 'language', 'dil', 'madhab', 'mezhep', 'method', 'yöntem'],
    routeHint: 'More → Settings',
    en: '**Settings**: app language, Quran translation edition, madhab, calculation method, sect filter for hadith/education, dark mode, offline dua audio.',
    tr: '**Ayarlar**: uygulama dili, Kur’an meali, mezhep, hesaplama yöntemi, hadis/eğitim mezhep filtresi, karanlık mod, çevrimdışı dua sesi.',
  },
  {
    id: 'fajr',
    keywords: ['fajr', 'imsak', 'morning prayer'],
    en: 'Fajr is the dawn prayer before sunrise (typically 2 rakahs Sunnah). Enable its notification under Notifications.',
    tr: 'İmsak, güneş doğmadan önce kılınan sabah namazıdır. Bildirimlerden açabilirsiniz.',
  },
  {
    id: 'zakat_islam',
    keywords: ['zakat', 'zekat', 'nisab', '2.5'],
    en: 'Zakat is 2.5% of qualifying wealth above nisab after one lunar year. Use the in-app calculator; consult a scholar for your case.',
    tr: 'Zekât, nisab üzerinde bir yıl bekleyen malın %2,5\'idir. Uygulama hesaplayıcısını kullanın; alime danışın.',
  },
  {
    id: 'ramadan',
    keywords: ['ramadan', 'ramazan', 'fast', 'oruç', 'iftar', 'suhoor', 'sahur'],
    en: 'Ramadan fasting is from Fajr to Maghrib. Use prayer times for Suhoor and Iftar; follow local moon sighting.',
    tr: 'Ramazan orucu imsaktan akşama. Sahur ve iftar için namaz vakitlerini kullanın; yerel hilale uyun.',
  },
];

export const ISLAMIC_KNOWLEDGE: AppKnowledgeEntry[] = [
  {
    id: 'pillars',
    keywords: ['pillar', 'şart', 'islam', 'five'],
    en: 'The five pillars of Islam: Shahada, Salah, Zakat, Sawm (Ramadan), and Hajj for those able.',
    tr: 'İslam\'ın beş şartı: kelime-i şehadet, namaz, zekât, ramazan orucu ve gücü yeten için hac.',
  },
  {
    id: 'hadith_general',
    keywords: ['hadith', 'hadis', 'sunnah', 'sünnet'],
    en: 'Hadith are reports about the Prophet ﷺ. Use the Hadith section for study; verify with scholars for rulings.',
    tr: 'Hadisler Peygamber Efendimiz ﷺ hakkındaki rivayetlerdir. İnceleme için Hadis bölümünü kullanın; hüküm için alime danışın.',
  },
];

export function getKnowledgeCatalog(lang: AppLanguage): string {
  const lines = APP_KNOWLEDGE.map((e) => `• ${lang === 'tr' ? e.tr.split('.')[0] : e.en.split('.')[0]}`);
  return lang === 'tr'
    ? `Uygulama konuları:\n${lines.join('\n')}`
    : `App topics I can guide:\n${lines.join('\n')}`;
}
