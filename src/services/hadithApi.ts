import AsyncStorage from '@react-native-async-storage/async-storage';
import HADITH_INDEX from '../data/hadithIndex.json';
import type { AppLanguage } from '../types';

/**
 * Hadith text from fawazahmed0/hadith-api (public domain), one chapter per request.
 * Chapters never change, so a cached copy is used first and works offline.
 */
const BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';
const CACHE_PREFIX = '@hadithcache/';

export interface HadithSection {
  n: number;
  name: string;
  first: number;
  last: number;
}

export interface HadithCollectionInfo {
  id: string;
  name: string;
  /** A Turkish translation exists */
  tr: boolean;
  total: number;
  sections: HadithSection[];
}

export interface HadithItem {
  number: number;
  text: string;
  grades: { name: string; grade: string }[];
}

export const HADITH_LIBRARY = HADITH_INDEX as HadithCollectionInfo[];

const TR_NAMES: Record<string, string> = {
  nawawi: 'Nevevî – Kırk Hadis',
  qudsi: 'Kudsî Hadisler (40)',
  bukhari: 'Sahîh-i Buhârî',
  muslim: 'Sahîh-i Müslim',
  abudawud: 'Sünen-i Ebû Dâvûd',
  tirmidhi: 'Sünen-i Tirmizî',
  nasai: 'Sünen-i Nesâî',
  ibnmajah: 'Sünen-i İbn Mâce',
  malik: 'Muvatta (İmam Mâlik)',
};

export function hadithCollectionName(c: HadithCollectionInfo, lang: AppLanguage): string {
  return lang === 'tr' ? TR_NAMES[c.id] ?? c.name : c.name;
}

/** Turkish text where the collection has it, otherwise English; 'ara' for the Arabic original */
export function hadithEdition(c: HadithCollectionInfo, lang: AppLanguage | 'ara'): string {
  if (lang === 'ara') return `ara-${c.id}`;
  return `${lang === 'tr' && c.tr ? 'tur' : 'eng'}-${c.id}`;
}

export function sectionOfHadith(c: HadithCollectionInfo, hadithNumber: number): HadithSection | undefined {
  return c.sections.find((s) => hadithNumber >= s.first && hadithNumber <= s.last);
}

interface SectionResponse {
  hadiths: { hadithnumber: number; text: string; grades?: { name: string; grade: string }[] }[];
}

export async function fetchHadithSection(edition: string, section: number): Promise<HadithItem[]> {
  const key = `${CACHE_PREFIX}${edition}/${section}`;
  const cached = await AsyncStorage.getItem(key).catch(() => null);
  if (cached) return JSON.parse(cached) as HadithItem[];

  const res = await fetch(`${BASE}/${edition}/sections/${section}.min.json`);
  if (!res.ok) throw new Error(`Hadith HTTP ${res.status}`);
  const json = (await res.json()) as SectionResponse;
  const items = json.hadiths
    .filter((h) => h.text?.trim())
    .map((h) => ({ number: h.hadithnumber, text: h.text.trim(), grades: h.grades ?? [] }));
  void AsyncStorage.setItem(key, JSON.stringify(items)).catch(() => undefined);
  return items;
}
