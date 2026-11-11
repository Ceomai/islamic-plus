import type { PrayerName } from '../../types';
import type { Feature, Text, Words } from './types';

/**
 * Word lists the assistant matches against, per chat language. Keywords are written folded
 * (lowercase, no accents or Arabic vowel marks), the way normalize.ts folds the question.
 */

export const OPEN_VERBS: Words = {
  tr: ['ac', 'acar', 'acarmisin', 'acin', 'acsana', 'goster', 'gotur', 'git', 'gec', 'getir', 'baslat', 'oku', 'okut', 'dinlet', 'gitmek'],
  en: ['open', 'show', 'take', 'go', 'navigate', 'bring', 'start', 'launch', 'read', 'play'],
  ar: ['افتح', 'اظهر', 'اعرض', 'اذهب', 'خذني', 'انقلني', 'اقرا', 'شغل'],
  de: ['offne', 'oeffne', 'zeig', 'zeige', 'gehe', 'geh', 'bring', 'starte', 'lies', 'spiele'],
  fr: ['ouvre', 'ouvrir', 'montre', 'montrer', 'va', 'aller', 'emmene', 'amene', 'lance', 'lis', 'lire', 'joue'],
};

export const EXPLAIN_WORDS: Words = {
  tr: ['acikla', 'anlat', 'nedir', 'ne demek', 'anlami', 'nasil', 'neler', 'hakkinda', 'bilgi'],
  en: ['explain', 'what is', 'what are', 'meaning', 'tell me', 'how', 'about'],
  ar: ['اشرح', 'ما هو', 'ما هي', 'معنى', 'كيف', 'عن'],
  de: ['erklare', 'erklaer', 'was ist', 'was sind', 'bedeutung', 'wie', 'uber'],
  fr: ['explique', 'qu est ce', 'quest ce', 'signification', 'comment', 'sur'],
};

export const DUA_WORDS: Words = {
  tr: ['dua', 'zikir', 'virt'],
  en: ['dua', 'duas', 'supplication', 'dhikr', 'what to say', 'prayer for', 'prayer before', 'prayer after', 'prayer when'],
  ar: ['دعاء', 'ادعيه', 'ذكر', 'اذكار'],
  de: ['bittgebet', 'dua', 'gebet fur', 'gebet vor', 'gebet nach', 'dhikr'],
  fr: ['invocation', 'doua', 'dua', 'dhikr', 'priere pour', 'priere avant', 'priere apres'],
};

export const SURAH_WORDS: Words = {
  tr: ['sure', 'suresi', 'suresini'],
  en: ['surah', 'sura', 'surat'],
  ar: ['سوره'],
  de: ['sure', 'sura'],
  fr: ['sourate'],
};

export const AYAT_KURSI = ['ayetel kursi', 'ayet el kursi', 'ayetul kursi', 'ayat al kursi', 'ayatul kursi', 'ayat ul kursi', 'آيه الكرسي', 'ايه الكرسي'];

/** Aliases that collide with the words for "surah" itself */
export const BLOCKED_ALIASES = new Set(['sura', 'sure', 'surat']);

/** Short names that are also everyday words or prophet names: only count with "sure/surah". */
export const SURAH_NEEDS_KEYWORD = new Set(
  ['ibrahim', 'muhammed', 'muhammad', 'meryem', 'maryam', 'yusuf', 'yunus', 'nuh', 'hud', 'rahman', 'insan', 'mumin', 'nisa', 'kalem', 'tevbe', 'nahl', 'neml', 'secde', 'talak', 'tahrim', 'cin', 'asr', 'nur', 'hac', 'hajj', 'kadr', 'qadr', 'fil', 'leyl', 'sems', 'duha', 'tin', 'nasr', 'alak', 'mulk', 'fecr', 'fajr', 'saf', 'sad', 'kaf', 'qaf', 'cuma', 'hicr', 'beled', 'tur', 'necm', 'kamer', 'hadid', 'rum', 'fetih', 'fath', 'cum a', 'luqman', 'lokman', 'enfal', 'ahzab', 'maide', 'nas', 'kureys', 'quraysh', 'zilzal', 'kevser', 'saba', 'sebe', 'hasr', 'hashr', 'jinn', 'tawbah', 'sajdah', 'jumuah', 'talaq', 'qiyamah', 'shams', 'najm', 'qalam', 'taha', 'isra']
);

