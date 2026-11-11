import { useCallback, useEffect, useState } from 'react';
import { fetchHadithSection, hadithEdition, type HadithCollectionInfo, type HadithItem } from '../services/hadithApi';
import type { AppLanguage } from '../types';

export type HadithSectionStatus = 'loading' | 'ready' | 'error';

interface LoadResult {
  /** The request this answers; a different key means a newer request is still loading */
  key: string;
  items: HadithItem[];
  failed: boolean;
}

/**
 * One chapter of a hadith collection in the reader's language, plus its Arabic text on demand.
 * Items from the last answer stay while a newer request runs or fails.
 */
export function useHadithSection(collection: HadithCollectionInfo, sectionN: number, lang: AppLanguage) {
  const [attempt, setAttempt] = useState(0);
  const key = `${collection.id}|${sectionN}|${lang}|${attempt}`;
  const [result, setResult] = useState<LoadResult>({ key: '', items: [], failed: false });

  useEffect(() => {
    let alive = true;
    fetchHadithSection(hadithEdition(collection, lang), sectionN)
      .then((items) => {
        if (alive) setResult({ key, items, failed: false });
      })
      .catch(() => {
        if (alive) setResult((prev) => ({ ...prev, key, failed: true }));
      });
    return () => {
      alive = false;
    };
  }, [key, collection, sectionN, lang]);

  const [showArabic, setShowArabic] = useState(false);
  const [arabic, setArabic] = useState<Record<number, string>>({});
  const [arabicFailed, setArabicFailed] = useState(false);

  // Each time the Arabic is switched on it is fetched again, so an earlier failure is cleared here
  const toggleArabic = useCallback(() => {
    setArabicFailed(false);
    setShowArabic((v) => !v);
  }, []);

  useEffect(() => {
    if (!showArabic) return;
    let alive = true;
    fetchHadithSection(hadithEdition(collection, 'ara'), sectionN)
      .then((list) => alive && setArabic(Object.fromEntries(list.map((h) => [h.number, h.text]))))
      .catch(() => alive && setArabicFailed(true));
    return () => {
      alive = false;
    };
  }, [collection, sectionN, showArabic]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const status: HadithSectionStatus = result.key !== key ? 'loading' : result.failed ? 'error' : 'ready';

  return { items: result.items, status, retry, showArabic, toggleArabic, arabic, arabicFailed };
}
