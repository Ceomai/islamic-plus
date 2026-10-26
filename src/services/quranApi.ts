import AsyncStorage from '@react-native-async-storage/async-storage';
import { QURAN_ARABIC_EDITION, QURAN_TRANSLITERATION_EDITION } from '../constants/defaults';

const BASE = 'https://api.alquran.cloud/v1';
/** Device-wide cache (not per account): Quran text is the same for everyone */
const CACHE_PREFIX = '@qurancache/';

export interface SurahListItem {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation?: string;
  numberOfAyahs: number;
  revelationType?: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
}

/** One ayah with every text the active reader view needs */
export interface ReaderAyah {
  /** Global ayah number (1–6236), used for recitation audio */
  number: number;
  numberInSurah: number;
  arabic?: string;
  transliteration?: string;
  translation?: string;
}

async function getJsonWithCache<T>(url: string, cacheKey: string): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as T;
    void AsyncStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(json)).catch(() => undefined);
    return json;
  } catch (e) {
    const cached = await AsyncStorage.getItem(CACHE_PREFIX + cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached) as T;
    throw e;
  }
}

export async function fetchSurahList(_edition = 'en'): Promise<SurahListItem[]> {
  const json = await getJsonWithCache<{ data?: SurahListItem[] }>(`${BASE}/surah`, 'surah-list');
  return json.data ?? [];
}

export async function fetchSurah(
  surahNumber: number,
  edition = 'en.sahih'
): Promise<{ ayahs: Ayah[]; surah: SurahListItem }> {
  const json = await getJsonWithCache<{ data: SurahListItem & { ayahs: Ayah[] } }>(
    `${BASE}/surah/${surahNumber}/${edition}`,
    `surah-${surahNumber}-${edition}`
  );
  return {
    surah: json.data,
    ayahs: (json.data?.ayahs ?? []).map((a) => ({ number: a.number, text: a.text, numberInSurah: a.numberInSurah })),
  };
}

const BISMILLAH_UTHMANI = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/** Letters only: the API orders stacked marks (shadda + fatha) differently from typed text */
const stripMarks = (s: string) => s.replace(/[ً-ٰٟۖ-ۭ]/g, '');
const BISMILLAH_LETTERS = stripMarks(BISMILLAH_UTHMANI);

/** Removes the Basmala the API prepends to ayah 1, so it can be shown once as the surah header */
function stripLeadingBismillah(text: string): string {
  const words = text.split(' ');
  if (words.length > 4 && stripMarks(words.slice(0, 4).join(' ')) === BISMILLAH_LETTERS) {
    return words.slice(4).join(' ').trim();
  }
  return text;
}

/**
 * Fetches the Arabic text, transliteration and/or a translation of a surah in one request
 * and merges them per ayah. Cached on the device so a surah opened once can be read offline.
 */
export async function fetchSurahReading(
  surahNumber: number,
  options: { arabic: boolean; transliteration: boolean; translation: string | null }
): Promise<{ surah: SurahListItem; ayahs: ReaderAyah[]; hasBismillahHeader: boolean }> {
  const editions = [
    options.arabic ? QURAN_ARABIC_EDITION : null,
    options.transliteration ? QURAN_TRANSLITERATION_EDITION : null,
    options.translation,
  ].filter(Boolean) as string[];

  const list = editions.join(',');
  const json = await getJsonWithCache<{
    data: (SurahListItem & { edition: { identifier: string }; ayahs: Ayah[] })[];
  }>(`${BASE}/surah/${surahNumber}/editions/${list}`, `reading-${surahNumber}-${list}`);

  const byEdition = new Map(json.data.map((d) => [d.edition.identifier, d.ayahs]));
  const first = json.data[0];
  // Surah 1 counts the Basmala as ayah 1; Surah 9 has none. Elsewhere the API prefixes ayah 1 with it.
  const hasBismillahHeader = surahNumber !== 1 && surahNumber !== 9;

  // The API prefixes some first ayahs with a byte-order mark
  const clean = (s: string | undefined) => s?.replace(/^﻿/, '');

  const ayahs: ReaderAyah[] = (first?.ayahs ?? []).map((a, i) => {
    let arabic = clean(byEdition.get(QURAN_ARABIC_EDITION)?.[i]?.text);
    if (arabic && hasBismillahHeader && a.numberInSurah === 1) arabic = stripLeadingBismillah(arabic);
    return {
      number: a.number,
      numberInSurah: a.numberInSurah,
      arabic,
      transliteration: clean(byEdition.get(QURAN_TRANSLITERATION_EDITION)?.[i]?.text),
      translation: options.translation ? clean(byEdition.get(options.translation)?.[i]?.text) : undefined,
    };
  });

  const { edition: _e, ayahs: _a, ...surah } = first ?? ({} as never);
  return { surah: surah as SurahListItem, ayahs, hasBismillahHeader };
}

export async function searchQuran(query: string, edition = 'en'): Promise<string[]> {
  const res = await fetch(`${BASE}/search/${encodeURIComponent(query)}/all/${edition}`);
  const json = await res.json();
  return (json.data?.matches ?? []).slice(0, 20).map(
    (m: { surah: { englishName: string }; numberInSurah: number }) => `${m.surah.englishName} ${m.numberInSurah}`
  );
}

export { BISMILLAH_UTHMANI };