export const FEATURES: Feature[] = [
  {
    id: 'prayerTimes',
    target: { screen: 'Home' },
    icon: 'time-outline',
    name: { tr: 'Namaz vakitleri', en: 'Prayer times', ar: 'مواقيت الصلاة', de: 'Gebetszeiten', fr: 'Horaires de prière' },
    keywords: {
      tr: ['namaz vakti', 'namaz vakitleri', 'vakitler', 'ezan vakti', 'imsak', 'iftar saati', 'iftar ne zaman', 'iftara', 'sahur', 'siradaki namaz', 'ogle namazi ne zaman', 'yatsi ne zaman', 'aksam ezani'],
      en: ['prayer time', 'prayer times', 'next prayer', 'iftar time', 'when is iftar', 'suhoor', 'when is maghrib', 'when is fajr'],
      ar: ['مواقيت الصلاه', 'وقت الصلاه', 'الصلاه القادمه', 'موعد الافطار', 'السحور'],
      de: ['gebetszeit', 'gebetszeiten', 'nachste gebet', 'nachstes gebet', 'iftar zeit'],
      fr: ['heure de priere', 'horaires de priere', 'prochaine priere', 'heure de l iftar'],
    },
    knowledgeId: 'prayer_times',
  },
  {
    id: 'quran',
    target: { screen: 'Quran' },
    icon: 'book-outline',
    name: { tr: "Kur'an", en: 'Quran', ar: 'القرآن', de: 'Koran', fr: 'Coran' },
    keywords: { tr: ['kuran', 'kur an', 'mushaf', 'meal', 'hatim'], en: ['quran', 'koran', 'mushaf'], ar: ['قران', 'مصحف'], de: ['koran'], fr: ['coran'] },
    knowledgeId: 'quran',
  },
  {
    id: 'hadith',
    target: { screen: 'Hadith' },
    icon: 'library-outline',
    name: { tr: 'Hadis', en: 'Hadith', ar: 'الحديث', de: 'Hadith', fr: 'Hadith' },
    keywords: { tr: ['hadis'], en: ['hadith', 'hadees'], ar: ['حديث', 'احاديث'], de: ['hadith'], fr: ['hadith'] },
    knowledgeId: 'hadith',
  },
  {
    id: 'duas',
    target: { screen: 'Duas' },
    icon: 'hand-left-outline',
    name: { tr: 'Dualar ve zikirler', en: 'Duas & dhikr', ar: 'الأدعية والأذكار', de: 'Bittgebete', fr: 'Invocations' },
    keywords: { tr: ['dualar', 'zikirler', 'dua listesi'], en: ['duas', 'dua list', 'adhkar'], ar: ['ادعيه', 'اذكار'], de: ['bittgebete'], fr: ['invocations'] },
    knowledgeId: 'duas',
  },
  {
    id: 'qibla',
    target: { screen: 'Qibla' },
    icon: 'compass-outline',
    name: { tr: 'Kıble', en: 'Qibla', ar: 'القبلة', de: 'Qibla', fr: 'Qibla' },
    keywords: {
      tr: ['kible', 'pusula', 'kabe yonu'],
      en: ['qibla', 'qiblah', 'kibla', 'compass', 'kaaba direction'],
      ar: ['قبله', 'اتجاه الكعبه', 'بوصله'],
      de: ['qibla', 'kibla', 'gebetsrichtung', 'kompass'],
      fr: ['qibla', 'direction de la mecque', 'boussole'],
    },
    knowledgeId: 'qibla',
  },
  {
    id: 'tasbih',
    target: { screen: 'Tasbih' },
    icon: 'ellipse-outline',
    name: { tr: 'Tesbih', en: 'Tasbih', ar: 'المسبحة', de: 'Tasbih', fr: 'Tasbih' },
    keywords: {
      tr: ['tesbih', 'tespih', 'zikirmatik', 'zikir say', 'zikir cek', 'tesbihat'],
      en: ['tasbih', 'tasbeeh', 'dhikr counter', 'prayer beads', 'counter'],
      ar: ['تسبيح', 'سبحه', 'مسبحه'],
      de: ['tasbih', 'gebetskette', 'zahler'],
      fr: ['tasbih', 'chapelet', 'compteur'],
    },
    knowledgeId: 'tasbih',
  },
  {
    id: 'tasbihStats',
    target: { screen: 'TasbihStats' },
    icon: 'bar-chart-outline',
    name: { tr: 'Zikir istatistikleri', en: 'Dhikr statistics', ar: 'إحصائيات الذكر', de: 'Dhikr-Statistik', fr: 'Statistiques de dhikr' },
    keywords: {
      tr: ['zikir istatistik', 'tesbih istatistik', 'kac zikir', 'ne kadar zikir'],
      en: ['dhikr stats', 'dhikr statistics', 'tasbih stats', 'tasbih statistics', 'how much dhikr'],
      ar: ['احصائيات التسبيح', 'احصائيات الذكر'],
      de: ['tasbih statistik', 'dhikr statistik'],
      fr: ['statistiques tasbih', 'statistiques dhikr'],
    },
  },
  {
    id: 'imsakiye',
    target: { screen: 'Imsakiye' },
    icon: 'moon-outline',
    name: { tr: 'İmsakiye', en: 'Ramadan timetable', ar: 'إمساكية رمضان', de: 'Ramadan-Kalender', fr: 'Calendrier du Ramadan' },
    keywords: {
      tr: ['imsakiye', 'ramazan takvimi', 'iftar vakitleri', 'iftara ne kadar', 'iftara kac', 'sahura ne kadar', 'sahur vakitleri'],
      en: ['imsakiye', 'ramadan timetable', 'ramadan calendar', 'iftar times', 'time until iftar', 'suhoor times'],
      ar: ['امساكيه', 'جدول رمضان', 'مواعيد الافطار'],
      de: ['ramadan kalender', 'iftar zeiten', 'ramadan zeiten'],
      fr: ['calendrier du ramadan', 'horaires iftar', 'horaires du ramadan'],
    },
  },
  {
    id: 'kaza',
    target: { screen: 'Kaza' },
    icon: 'checkmark-done-circle-outline',
    name: { tr: 'Kaza namazı takibi', en: 'Missed prayers (qada)', ar: 'قضاء الصلوات', de: 'Nachholgebete', fr: 'Prières à rattraper' },
    keywords: {
      tr: ['kaza namaz', 'kaza takibi', 'kaza borcu', 'kazalarim', 'kilamadigim namaz'],
      en: ['qada', 'missed prayers', 'make up prayers', 'make-up prayers'],
      ar: ['قضاء الصلاه', 'الصلوات الفائته', 'قضاء'],
      de: ['nachholgebet', 'verpasste gebete'],
      fr: ['prieres manquees', 'rattrapage', 'prieres a rattraper'],
    },
  },
  {
    id: 'calendar',
    target: { screen: 'Calendar' },
    icon: 'calendar-outline',
    name: { tr: 'İslami takvim', en: 'Islamic calendar', ar: 'التقويم الهجري', de: 'Islamischer Kalender', fr: 'Calendrier islamique' },
    keywords: {
      tr: ['takvim', 'kandil', 'bayram ne zaman', 'hicri', 'ramazan ne zaman', 'mubarek gun'],
      en: ['calendar', 'hijri', 'when is eid', 'when is ramadan', 'holy days'],
      ar: ['تقويم', 'هجري', 'متى العيد', 'متى رمضان'],
      de: ['kalender', 'hidschri', 'wann ist ramadan', 'feiertage'],
      fr: ['calendrier', 'hegire', 'quand est l aid', 'quand est le ramadan'],
    },
    knowledgeId: 'calendar',
  },
  {
    id: 'education',
    target: { screen: 'Education' },
    icon: 'school-outline',
    name: { tr: 'Öğren', en: 'Learn', ar: 'تعلّم', de: 'Lernen', fr: 'Apprendre' },
    keywords: { tr: ['ogren', 'egitim', 'ilmihal', 'konular'], en: ['learn', 'education', 'lessons', 'topics'], ar: ['تعلم', 'دروس'], de: ['lernen', 'themen'], fr: ['apprendre', 'cours', 'sujets'] },
    knowledgeId: 'education',
  },
  {
    id: 'habits',
    target: { screen: 'Habits' },
    icon: 'checkmark-done-outline',
    name: { tr: 'Manevi alışkanlıklar', en: 'Habits', ar: 'العادات', de: 'Gewohnheiten', fr: 'Habitudes' },
    keywords: { tr: ['aliskanlik'], en: ['habit'], ar: ['عادات', 'عاده'], de: ['gewohnheit'], fr: ['habitude'] },
    knowledgeId: 'habits',
  },
  {
    id: 'zakat',
    target: { screen: 'Duties' },
    icon: 'calculator-outline',
    name: { tr: 'Zekât hesaplayıcı', en: 'Zakat calculator', ar: 'حاسبة الزكاة', de: 'Zakat-Rechner', fr: 'Calcul de la zakat' },
    keywords: {
      tr: ['zekat hesapla', 'zekat hesap', 'zekatimi', 'ne kadar zekat', 'sadaka hesapla'],
      en: ['calculate zakat', 'zakat calculator', 'how much zakat'],
      ar: ['حساب الزكاه', 'حاسبه الزكاه', 'كم الزكاه'],
      de: ['zakat berechnen', 'zakat rechner'],
      fr: ['calculer la zakat', 'calcul zakat'],
    },
    knowledgeId: 'zakat',
  },
  {
    id: 'mosque',
    target: { screen: 'Places', params: { type: 'mosque' } },
    icon: 'location-outline',
    name: { tr: 'Yakındaki camiler', en: 'Nearby mosques', ar: 'المساجد القريبة', de: 'Moscheen in der Nähe', fr: 'Mosquées à proximité' },
    keywords: {
      tr: ['cami', 'en yakin cami', 'yakindaki cami', 'camiler'],
      en: ['mosque', 'masjid', 'nearest mosque'],
      ar: ['مسجد', 'جامع', 'اقرب مسجد'],
      de: ['moschee'],
      fr: ['mosquee'],
    },
    knowledgeId: 'places',
  },
  {
    id: 'prayerRoom',
    target: { screen: 'Places', params: { type: 'prayer_room' } },
    icon: 'location-outline',
    name: { tr: 'Mescitler', en: 'Prayer rooms', ar: 'المصليات', de: 'Gebetsräume', fr: 'Salles de prière' },
    keywords: { tr: ['mescit', 'namazgah', 'ibadet odasi'], en: ['prayer room', 'musalla'], ar: ['مصلى'], de: ['gebetsraum'], fr: ['salle de priere'] },
  },
  {
    id: 'halal',
    target: { screen: 'Places', params: { type: 'halal_restaurant' } },
    icon: 'restaurant-outline',
    name: { tr: 'Helal restoranlar', en: 'Halal restaurants', ar: 'المطاعم الحلال', de: 'Halal-Restaurants', fr: 'Restaurants halal' },
    keywords: { tr: ['restoran', 'lokanta'], en: ['restaurant'], ar: ['مطعم'], de: ['restaurant'], fr: ['restaurant'] },
  },
  {
    id: 'notifications',
    target: { screen: 'NotificationSettings' },
    icon: 'notifications-outline',
    name: { tr: 'Bildirimler', en: 'Notifications', ar: 'الإشعارات', de: 'Benachrichtigungen', fr: 'Notifications' },
    keywords: { tr: ['bildirim', 'ezan sesi', 'alarm'], en: ['notification', 'alert', 'alarm', 'adhan sound'], ar: ['اشعار', 'تنبيه'], de: ['benachrichtigung', 'alarm'], fr: ['notification', 'alarme'] },
    knowledgeId: 'notifications',
  },
  {
    id: 'reminders',
    target: { screen: 'AdvancedReminders' },
    icon: 'alarm-outline',
    name: { tr: 'Hatırlatıcılar', en: 'Reminders', ar: 'التذكيرات', de: 'Erinnerungen', fr: 'Rappels' },
    keywords: { tr: ['hatirlatici', 'hatirlat'], en: ['reminder', 'remind'], ar: ['تذكير'], de: ['erinnerung', 'erinnere'], fr: ['rappel'] },
  },
  {
    id: 'statistics',
    target: { screen: 'Statistics' },
    icon: 'stats-chart-outline',
    name: { tr: 'İstatistikler', en: 'Statistics', ar: 'الإحصائيات', de: 'Statistik', fr: 'Statistiques' },
    keywords: { tr: ['istatistik', 'serim'], en: ['statistics', 'stats', 'streak'], ar: ['احصائيات'], de: ['statistik'], fr: ['statistiques'] },
    knowledgeId: 'statistics',
  },
  {
    id: 'settings',
    target: { screen: 'Settings' },
    icon: 'settings-outline',
    name: { tr: 'Ayarlar', en: 'Settings', ar: 'الإعدادات', de: 'Einstellungen', fr: 'Paramètres' },
    keywords: { tr: ['ayar', 'hesaplama yontemi', 'mezhep ayari', 'dil degistir'], en: ['settings', 'preferences', 'change language'], ar: ['اعدادات', 'تغيير اللغه'], de: ['einstellungen', 'sprache andern'], fr: ['parametres', 'reglages', 'changer la langue'] },
  },
  {
    id: 'themes',
    target: { screen: 'Themes' },
    icon: 'color-palette-outline',
    name: { tr: 'Temalar', en: 'Themes', ar: 'السمات', de: 'Designs', fr: 'Thèmes' },
    keywords: { tr: ['tema', 'karanlik mod', 'gece modu', 'renk'], en: ['theme', 'dark mode', 'colour', 'color'], ar: ['سمه', 'الوضع الليلي', 'الوان'], de: ['design', 'dunkelmodus', 'farbe'], fr: ['theme', 'mode sombre', 'couleur'] },
    knowledgeId: 'themes',
  },
  {
    id: 'widgets',
    target: { screen: 'Widgets' },
    icon: 'apps-outline',
    name: { tr: "Widget'lar", en: 'Widgets', ar: 'الأدوات', de: 'Widgets', fr: 'Widgets' },
    keywords: { tr: ['widget'], en: ['widget'], ar: ['ويدجت'], de: ['widget'], fr: ['widget'] },
    knowledgeId: 'widgets',
  },
  {
    id: 'cloudSync',
    target: { screen: 'CloudSync' },
    icon: 'cloud-outline',
    name: { tr: 'Bulut senkron', en: 'Cloud sync', ar: 'المزامنة', de: 'Cloud-Sync', fr: 'Synchronisation' },
    keywords: { tr: ['senkron', 'yedekle', 'yedek', 'bulut'], en: ['sync', 'backup', 'cloud'], ar: ['مزامنه', 'نسخ احتياطي'], de: ['synchron', 'sicherung', 'cloud'], fr: ['synchronis', 'sauvegarde', 'cloud'] },
    knowledgeId: 'cloud_sync',
  },
  {
    id: 'family',
    target: { screen: 'FamilyMode' },
    icon: 'people-outline',
    name: { tr: 'Aile modu', en: 'Family mode', ar: 'وضع العائلة', de: 'Familienmodus', fr: 'Mode famille' },
    keywords: { tr: ['aile modu', 'aile'], en: ['family'], ar: ['عائله', 'اسره'], de: ['familie'], fr: ['famille'] },
    knowledgeId: 'family',
  },
  {
    id: 'homeEdit',
    target: { screen: 'HomeLauncherEdit' },
    icon: 'grid-outline',
    name: { tr: 'Ana ekranı düzenle', en: 'Edit home screen', ar: 'تعديل الشاشة الرئيسية', de: 'Startseite bearbeiten', fr: "Modifier l'accueil" },
    keywords: {
      tr: ['ana ekrani duzenle', 'ana ekran duzenle', 'ana ekrani ozellestir', 'ikon ekle'],
      en: ['edit home', 'customize home', 'home screen'],
      ar: ['تعديل الشاشه'],
      de: ['startseite bearbeiten', 'startbildschirm'],
      fr: ['modifier l accueil', 'ecran d accueil'],
    },
    knowledgeId: 'home_launcher',
  },
  {
    id: 'deleteAccount',
    target: { screen: 'DeleteAccount' },
    icon: 'trash-outline',
    name: { tr: 'Hesabı sil', en: 'Delete account', ar: 'حذف الحساب', de: 'Konto löschen', fr: 'Supprimer le compte' },
    keywords: { tr: ['hesabimi sil', 'hesabi sil', 'hesap silme'], en: ['delete account', 'delete my account'], ar: ['حذف الحساب'], de: ['konto loschen'], fr: ['supprimer le compte', 'supprimer mon compte'] },
  },
];

