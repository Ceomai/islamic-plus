import { APP_KNOWLEDGE, ISLAMIC_KNOWLEDGE } from '../data/appKnowledge';
import { DUAS, duaTranslitKey, translitHit, type Dua } from '../data/duas';
import { LEARN_ENTRIES, topicText, type LearnEntry } from '../data/learn';
import { SURAHS, type SurahName } from '../data/surahs';
import type { AppLanguage, AssistantAction, AssistantTarget, PrayerName } from '../types';

/**
 * On-device assistant: detects the question's language (tr, en, ar, de, fr), finds what the user
 * wants (a page, a surah, a dua, a Learn topic or app help) and answers in that language with
 * buttons that open the matching screen. Clear requests ("open…", a named dua or surah) also
 * navigate on their own.
 */
export type ChatLang = 'tr' | 'en' | 'ar' | 'de' | 'fr';
type Words = Record<ChatLang, string[]>;
type Text = Record<ChatLang, string>;

export interface AssistantContext {
  appLang: AppLanguage;
  quranEdition: string;
  nextPrayer?: { name: PrayerName; time: string } | null;
}

export interface AssistantReply {
  lang: ChatLang;
  text: string;
  actions: AssistantAction[];
  /** Navigate without waiting for a tap */
  autoNavigate?: AssistantTarget;
  /** false when nothing matched and the reply is the generic "try asking…" answer */
  matched?: boolean;
}

// ─── Text normalisation ──────────────────────────────────────────────────────

const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const LATIN_FOLD: [RegExp, string][] = [
  [/ı/g, 'i'],
  [/[şș]/g, 's'],
  [/ğ/g, 'g'],
  [/ç/g, 'c'],
  [/[öô]/g, 'o'],
  [/œ/g, 'oe'],
  [/[üûùú]/g, 'u'],
  [/[âàáä]/g, 'a'],
  [/[îïí]/g, 'i'],
  [/[éèêë]/g, 'e'],
  [/ß/g, 'ss'],
];

