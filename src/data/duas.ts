import type { Ionicons } from '@expo/vector-icons';
import type { AppLanguage } from '../types';
import library from './duaLibrary.json';

/**
 * Dua library. Content lives in duaLibrary.json; every Arabic text there is checked against
 * Hisnul Muslim or the Quran by `node scripts/verify-duas.js`, which also fills in audio URLs.
 */
export type DuaCategory =
  | 'morning_evening'
  | 'sleep'
  | 'home'
  | 'purification'
  | 'mosque'
  | 'food'
  | 'travel'
  | 'distress'
  | 'health'
  | 'forgiveness'
  | 'family'
  | 'provision'
  | 'knowledge'
  | 'protection'
  | 'nature'
  | 'loss'
  | 'daily'
  | 'dhikr'
  | 'quranic';

export interface Dua {
  id: string;
  category: DuaCategory;
  title: Record<AppLanguage, string>;
  arabic: string;
  transliteration: string;
  translation: Record<AppLanguage, string>;
  /** Purpose keywords used by search ("sınav", "anxiety", …) */
  tags: Record<AppLanguage, string[]>;
  repeat?: number;
  source: { type: 'hisn'; chapter?: string } | { type: 'quran'; ref: string };
  audioUrl?: string;
  verified?: boolean;
}

/**
 * The Hisnul Muslim recordings come from Alsarmad/Adhkar-json, which has no licence file yet
 * (docs/store/DUA-AUDIO-PERMISSION.md). If permission is refused, set this to false: those duas
 * become text-only, while Quran duas keep their recitation audio.
 */
export const ADHKAR_AUDIO_ENABLED = true;
const ADHKAR_AUDIO_HOST = 'Alsarmad/Adhkar-json';

export const DUAS = (library as Dua[]).map((d) =>
  !ADHKAR_AUDIO_ENABLED && d.audioUrl?.includes(ADHKAR_AUDIO_HOST) ? { ...d, audioUrl: undefined } : d
);

/** Display order of categories, each with an icon for chips and list rows */
export const DUA_CATEGORIES: { id: DuaCategory; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'morning_evening', icon: 'sunny-outline' },
  { id: 'distress', icon: 'heart-half-outline' },
  { id: 'health', icon: 'medkit-outline' },
  { id: 'forgiveness', icon: 'refresh-circle-outline' },
  { id: 'protection', icon: 'shield-checkmark-outline' },
  { id: 'family', icon: 'people-outline' },
  { id: 'provision', icon: 'briefcase-outline' },
  { id: 'knowledge', icon: 'school-outline' },
  { id: 'travel', icon: 'airplane-outline' },
  { id: 'sleep', icon: 'moon-outline' },
  { id: 'food', icon: 'restaurant-outline' },
  { id: 'home', icon: 'home-outline' },
  { id: 'purification', icon: 'water-outline' },
  { id: 'mosque', icon: 'business-outline' },
  { id: 'nature', icon: 'rainy-outline' },
  { id: 'loss', icon: 'flower-outline' },
  { id: 'daily', icon: 'sparkles-outline' },
  { id: 'dhikr', icon: 'ellipse-outline' },
  { id: 'quranic', icon: 'book-outline' },
];

export function getDuaCategoryIcon(category: DuaCategory): keyof typeof Ionicons.glyphMap {
  return DUA_CATEGORIES.find((c) => c.id === category)?.icon ?? 'heart-outline';
}

/** Lower-case, strip Turkish diacritics and punctuation so "sınav" matches "SINAV" and "sinav". */
export function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/[âà]/g, 'a')
    .replace(/[îì]/g, 'i')
    .replace(/[ûù]/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sound-alike key for Arabic transliterations, so Turkish and English spellings meet:
 * "euzu bike" / "a'udhu bika" → "auzu bika", "Allahümme" / "Allahumma" → "alahuma", "rabbena" / "rabbana" → "rabana".
 */
export function translitKey(text: string): string {
  return normalizeSearch(text.replace(/['’ʿʾ`´]/g, '').replace(/-/g, ' '))
    .replace(/(dh|zh|dz)/g, 'z')
    .replace(/th/g, 's')
    .replace(/sh/g, 's')
    .replace(/kh/g, 'h')
    .replace(/gh/g, 'g')
    .replace(/q/g, 'k')
    .replace(/w/g, 'v')
    .replace(/ee/g, 'i')
    .replace(/(oo|ou)/g, 'u')
    .replace(/e/g, 'a')
    .replace(/o/g, 'u')
    .replace(/([a-z])\1+/g, '$1')
    // Case endings come and go ("bismillah" / "bismillahi", "hamdih" / "hamdihi")
    .replace(/\b([a-z]{4,})[aiu]\b/g, '$1');
}

const TRANSLIT_KEYS = new Map<string, string>();
/** Cached sound-alike key of a dua's transliteration, without spaces ("bi-hamdih" and "bihamdihi" meet) */
export function duaTranslitKey(d: Dua): string {
  let key = TRANSLIT_KEYS.get(d.id);
  if (key === undefined) {
    key = translitKey(d.transliteration).replace(/ /g, '');
    TRANSLIT_KEYS.set(d.id, key);
  }
  return key;
}

/** Whether a typed word (any spelling) appears in the dua's transliteration */
export function translitHit(d: Dua, word: string): boolean {
  const key = translitKey(word).replace(/ /g, '');
  return key.length >= 4 && duaTranslitKey(d).includes(key);
}

/**
 * Finds duas for a need ("sınav", "borç", "hasta", "anxiety"). Tags weigh most, then the title,
 * then the meaning; every word of the query must match somewhere. Results are best match first.
 */
export function searchDuas(query: string, lang: AppLanguage, categoryLabel: (c: DuaCategory) => string): Dua[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (words.length === 0) return DUAS;

  const scored = DUAS.map((d) => {
    const tags = normalizeSearch([...d.tags.tr, ...d.tags.en].join(' '));
    const title = normalizeSearch(`${d.title.tr} ${d.title.en} ${categoryLabel(d.category)}`);
    const body = normalizeSearch(`${d.translation[lang]} ${d.transliteration}`);
    let score = 0;
    for (const w of words) {
      // Typed transliteration ("rabbena atina") matches whatever spelling the dua uses
      const sound = translitHit(d, w);
      const s = (tags.includes(w) ? 5 : 0) + (title.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : sound ? 2 : 0);
      if (s === 0) return { d, score: 0 };
      score += s;
    }
    return { d, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.d);
}

/** Purpose shortcuts shown above the list; each runs a search */
export const DUA_PURPOSES: { tr: string; en: string; query: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { tr: 'Sıkıntı ve kaygı', en: 'Anxiety', query: 'kaygı', icon: 'heart-half-outline' },
  { tr: 'Şifa', en: 'Healing', query: 'şifa', icon: 'medkit-outline' },
  { tr: 'Sınav', en: 'Exams', query: 'sınav', icon: 'school-outline' },
  { tr: 'Borç ve rızık', en: 'Debt & income', query: 'rızık', icon: 'wallet-outline' },
  { tr: 'Tövbe', en: 'Repentance', query: 'tövbe', icon: 'refresh-circle-outline' },
  { tr: 'Anne baba', en: 'Parents', query: 'anne baba', icon: 'people-outline' },
  { tr: 'Yolculuk', en: 'Travel', query: 'yolculuk', icon: 'airplane-outline' },
  { tr: 'Korunma', en: 'Protection', query: 'korunma', icon: 'shield-checkmark-outline' },
];