/** Purpose words → English dua tag (tags exist in duaLibrary.json) */
export const DUA_CONCEPTS: { tag: string; words: Words }[] = [
  { tag: 'sleep', words: { tr: ['uyku', 'uyumadan', 'yatarken', 'yatmadan', 'yatsi sonrasi'], en: ['sleep', 'bed'], ar: ['نوم'], de: ['schlaf', 'schlafen'], fr: ['dormir', 'sommeil', 'coucher'] } },
  { tag: 'waking', words: { tr: ['uyaninca', 'uyandigimda', 'uyanma', 'uyandiktan'], en: ['wake', 'waking'], ar: ['استيقاظ'], de: ['aufwachen'], fr: ['reveil'] } },
  { tag: 'morning', words: { tr: ['sabah'], en: ['morning'], ar: ['صباح'], de: ['morgen'], fr: ['matin'] } },
  { tag: 'evening', words: { tr: ['aksam'], en: ['evening'], ar: ['مساء'], de: ['abend'], fr: ['soir'] } },
  { tag: 'travel', words: { tr: ['yolculuk', 'seyahat', 'yola cik', 'arabaya', 'ucak', 'binerken'], en: ['travel', 'journey', 'trip', 'car', 'plane'], ar: ['سفر'], de: ['reise', 'reisen', 'auto', 'flug'], fr: ['voyage', 'voyager', 'voiture', 'avion'] } },
  { tag: 'food', words: { tr: ['yemek', 'yemekten', 'sofra'], en: ['food', 'eat', 'eating', 'meal'], ar: ['طعام', 'اكل'], de: ['essen', 'mahlzeit'], fr: ['manger', 'repas', 'nourriture'] } },
  { tag: 'mosque', words: { tr: ['camiye', 'camiden', 'mescide'], en: ['entering mosque', 'leaving mosque'], ar: ['دخول المسجد', 'الخروج من المسجد'], de: ['moschee betreten'], fr: ['entrer a la mosquee'] } },
  { tag: 'toilet', words: { tr: ['tuvalet', 'hela'], en: ['toilet', 'bathroom'], ar: ['خلاء'], de: ['toilette'], fr: ['toilettes'] } },
  { tag: 'wudu', words: { tr: ['abdest'], en: ['wudu', 'ablution'], ar: ['وضوء'], de: ['waschung', 'wudu'], fr: ['ablution'] } },
  { tag: 'home', words: { tr: ['eve', 'evden', 'eve girerken', 'evden cikarken'], en: ['home', 'house', 'leaving home'], ar: ['بيت', 'منزل'], de: ['haus', 'zuhause'], fr: ['maison'] } },
  { tag: 'rain', words: { tr: ['yagmur'], en: ['rain'], ar: ['مطر'], de: ['regen'], fr: ['pluie'] } },
  { tag: 'storm', words: { tr: ['firtina', 'gok gurultusu', 'simsek'], en: ['storm', 'thunder'], ar: ['رعد', 'عاصفه'], de: ['gewitter', 'sturm', 'donner'], fr: ['orage', 'tonnerre', 'tempete'] } },
  { tag: 'sick', words: { tr: ['hasta', 'hastalik', 'sifa', 'agri', 'hastane'], en: ['sick', 'ill', 'illness', 'healing', 'cure', 'pain', 'hospital'], ar: ['مريض', 'مرض', 'شفاء', 'الم'], de: ['krank', 'krankheit', 'heilung', 'schmerz'], fr: ['malade', 'maladie', 'guerison', 'douleur'] } },
  { tag: 'anxiety', words: { tr: ['sikinti', 'kaygi', 'endise', 'stres', 'uzuntu', 'huzursuz', 'bunaldim', 'daraldim', 'korku', 'korkuyorum'], en: ['anxiety', 'anxious', 'stress', 'worry', 'worried', 'sad', 'grief', 'depressed', 'fear', 'afraid', 'scared'], ar: ['هم', 'حزن', 'قلق', 'كرب', 'ضيق', 'خوف'], de: ['angst', 'sorge', 'stress', 'traurig', 'kummer', 'furcht'], fr: ['angoisse', 'anxiete', 'stress', 'tristesse', 'inquiet', 'peur'] } },
  { tag: 'debt', words: { tr: ['borc'], en: ['debt'], ar: ['دين'], de: ['schulden'], fr: ['dette'] } },
  { tag: 'provision', words: { tr: ['rizik', 'rizk', 'gecim', 'is bul', 'kazanc', 'bereket'], en: ['provision', 'income', 'rizq', 'job', 'money'], ar: ['رزق'], de: ['versorgung', 'einkommen', 'arbeit', 'geld'], fr: ['subsistance', 'revenu', 'travail', 'argent'] } },
  { tag: 'forgiveness', words: { tr: ['tovbe', 'istigfar', 'bagislanma', 'gunah', 'affet'], en: ['forgiveness', 'forgive', 'repent', 'repentance', 'sin'], ar: ['استغفار', 'توبه', 'مغفره', 'ذنب'], de: ['vergebung', 'reue', 'sunde'], fr: ['pardon', 'repentir', 'peche'] } },
  { tag: 'exam', words: { tr: ['sinav', 'imtihan', 'mulakat'], en: ['exam', 'test', 'interview'], ar: ['امتحان', 'اختبار'], de: ['prufung', 'test'], fr: ['examen'] } },
  { tag: 'knowledge', words: { tr: ['ilim', 'ders calis', 'ogrenci'], en: ['knowledge', 'study', 'student'], ar: ['علم'], de: ['wissen', 'studium'], fr: ['etude', 'etudiant'] } },
  { tag: 'parents', words: { tr: ['anne', 'baba', 'ebeveyn', 'annem', 'babam'], en: ['parents', 'mother', 'father'], ar: ['والدين', 'ام', 'اب'], de: ['eltern', 'mutter', 'vater'], fr: ['parents', 'mere', 'pere'] } },
  { tag: 'children', words: { tr: ['cocuk', 'evlat', 'bebek'], en: ['children', 'child', 'baby', 'offspring'], ar: ['اولاد', 'ذريه', 'طفل'], de: ['kinder', 'kind', 'baby'], fr: ['enfants', 'enfant', 'bebe'] } },
  { tag: 'marriage', words: { tr: ['evlilik', 'nikah', 'dugun', 'esim'], en: ['marriage', 'wedding', 'spouse'], ar: ['زواج', 'زوج'], de: ['heirat', 'hochzeit', 'ehe'], fr: ['mariage', 'epoux'] } },
  { tag: 'protection', words: { tr: ['korunma', 'nazar', 'koru', 'kotuluk', 'seytan', 'vesvese'], en: ['protection', 'protect', 'evil eye', 'devil', 'whispers', 'harm'], ar: ['حفظ', 'حمايه', 'العين', 'شيطان', 'وسوسه'], de: ['schutz', 'boser blick', 'teufel'], fr: ['protection', 'mauvais oeil', 'diable'] } },
  { tag: 'anger', words: { tr: ['ofke', 'sinirlen'], en: ['anger', 'angry'], ar: ['غضب'], de: ['wut', 'zorn'], fr: ['colere'] } },
  { tag: 'death', words: { tr: ['olum', 'vefat', 'mezar', 'kabir', 'cenaze', 'musibet', 'kayip'], en: ['death', 'grave', 'funeral', 'loss', 'calamity'], ar: ['موت', 'قبر', 'جنازه', 'مصيبه'], de: ['tod', 'grab', 'beerdigung', 'verlust'], fr: ['mort', 'tombe', 'funerailles', 'perte'] } },
  { tag: 'iftar', words: { tr: ['iftar', 'oruc acarken'], en: ['iftar', 'breaking fast'], ar: ['افطار'], de: ['iftar', 'fastenbrechen'], fr: ['iftar', 'rupture du jeune'] } },
  { tag: 'clothes', words: { tr: ['elbise', 'kiyafet', 'giyinirken'], en: ['clothes', 'dressing'], ar: ['لباس', 'ثوب'], de: ['kleidung'], fr: ['vetement'] } },
  { tag: 'new moon', words: { tr: ['hilal', 'yeni ay'], en: ['new moon', 'crescent'], ar: ['هلال'], de: ['neumond', 'mondsichel'], fr: ['nouvelle lune', 'croissant'] } },
  { tag: 'gratitude', words: { tr: ['sukur', 'hamd'], en: ['gratitude', 'thanks', 'grateful'], ar: ['شكر', 'حمد'], de: ['dank', 'dankbarkeit'], fr: ['gratitude', 'remerciement'] } },
  { tag: 'guidance', words: { tr: ['hidayet', 'istihare', 'karar'], en: ['guidance', 'decision', 'istikhara'], ar: ['هدايه', 'استخاره'], de: ['rechtleitung', 'entscheidung'], fr: ['guidance', 'decision'] } },
  { tag: 'patience', words: { tr: ['sabir'], en: ['patience', 'patient'], ar: ['صبر'], de: ['geduld'], fr: ['patience'] } },
  { tag: 'friday', words: { tr: ['cuma'], en: ['friday'], ar: ['جمعه'], de: ['freitag'], fr: ['vendredi'] } },
  { tag: 'adhan', words: { tr: ['ezan'], en: ['adhan', 'azan', 'call to prayer'], ar: ['اذان'], de: ['gebetsruf'], fr: ['appel a la priere'] } },
];