/** Lowercase, strip accents and Arabic vowel marks, unify letter variants, drop punctuation. */
export function fold(text: string): string {
  let s = text.toLocaleLowerCase('tr');
  for (const [re, to] of LATIN_FOLD) s = s.replace(re, to);
  return s
    .replace(AR_MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/['’`´]/g, '')
    .replace(/[.,!?;:()"“”«»„\-_/\\؟،…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const isArabic = (s: string) => /[؀-ۿ]/.test(s);

/** Arabic tokens lose leading و / ال / بال / لل so "والمسجد" matches "مسجد". */
function stripArabicPrefix(token: string): string {
  let t = token;
  if (t.length > 3 && t.startsWith('و')) t = t.slice(1);
  for (const p of ['بال', 'وال', 'لل', 'ال']) {
    if (t.length > p.length + 1 && t.startsWith(p)) return t.slice(p.length);
  }
  return t;
}

interface Query {
  raw: string;
  folded: string;
  tokens: string[];
}

function makeQuery(raw: string): Query {
  const folded = fold(raw);
  const tokens = folded.split(' ').filter(Boolean).map((t) => (isArabic(t) ? stripArabicPrefix(t) : t));
  return { raw, folded, tokens };
}

/** Word-start match so Turkish suffixes still match ("duasını" ← "dua"); short words must match exactly. */
function hasWord(q: Query, keyword: string): boolean {
  const kw = fold(keyword);
  if (!kw) return false;
  if (kw.includes(' ')) return ` ${q.tokens.join(' ')} `.includes(` ${kw}`) || ` ${q.folded} `.includes(` ${kw}`);
  const k = isArabic(kw) ? stripArabicPrefix(kw) : kw;
  const minPrefix = isArabic(k) ? 3 : 4;
  return q.tokens.some((t) => t === k || (k.length >= minPrefix && t.startsWith(k)));
}

const anyWord = (q: Query, list: string[] | undefined) => (list ?? []).some((w) => hasWord(q, w));
/** Matched keyword length — longer, more specific phrases win. */
const matchWeight = (q: Query, list: string[] | undefined) =>
  (list ?? []).reduce((best, w) => (hasWord(q, w) ? Math.max(best, fold(w).length) : best), 0);

// ─── Language detection ──────────────────────────────────────────────────────

const LANG_HINTS: Record<Exclude<ChatLang, 'ar'>, string[]> = {
  tr: ['ne', 'nasil', 'nerede', 'nedir', 'hangi', 'bana', 'beni', 'ac', 'goster', 'gotur', 'icin', 'istiyorum', 'mi', 'mu', 'bir', 've', 'ile', 'duasi', 'namaz', 'oruc', 'zekat', 'bul', 'oku', 'kac', 'lutfen', 'merhaba', 'suresi', 'abdest', 'kible', 'bugun', 'zaman', 'nelerdir', 'hakkinda', 'anlat', 'acikla', 'cok', 'ben', 'sen', 'bu', 'icin'],
  en: ['what', 'how', 'where', 'is', 'the', 'a', 'an', 'to', 'for', 'me', 'my', 'open', 'show', 'take', 'go', 'find', 'please', 'i', 'want', 'can', 'you', 'prayer', 'read', 'when', 'which', 'of', 'hello', 'hi', 'about', 'explain', 'does', 'do', 'feel', 'am', 'im', 'need', 'should'],
  de: ['was', 'wie', 'wo', 'ist', 'der', 'die', 'das', 'ein', 'eine', 'und', 'ich', 'mir', 'mich', 'bitte', 'offne', 'zeig', 'zeige', 'gebet', 'bittgebet', 'fur', 'lesen', 'wann', 'gibt', 'es', 'hallo', 'koran', 'fasten', 'nachste', 'erklare', 'uber', 'habe', 'bin', 'mein', 'meine', 'nicht', 'vor', 'dem', 'den'],
  fr: ['quoi', 'comment', 'ou', 'est', 'le', 'la', 'les', 'un', 'une', 'et', 'je', 'moi', 'mon', 'ma', 'pour', 'ouvre', 'montre', 'priere', 'invocation', 'lire', 'quand', 'quel', 'quelle', 'bonjour', 'salut', 'coran', 'jeune', 'vous', 'plait', 'explique', 'sourate', 'qu', 'jai', 'suis', 'des', 'du', 'au', 'peur', 'faire'],
};

/** Words of transliterated Arabic ("la ilahe illa…") say nothing about the writer's language */
const TRANSLIT_WORDS = new Set(['la', 'illa', 've', 'wa', 'va', 'bi', 'bika', 'bike', 'inni', 'min', 'minal', 'ya', 'rabbi', 'rabbena', 'rabbana', 'allahumma', 'allahumme', 'ente', 'anta', 'ala', 'fi']);

export function detectLanguage(raw: string, fallback: AppLanguage): ChatLang {
  if (isArabic(raw)) return 'ar';
  const lower = raw.toLocaleLowerCase('tr');
  const tokens = fold(raw).split(' ').filter((t) => !TRANSLIT_WORDS.has(t));
  const score: Record<Exclude<ChatLang, 'ar'>, number> = { tr: 0, en: 0, de: 0, fr: 0 };
  // Check the raw text: Turkish lowercasing turns an English "I" into "ı"
  if (/[ğışĞŞİ]/.test(raw)) score.tr += 3;
  if (/[ßä]/.test(lower)) score.de += 3;
  if (/[éèêàœ]/.test(lower)) score.fr += 3;
  if (/[öü]/.test(lower)) {
    score.tr += 1;
    score.de += 1;
  }
  for (const lang of Object.keys(LANG_HINTS) as (keyof typeof LANG_HINTS)[]) {
    score[lang] += tokens.filter((t) => LANG_HINTS[lang].includes(t)).length;
  }
  const ranked = (Object.entries(score) as [Exclude<ChatLang, 'ar'>, number][]).sort((a, b) => b[1] - a[1]);
  const [topLang, top] = ranked[0];
  if (top === 0) return fallback;
  // On a tie prefer the app language
  if (ranked[1][1] === top && score[fallback] === top) return fallback;
  return topLang;
}

// ─── Vocabulary ──────────────────────────────────────────────────────────────

const OPEN_VERBS: Words = {
  tr: ['ac', 'acar', 'acarmisin', 'acin', 'acsana', 'goster', 'gotur', 'git', 'gec', 'getir', 'baslat', 'oku', 'okut', 'dinlet', 'gitmek'],
  en: ['open', 'show', 'take', 'go', 'navigate', 'bring', 'start', 'launch', 'read', 'play'],
  ar: ['افتح', 'اظهر', 'اعرض', 'اذهب', 'خذني', 'انقلني', 'اقرا', 'شغل'],
  de: ['offne', 'oeffne', 'zeig', 'zeige', 'gehe', 'geh', 'bring', 'starte', 'lies', 'spiele'],
  fr: ['ouvre', 'ouvrir', 'montre', 'montrer', 'va', 'aller', 'emmene', 'amene', 'lance', 'lis', 'lire', 'joue'],
};

const EXPLAIN_WORDS: Words = {
  tr: ['acikla', 'anlat', 'nedir', 'ne demek', 'anlami', 'nasil', 'neler', 'hakkinda', 'bilgi'],
  en: ['explain', 'what is', 'what are', 'meaning', 'tell me', 'how', 'about'],
  ar: ['اشرح', 'ما هو', 'ما هي', 'معنى', 'كيف', 'عن'],
  de: ['erklare', 'erklaer', 'was ist', 'was sind', 'bedeutung', 'wie', 'uber'],
  fr: ['explique', 'qu est ce', 'quest ce', 'signification', 'comment', 'sur'],
};

const DUA_WORDS: Words = {
  tr: ['dua', 'zikir', 'virt'],
  en: ['dua', 'duas', 'supplication', 'dhikr', 'what to say', 'prayer for', 'prayer before', 'prayer after', 'prayer when'],
  ar: ['دعاء', 'ادعيه', 'ذكر', 'اذكار'],
  de: ['bittgebet', 'dua', 'gebet fur', 'gebet vor', 'gebet nach', 'dhikr'],
  fr: ['invocation', 'doua', 'dua', 'dhikr', 'priere pour', 'priere avant', 'priere apres'],
};

const SURAH_WORDS: Words = {
  tr: ['sure', 'suresi', 'suresini'],
  en: ['surah', 'sura', 'surat'],
  ar: ['سوره'],
  de: ['sure', 'sura'],
  fr: ['sourate'],
};

const AYAT_KURSI = ['ayetel kursi', 'ayet el kursi', 'ayetul kursi', 'ayat al kursi', 'ayatul kursi', 'ayat ul kursi', 'آيه الكرسي', 'ايه الكرسي'];

/** Aliases that collide with the words for "surah" itself */
const BLOCKED_ALIASES = new Set(['sura', 'sure', 'surat']);

/** Short names that are also everyday words or prophet names: only count with "sure/surah". */
const SURAH_NEEDS_KEYWORD = new Set(
  ['ibrahim', 'muhammed', 'muhammad', 'meryem', 'maryam', 'yusuf', 'yunus', 'nuh', 'hud', 'rahman', 'insan', 'mumin', 'nisa', 'kalem', 'tevbe', 'nahl', 'neml', 'secde', 'talak', 'tahrim', 'cin', 'asr', 'nur', 'hac', 'hajj', 'kadr', 'qadr', 'fil', 'leyl', 'sems', 'duha', 'tin', 'nasr', 'alak', 'mulk', 'fecr', 'fajr', 'saf', 'sad', 'kaf', 'qaf', 'cuma', 'hicr', 'beled', 'tur', 'necm', 'kamer', 'hadid', 'rum', 'fetih', 'fath', 'cum a', 'luqman', 'lokman', 'enfal', 'ahzab', 'maide', 'nas', 'kureys', 'quraysh', 'zilzal', 'kevser', 'saba', 'sebe', 'hasr', 'hashr', 'jinn', 'tawbah', 'sajdah', 'jumuah', 'talaq', 'qiyamah', 'shams', 'najm', 'qalam', 'taha', 'isra']
);

interface Feature {
  id: string;
  target: AssistantTarget;
  icon: string;
  name: Text;
  keywords: Words;
  /** APP_KNOWLEDGE entry with a how-to text (tr/en) */
  knowledgeId?: string;
}

const FEATURES: Feature[] = [
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
const DUA_CONCEPTS: { tag: string; words: Words }[] = [
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
const LEARN_TERMS: { en: string; words: Words }[] = [
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

const STOPWORDS: Words = {
  tr: ['ne', 'nedir', 'nasil', 'nerede', 'hangi', 'bana', 'beni', 'benim', 'icin', 'ile', 've', 'bir', 'bu', 'su', 'mi', 'mu', 'var', 'yok', 'olan', 'olarak', 'ki', 'de', 'da', 'gibi', 'kadar', 'lazim', 'gerek', 'istiyorum', 'lutfen', 'hakkinda', 'soyle', 'anlat', 'acikla', 'ac', 'goster', 'neler', 'nelerdir', 'misin', 'musun', 'yapilir', 'edilir', 'olur', 'bilgi', 'ver', 'dua', 'duasi', 'duasini', 'sure', 'suresi', 'sayfa', 'sayfasi', 'oku', 'okunur', 'zaman', 'hangisi', 'kimlere', 'alinir', 'kilinir', 'tutulur', 'yapmak', 'nasildir'],
  en: ['what', 'how', 'where', 'is', 'are', 'the', 'a', 'an', 'to', 'for', 'me', 'my', 'open', 'show', 'take', 'go', 'find', 'please', 'i', 'want', 'can', 'you', 'read', 'when', 'which', 'of', 'about', 'explain', 'tell', 'dua', 'duas', 'do', 'does', 'in', 'on', 'and', 'or', 'with', 'it', 'that', 'this', 'say', 'should', 'there', 'page'],
  ar: [],
  de: [],
  fr: [],
};

// ─── Reply templates ─────────────────────────────────────────────────────────

const T = {
  empty: { tr: 'Lütfen bir şey yazın.', en: 'Please type something.', ar: 'من فضلك اكتب سؤالك.', de: 'Bitte schreib etwas.', fr: 'Écris quelque chose, s’il te plaît.' },
  greeting: {
    tr: 'Ve aleyküm selam! Size nasıl yardımcı olabilirim? Bir sure, bir dua ya da bir sayfa isteyebilirsiniz.',
    en: 'Wa alaikum assalam! How can I help? Ask for a surah, a dua or any page in the app.',
    ar: 'وعليكم السلام! كيف أستطيع مساعدتك؟ اطلب سورة أو دعاءً أو أي صفحة في التطبيق.',
    de: 'Wa alaikum assalam! Wie kann ich helfen? Frag nach einer Sure, einem Bittgebet oder einer Seite der App.',
    fr: 'Wa alaykoum salam ! Comment puis-je aider ? Demande une sourate, une invocation ou une page de l’application.',
  },
  help: {
    tr: 'Türkçe, İngilizce, Arapça, Almanca ve Fransızca anlıyorum. Şunları yapabilirim:\n• Sayfa açmak: “Kıbleyi göster”, “Tesbihi aç”\n• Sure açmak: “Yasin suresini aç”, “Âyetü’l-Kürsî”\n• Amaca göre dua bulup açıklamak: “Yolculuk duası”, “Borç için dua”\n• Konu özetlemek: “Orucu bozan şeyler nedir?”\n• Sıradaki namaz vaktini söylemek',
    en: 'I understand English, Turkish, Arabic, German and French. I can:\n• Open pages: “Show qibla”, “Open tasbih”\n• Open surahs: “Open Surah Yasin”, “Ayat al-Kursi”\n• Find and explain duas by purpose: “dua for travel”, “dua for debt”\n• Summarise topics: “What breaks the fast?”\n• Tell you the next prayer time',
    ar: 'أفهم العربية والتركية والإنجليزية والألمانية والفرنسية. أستطيع:\n• فتح الصفحات: «افتح القبلة»\n• فتح السور: «افتح سورة يس»، «آية الكرسي»\n• إيجاد الأدعية وشرحها: «دعاء السفر»، «دعاء قضاء الدين»\n• تلخيص المواضيع: «ما هي مبطلات الصيام؟»\n• إخبارك بموعد الصلاة القادمة',
    de: 'Ich verstehe Deutsch, Türkisch, Englisch, Arabisch und Französisch. Ich kann:\n• Seiten öffnen: „Zeig die Qibla“\n• Suren öffnen: „Öffne Sure Yasin“, „Ayat al-Kursi“\n• Bittgebete finden und erklären: „Bittgebet für die Reise“\n• Themen zusammenfassen: „Was bricht das Fasten?“\n• Dir das nächste Gebet nennen',
    fr: 'Je comprends le français, le turc, l’anglais, l’arabe et l’allemand. Je peux :\n• Ouvrir des pages : « Montre la qibla »\n• Ouvrir des sourates : « Ouvre la sourate Yasin », « Ayat al-Kursi »\n• Trouver et expliquer des invocations : « invocation pour le voyage »\n• Résumer des sujets : « Qu’est-ce qui rompt le jeûne ? »\n• Te donner la prochaine prière',
  },
  opening: { tr: '{name} sayfasını açıyorum.', en: 'Opening {name}.', ar: 'سأفتح صفحة {name}.', de: 'Ich öffne {name}.', fr: 'J’ouvre {name}.' },
  canOpen: { tr: 'Bunun için {name} sayfası var.', en: '{name} is the place for this.', ar: 'يمكنك ذلك من صفحة {name}.', de: 'Dafür gibt es die Seite {name}.', fr: 'La page {name} est faite pour cela.' },
  duaFound: { tr: '“{title}” duasını buldum.', en: 'I found “{title}”.', ar: 'وجدت هذا الدعاء: «{title}»', de: 'Ich habe dieses Bittgebet gefunden: „{title}“.', fr: 'J’ai trouvé cette invocation : « {title} ».' },
  duaGoing: {
    tr: 'Arapçası, okunuşu ve sesi için seni dua sayfasına götürüyorum.',
    en: 'Taking you to the dua page for the Arabic, transliteration and audio.',
    ar: 'سأنقلك إلى صفحة الدعاء لقراءة النص والاستماع إليه.',
    de: 'Ich bringe dich zur Seite mit arabischem Text, Umschrift und Audio.',
    fr: 'Je t’emmène à la page avec le texte arabe, la translittération et l’audio.',
  },
  duaPick: { tr: 'Açmak istediğin duaya dokun.', en: 'Tap a dua to open it.', ar: 'اضغط على الدعاء لفتحه.', de: 'Tippe auf ein Bittgebet, um es zu öffnen.', fr: 'Touche une invocation pour l’ouvrir.' },
  repeat: { tr: '{n} kez okunur.', en: 'Recited {n} times.', ar: 'يُقرأ {n} مرات.', de: 'Wird {n}-mal gesprochen.', fr: 'À réciter {n} fois.' },
  others: { tr: 'Benzer dualar da aşağıda.', en: 'Related duas are below.', ar: 'أدعية مشابهة بالأسفل.', de: 'Ähnliche Bittgebete findest du unten.', fr: 'D’autres invocations sont ci-dessous.' },
  meaningEn: { tr: '', en: '', ar: '(المعنى بالإنجليزية)', de: '(Bedeutung auf Englisch)', fr: '(sens en anglais)' },
  surahOpening: { tr: '{name} suresini açıyorum ({n}. sure).', en: 'Opening Surah {name} (surah {n}).', ar: 'سأفتح سورة {name} (رقم {n}).', de: 'Ich öffne Sure {name} (Nr. {n}).', fr: 'J’ouvre la sourate {name} (n° {n}).' },
  surahOffer: { tr: '{name} suresini mi arıyorsun? ({n}. sure)', en: 'Looking for Surah {name}? (surah {n})', ar: 'هل تبحث عن سورة {name}؟ (رقم {n})', de: 'Suchst du Sure {name}? (Nr. {n})', fr: 'Tu cherches la sourate {name} ? (n° {n})' },
  ayatKursi: {
    tr: 'Âyetü’l-Kürsî, Bakara suresinin 255. ayetidir. Seni o ayete götürüyorum.',
    en: 'Ayat al-Kursi is verse 255 of Al-Baqarah. Taking you there.',
    ar: 'آية الكرسي هي الآية 255 من سورة البقرة. سأنقلك إليها.',
    de: 'Ayat al-Kursi ist Vers 255 der Sure Al-Baqara. Ich bringe dich dorthin.',
    fr: 'Ayat al-Kursi est le verset 255 de la sourate Al-Baqara. Je t’y emmène.',
  },
  topic: { tr: '“{title}” konusunun özeti:', en: 'Summary of “{title}”:', ar: 'ملخص موضوع «{title}»:', de: 'Zusammenfassung von „{title}“:', fr: 'Résumé de « {title} » :' },
  topicMore: { tr: 'Konunun tamamı Öğren sekmesinde.', en: 'The full topic is in Learn.', ar: 'الموضوع كاملاً في قسم «تعلّم» (بالإنجليزية).', de: 'Das ganze Thema steht unter „Lernen“ (auf Englisch).', fr: 'Le sujet complet est dans « Apprendre » (en anglais).' },
  nextPrayer: { tr: 'Sıradaki vakit {name}: {time}.', en: 'Next prayer: {name} at {time}.', ar: 'الصلاة القادمة {name} الساعة {time}.', de: 'Nächstes Gebet: {name} um {time}.', fr: 'Prochaine prière : {name} à {time}.' },
  noLocation: { tr: 'Vakitleri hesaplamak için konum izni gerekiyor; ana sayfadan konumunu paylaşabilirsin.', en: 'I need your location to calculate prayer times; you can share it on Home.', ar: 'أحتاج إلى موقعك لحساب مواقيت الصلاة، يمكنك مشاركته من الصفحة الرئيسية.', de: 'Für die Gebetszeiten brauche ich deinen Standort; du kannst ihn auf der Startseite freigeben.', fr: 'J’ai besoin de ta position pour calculer les horaires ; tu peux la partager sur l’accueil.' },
  fallback: {
    tr: 'Bunu tam anlayamadım. Şöyle deneyebilirsin: “Yasin suresini aç”, “Sınav duası”, “Kıbleyi göster”, “Zekât kimlere farzdır?”. Tüm liste için “yardım” yaz.',
    en: 'I didn’t quite get that. Try: “Open Surah Yasin”, “dua for exams”, “show qibla”, “who must pay zakat?”. Type “help” for everything I can do.',
    ar: 'لم أفهم تماماً. جرّب: «افتح سورة يس»، «دعاء الامتحان»، «افتح القبلة». اكتب «مساعدة» لمعرفة كل ما أستطيع فعله.',
    de: 'Das habe ich nicht ganz verstanden. Versuch: „Öffne Sure Yasin“, „Bittgebet für Prüfung“, „Zeig die Qibla“. Schreib „Hilfe“ für alles, was ich kann.',
    fr: 'Je n’ai pas bien compris. Essaie : « Ouvre la sourate Yasin », « invocation pour l’examen », « montre la qibla ». Écris « aide » pour tout ce que je sais faire.',
  },
  openTopic: { tr: 'Konuyu aç', en: 'Open topic', ar: 'افتح الموضوع', de: 'Thema öffnen', fr: 'Ouvrir le sujet' },
} satisfies Record<string, Text>;

const GREET_WORDS = ['selam', 'selamun aleykum', 'selamunaleykum', 'merhaba', 'hello', 'hi', 'salam', 'assalamu alaikum', 'السلام عليكم', 'مرحبا', 'hallo', 'bonjour', 'salut'];
const HELP_WORDS = ['yardim', 'neler yapabilirsin', 'ne yapabilirsin', 'help', 'what can you do', 'مساعده', 'ماذا تستطيع', 'hilfe', 'was kannst du', 'aide', 'que sais tu faire'];

const PRAYER_NAMES: Record<PrayerName, Text> = {
  fajr: { tr: 'İmsak', en: 'Fajr', ar: 'الفجر', de: 'Fadschr', fr: 'Fajr' },
  sunrise: { tr: 'Güneş', en: 'Sunrise', ar: 'الشروق', de: 'Sonnenaufgang', fr: 'Lever du soleil' },
  dhuhr: { tr: 'Öğle', en: 'Dhuhr', ar: 'الظهر', de: 'Dhuhr', fr: 'Dhuhr' },
  asr: { tr: 'İkindi', en: 'Asr', ar: 'العصر', de: 'Asr', fr: 'Asr' },
  maghrib: { tr: 'Akşam', en: 'Maghrib', ar: 'المغرب', de: 'Maghrib', fr: 'Maghrib' },
  isha: { tr: 'Yatsı', en: 'Isha', ar: 'العشاء', de: 'Ischa', fr: 'Isha' },
};

const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

/** Content (titles, meanings) exists in tr and en; other chat languages read English. */
const contentLang = (lang: ChatLang): AppLanguage => (lang === 'tr' ? 'tr' : 'en');

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`;
}

// ─── Matchers ────────────────────────────────────────────────────────────────

const SURAH_ALIASES: { surah: SurahName; alias: string; ar: boolean }[] = SURAHS.flatMap((s) => {
  const en = fold(s.en);
  const enBare = en.replace(/^(al|an|ar|as|at|ad|adh|az|ash) /, '');
  const list = new Set([fold(s.tr), en, enBare, enBare.replace(/ /g, '')]);
  return [
    ...[...list].filter(Boolean).map((alias) => ({ surah: s, alias, ar: false })),
    { surah: s, alias: stripArabicPrefix(fold(s.ar)), ar: true },
  ];
});

function findSurah(q: Query, lang: ChatLang): { surah: SurahName; explicit: boolean } | null {
  const keyword = anyWord(q, Object.values(SURAH_WORDS).flat());

  // "36. sure", "surah 36", "sure 36"
  const num = q.folded.match(/(\d{1,3})\s*\.?\s*(sure|surah|sura|sourate|سوره)|(sure|surah|sura|sourate|سوره)\s*(\d{1,3})/);
  if (num) {
    const n = Number(num[1] ?? num[4]);
    if (n >= 1 && n <= 114) return { surah: SURAHS[n - 1], explicit: true };
  }

  let best: { surah: SurahName; len: number } | null = null;
  for (const { surah, alias, ar } of SURAH_ALIASES) {
    if (alias.length < 2 || BLOCKED_ALIASES.has(alias)) continue;
    const hit = ar
      ? q.tokens.some((t) => t === alias) && (keyword || alias.length >= 4)
      : alias.includes(' ')
        ? ` ${q.folded} `.includes(` ${alias}`)
        : q.tokens.some((t) => t === alias || (alias.length >= 4 && t.startsWith(alias) && t.length - alias.length <= 4));
    if (!hit) continue;
    if (!keyword && (SURAH_NEEDS_KEYWORD.has(alias) || alias.length < 4)) continue;
    if (!best || alias.length > best.len) best = { surah, len: alias.length };
  }
  if (!best) return null;
  return { surah: best.surah, explicit: keyword || anyWord(q, OPEN_VERBS[lang]) };
}

function findFeature(q: Query): { feature: Feature; weight: number } | null {
  let best: { feature: Feature; weight: number } | null = null;
  for (const feature of FEATURES) {
    const weight = Math.max(...(Object.keys(feature.keywords) as ChatLang[]).map((l) => matchWeight(q, feature.keywords[l])));
    if (weight > 0 && (!best || weight > best.weight)) best = { feature, weight };
  }
  return best;
}

function contentWords(q: Query, lang: ChatLang): string[] {
  const stop = new Set([...STOPWORDS.tr, ...STOPWORDS.en, ...STOPWORDS[lang]].map(fold));
  return q.tokens.filter((t) => t.length >= 3 && !stop.has(t) && !isArabic(t));
}

/** Word-start match against a field, so "yolculuk" finds "yolculuktan" but "dem" doesn't find "adam". */
const fieldHas = (field: string, w: string) => fold(field).split(' ').some((t) => t.startsWith(w));

function findDuas(q: Query, lang: ChatLang): { duas: Dua[]; concept: boolean; recited: boolean } {
  const scores = new Map<string, number>();
  const soundHits = new Map<string, number>();
  const add = (d: Dua, s: number) => scores.set(d.id, (scores.get(d.id) ?? 0) + s);

  const concepts = DUA_CONCEPTS.filter((c) => (Object.keys(c.words) as ChatLang[]).some((l) => anyWord(q, c.words[l])));
  for (const c of concepts) {
    const tag = fold(c.tag);
    for (const d of DUAS) {
      const enTags = d.tags.en.map(fold);
      // A dua whose main tag is the purpose ranks above one that only mentions it
      if (enTags[0] === tag) add(d, 8);
      else if (enTags.includes(tag)) add(d, 6);
      else if (enTags.some((t) => t.includes(tag))) add(d, 3);
    }
  }

  // Remaining words against titles, tags and transliteration; dua content exists only in tr/en
  if (lang === 'tr' || lang === 'en') {
    const conceptWords = concepts.flatMap((c) => Object.values(c.words).flat()).map(fold).filter((k) => !k.includes(' '));
    const words = contentWords(q, lang).filter((w) => !conceptWords.some((k) => w === k || (k.length >= 4 && w.startsWith(k))));
    for (const w of words) {
      for (const d of DUAS) {
        const sc =
          (fieldHas([...d.tags.tr, ...d.tags.en].join(' '), w) ? 3 : 0) +
          (fieldHas(`${d.title.tr} ${d.title.en}`, w) ? 4 : 0) +
          (translitHit(d, w) ? 2 : 0);
        if (sc) add(d, sc);
      }
    }
  }

  // The dua's own words typed in any spelling ("rabbena atina", "a'udhu bika") – works in every chat language
  const latin = q.tokens.filter((t) => t.length >= 4 && !isArabic(t));
  if (latin.length >= 2) {
    for (const d of DUAS) {
      const hits = latin.filter((w) => translitHit(d, w)).length;
      if (hits >= 2) {
        soundHits.set(d.id, hits);
        // A shorter dua covered by the same words is closer to what the user is reciting
        add(d, hits * 4 + Math.min(3, 60 / duaTranslitKey(d).length));
      }
    }
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0]?.[1] ?? 0;
  const duas = ranked
    .filter(([, sc]) => sc >= Math.max(3, top * 0.5))
    .slice(0, 3)
    .map(([id]) => DUAS.find((d) => d.id === id))
    .filter((d): d is Dua => !!d);
  return { duas, concept: concepts.length > 0, recited: duas.length > 0 && (soundHits.get(duas[0].id) ?? 0) >= 2 };
}

/** Turkish suffixes: "namazı" should find "namaz", "rekâtları" "rekât". */
function stemHit(text: string, w: string): boolean {
  if (text.includes(w)) return true;
  if (w.length >= 5 && text.includes(w.slice(0, -1))) return true;
  return w.length >= 7 && text.includes(w.slice(0, -2));
}

function findTopic(q: Query, lang: ChatLang): { entry: LearnEntry; score: number } | null {
  const searchLang = contentLang(lang);
  let words = contentWords(q, lang);
  if (lang === 'ar' || lang === 'de' || lang === 'fr') {
    words = LEARN_TERMS.filter((t) => anyWord(q, t.words[lang])).map((t) => t.en);
  }
  if (words.length === 0) return null;
  let best: { entry: LearnEntry; score: number } | null = null;
  for (const entry of LEARN_ENTRIES) {
    const body = fold(topicText(entry, searchLang));
    const title = fold(`${entry.topic.title[searchLang]} ${(entry.topic.tags?.[searchLang] ?? []).join(' ')}`);
    let score = 0;
    let found = 0;
    for (const w of words) {
      if (stemHit(title, w)) score += 3;
      if (stemHit(body, w)) {
        score += 1;
        found += 1;
      }
    }
    // A subcategory named exactly like the query ("zakat", "abdest") holds its basic topics; on a tie the earlier topic wins
    if (words.includes(fold(entry.subcategory.title[searchLang]))) score += 0.5;
    if (found >= Math.max(1, Math.ceil(words.length / 2)) && (!best || score > best.score)) best = { entry, score };
  }
  return best && best.score >= 2 ? best : null;
}

function knowledgeText(id: string | undefined, lang: ChatLang): string | null {
  if (!id || (lang !== 'tr' && lang !== 'en')) return null;
  const entry = APP_KNOWLEDGE.find((e) => e.id === id);
  return entry ? entry[lang] : null;
}

/** Old general Q&A, kept for tr/en questions nothing else matched */
function legacyAnswer(q: Query, lang: ChatLang): string | null {
  if (lang !== 'tr' && lang !== 'en') return null;
  let best: { score: number; text: string } | null = null;
  for (const entry of ISLAMIC_KNOWLEDGE) {
    const score = entry.keywords.reduce((s, k) => s + (hasWord(q, k) ? (k.length > 4 ? 3 : 2) : 0), 0);
    if (score >= 3 && (!best || score > best.score)) best = { score, text: entry[lang] };
  }
  return best?.text ?? null;
}

// ─── Answer ──────────────────────────────────────────────────────────────────

const featureAction = (f: Feature, lang: ChatLang): AssistantAction => ({ label: f.name[lang], icon: f.icon, target: f.target });

function surahTarget(s: SurahName, ctx: AssistantContext, lang: ChatLang, startAyah?: number): AssistantTarget {
  const name = lang === 'tr' ? s.tr : lang === 'ar' ? s.ar : s.en;
  return { screen: 'QuranReader', params: { surahNumber: s.number, edition: ctx.quranEdition, surahName: name, ...(startAyah ? { startAyah } : {}) } };
}

export function getAIWelcome(lang: AppLanguage): string {
  return lang === 'tr'
    ? 'Selamün aleyküm! Ben Islamic+ asistanıyım. Bir sayfayı, sureyi ya da amaca uygun bir duayı isteyin; sizi doğrudan oraya götüreyim. Türkçe, İngilizce, Arapça, Almanca ve Fransızca yazabilirsiniz. Kişisel fetva vermem.'
    : 'Assalamu alaikum! I’m the Islamic+ assistant. Ask for a page, a surah or a dua for any purpose and I’ll take you straight there. You can write in English, Turkish, Arabic, German or French. I don’t give personal fatwas.';
}

export function askAssistant(raw: string, ctx: AssistantContext): AssistantReply {
  const lang = detectLanguage(raw, ctx.appLang);
  const q = makeQuery(raw);
  const reply = (text: string, actions: AssistantAction[] = [], autoNavigate?: AssistantTarget): AssistantReply => ({ lang, text, actions, autoNavigate });

  if (!q.folded) return reply(T.empty[lang]);
  if (anyWord(q, HELP_WORDS)) return reply(T.help[lang]);

  const wantsOpen = anyWord(q, OPEN_VERBS[lang]) || anyWord(q, OPEN_VERBS.en);
  const wantsExplain = anyWord(q, EXPLAIN_WORDS[lang]);
  const saysDua = Object.values(DUA_WORDS).some((w) => anyWord(q, w));
  const feature = findFeature(q);

  // 1. Ayat al-Kursi and surahs
  if (AYAT_KURSI.some((a) => hasWord(q, a))) {
    const target = surahTarget(SURAHS[1], ctx, lang, 255);
    return reply(T.ayatKursi[lang], [{ label: lang === 'tr' ? 'Bakara 255' : 'Al-Baqarah 2:255', icon: 'book-outline', target }], target);
  }
  const surah = saysDua ? null : findSurah(q, lang);
  if (surah) {
    const s = surah.surah;
    const name = lang === 'tr' ? s.tr : lang === 'ar' ? s.ar : s.en;
    const target = surahTarget(s, ctx, lang);
    const action = { label: name, icon: 'book-outline', target };
    return surah.explicit
      ? reply(fill(T.surahOpening[lang], { name, n: s.number }), [action], target)
      : reply(fill(T.surahOffer[lang], { name, n: s.number }), [action]);
  }

  // A topic whose title matches well ("abdesti bozan durumlar") beats a purpose word inside it
  const topic = findTopic(q, lang);
  const topicFirst = !saysDua && topic !== null && (topic.score >= 6 || (wantsExplain && topic.score >= 4));

  // 2. Duas by purpose or name. A long, specific page phrase ("zikir istatistikleri") wins over the word "zikir".
  const strongFeature = feature && feature.weight >= 5 && feature.feature.id !== 'duas';
  const featureWins = feature && feature.weight >= 8 && feature.feature.id !== 'duas';
  if (!topicFirst && !featureWins && (saysDua || !strongFeature)) {
    const { duas, concept, recited } = findDuas(q, lang);
    if (duas.length > 0 && (saysDua || concept || recited)) {
      const [top, ...rest] = duas;
      const cl = contentLang(lang);
      const parts = [fill(T.duaFound[lang], { title: top.title[cl] })];
      if (lang === 'ar') parts.push(top.arabic);
      parts.push(`${clip(top.translation[cl], 260)} ${T.meaningEn[lang]}`.trim());
      if (top.repeat && top.repeat > 1) parts.push(fill(T.repeat[lang], { n: top.repeat }));
      const explicit = saysDua || wantsOpen || wantsExplain;
      parts.push(explicit ? T.duaGoing[lang] : T.duaPick[lang]);
      if (rest.length) parts.push(T.others[lang]);
      const actions = duas.map((d) => ({ label: d.title[cl], icon: 'hand-left-outline', target: { screen: 'DuaDetail', params: { duaId: d.id } } }));
      return reply(parts.join('\n\n'), actions, explicit ? actions[0].target : undefined);
    }
  }

  // 3. Live answer: next prayer
  if (feature?.feature.id === 'prayerTimes' && !wantsOpen) {
    const action = featureAction(feature.feature, lang);
    if (!ctx.nextPrayer) return reply(T.noLocation[lang], [action]);
    return reply(fill(T.nextPrayer[lang], { name: PRAYER_NAMES[ctx.nextPrayer.name][lang], time: ctx.nextPrayer.time }), [action]);
  }

  // 4. Explicit "open X"
  if (feature && wantsOpen) {
    return reply(fill(T.opening[lang], { name: feature.feature.name[lang] }), [featureAction(feature.feature, lang)], feature.feature.target);
  }

  // 5. Learn topics ("what breaks the fast?")
  if (topic && (topicFirst || wantsExplain || !feature || feature.weight < 5)) {
    const { entry: found } = topic;
    const cl = contentLang(lang);
    const first = found.topic.sections[0];
    const detail = first?.text?.[cl] ?? (first?.bullets?.[cl] ?? []).slice(0, 4).map((b) => `• ${b}`).join('\n');
    const text = [fill(T.topic[lang], { title: found.topic.title[cl] }), found.topic.summary[cl], clip(detail, 420), T.topicMore[lang]]
      .filter(Boolean)
      .join('\n\n');
    const actions: AssistantAction[] = [{ label: T.openTopic[lang], icon: 'school-outline', target: { screen: 'EducationDetail', params: { topicId: found.topic.id } } }];
    if (feature) actions.push(featureAction(feature.feature, lang));
    return reply(text, actions, wantsOpen ? actions[0].target : undefined);
  }

  // 6. A feature was mentioned: explain it and offer the page
  if (feature) {
    const how = knowledgeText(feature.feature.knowledgeId, lang);
    return reply(how ?? fill(T.canOpen[lang], { name: feature.feature.name[lang] }), [featureAction(feature.feature, lang)]);
  }

  if (anyWord(q, GREET_WORDS)) return reply(T.greeting[lang]);

  const legacy = legacyAnswer(q, lang);
  if (legacy) return reply(legacy);

  return { ...reply(T.fallback[lang]), matched: false };
}