/** Learn search in ar/de/fr goes through English terms */
export const LEARN_TERMS: { en: string; words: Words }[] = [
  { en: 'fast', words: { tr: [], en: [], ar: ['صيام', 'صوم'], de: ['fasten'], fr: ['jeune'] } },
  { en: 'breaks', words: { tr: [], en: [], ar: ['مبطلات', 'يبطل', 'يفطر', 'نواقض', 'ينقض'], de: ['bricht', 'brechen', 'ungultig'], fr: ['rompt', 'rompre', 'annule', 'invalide'] } },
  { en: 'zakat', words: { tr: [], en: [], ar: ['زكاه'], de: ['zakat'], fr: ['zakat', 'aumone'] } },
  { en: 'wudu', words: { tr: [], en: [], ar: ['وضوء'], de: ['waschung', 'wudu'], fr: ['ablution'] } },
  { en: 'ghusl', words: { tr: [], en: [], ar: ['غسل'], de: ['ghusl', 'ganzkorperwaschung'], fr: ['ghusl', 'grande ablution'] } },
  { en: 'prayer', words: { tr: [], en: [], ar: ['صلاه'], de: ['gebet', 'salah'], fr: ['priere', 'salat'] } },
  { en: 'hajj', words: { tr: [], en: [], ar: ['حج'], de: ['hadsch', 'hajj'], fr: ['hajj', 'pelerinage'] } },
  { en: 'umrah', words: { tr: [], en: [], ar: ['عمره'], de: ['umra'], fr: ['omra', 'umrah'] } },
  { en: 'sacrifice', words: { tr: [], en: [], ar: ['اضحيه', 'قربان'], de: ['opfer'], fr: ['sacrifice'] } },
  { en: 'tarawih', words: { tr: [], en: [], ar: ['تراويح'], de: ['tarawih'], fr: ['tarawih'] } },
  { en: 'halal', words: { tr: [], en: [], ar: ['حلال'], de: ['halal'], fr: ['halal'] } },
  { en: 'faith', words: { tr: [], en: [], ar: ['ايمان'], de: ['glaube'], fr: ['foi'] } },
  { en: 'friday', words: { tr: [], en: [], ar: ['جمعه'], de: ['freitagsgebet'], fr: ['vendredi'] } },
  { en: 'eid', words: { tr: [], en: [], ar: ['عيد'], de: ['bayram', 'eid'], fr: ['aid'] } },
  { en: 'qadr', words: { tr: [], en: [], ar: ['القدر'], de: ['qadr'], fr: ['qadr'] } },
  { en: 'tayammum', words: { tr: [], en: [], ar: ['تيمم'], de: ['tayammum'], fr: ['tayammum'] } },
  { en: 'neighbours', words: { tr: [], en: [], ar: ['جار'], de: ['nachbar'], fr: ['voisin'] } },
  { en: 'parents', words: { tr: [], en: [], ar: ['والدين'], de: ['eltern'], fr: ['parents'] } },
];

export const STOPWORDS: Words = {
  tr: ['ne', 'nedir', 'nasil', 'nerede', 'hangi', 'bana', 'beni', 'benim', 'icin', 'ile', 've', 'bir', 'bu', 'su', 'mi', 'mu', 'var', 'yok', 'olan', 'olarak', 'ki', 'de', 'da', 'gibi', 'kadar', 'lazim', 'gerek', 'istiyorum', 'lutfen', 'hakkinda', 'soyle', 'anlat', 'acikla', 'ac', 'goster', 'neler', 'nelerdir', 'misin', 'musun', 'yapilir', 'edilir', 'olur', 'bilgi', 'ver', 'dua', 'duasi', 'duasini', 'sure', 'suresi', 'sayfa', 'sayfasi', 'oku', 'okunur', 'zaman', 'hangisi', 'kimlere', 'alinir', 'kilinir', 'tutulur', 'yapmak', 'nasildir'],
  en: ['what', 'how', 'where', 'is', 'are', 'the', 'a', 'an', 'to', 'for', 'me', 'my', 'open', 'show', 'take', 'go', 'find', 'please', 'i', 'want', 'can', 'you', 'read', 'when', 'which', 'of', 'about', 'explain', 'tell', 'dua', 'duas', 'do', 'does', 'in', 'on', 'and', 'or', 'with', 'it', 'that', 'this', 'say', 'should', 'there', 'page'],
  ar: [],
  de: [],
  fr: [],
};

export const GREET_WORDS = ['selam', 'selamun aleykum', 'selamunaleykum', 'merhaba', 'hello', 'hi', 'salam', 'assalamu alaikum', 'السلام عليكم', 'مرحبا', 'hallo', 'bonjour', 'salut'];
export const HELP_WORDS = ['yardim', 'neler yapabilirsin', 'ne yapabilirsin', 'help', 'what can you do', 'مساعده', 'ماذا تستطيع', 'hilfe', 'was kannst du', 'aide', 'que sais tu faire'];

export const PRAYER_NAMES: Record<PrayerName, Text> = {
  fajr: { tr: 'İmsak', en: 'Fajr', ar: 'الفجر', de: 'Fadschr', fr: 'Fajr' },
  sunrise: { tr: 'Güneş', en: 'Sunrise', ar: 'الشروق', de: 'Sonnenaufgang', fr: 'Lever du soleil' },
  dhuhr: { tr: 'Öğle', en: 'Dhuhr', ar: 'الظهر', de: 'Dhuhr', fr: 'Dhuhr' },
  asr: { tr: 'İkindi', en: 'Asr', ar: 'العصر', de: 'Asr', fr: 'Asr' },
  maghrib: { tr: 'Akşam', en: 'Maghrib', ar: 'المغرب', de: 'Maghrib', fr: 'Maghrib' },
  isha: { tr: 'Yatsı', en: 'Isha', ar: 'العشاء', de: 'Ischa', fr: 'Isha' },
};
