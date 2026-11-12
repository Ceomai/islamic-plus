import { useCallback, useEffect, useState } from 'react';
import { fetchSurahReading, type ReaderAyah } from '../services/quranApi';

/** Which parts of each ayah the current reader view shows */
export interface SurahReadingNeeds {
  arabic: boolean;
  transliteration: boolean;
  translation: string | null;
}

interface LoadResult {
  /** The request this result answers; a different key means a newer request is still loading */
  key: string;
  ayahs: ReaderAyah[];
  hasBismillah: boolean;
  failed: boolean;
}

/**
 * Loads a surah with the parts the view needs. Only the latest request may fill the screen:
 * switching views quickly let an older, slower answer arrive last and show the wrong parts.
 * `onLoaded` gets the ayah count of each successful load (keep it stable: it is an effect dependency).
 */
export function useSurahReading(surahNumber: number, needs: SurahReadingNeeds, onLoaded: (ayahCount: number) => void) {
  const [attempt, setAttempt] = useState(0);
  const key = `${surahNumber}|${needs.arabic}|${needs.transliteration}|${needs.translation}|${attempt}`;
  const [result, setResult] = useState<LoadResult>({ key: '', ayahs: [], hasBismillah: false, failed: false });

  useEffect(() => {
    let latest = true;
    fetchSurahReading(surahNumber, needs)
      .then((r) => {
        if (!latest) return;
        onLoaded(r.ayahs.length);
        setResult({ key, ayahs: r.ayahs, hasBismillah: r.hasBismillahHeader, failed: r.ayahs.length === 0 });
      })
      .catch(() => {
        if (latest) setResult((prev) => ({ ...prev, key, failed: true }));
      });
    return () => {
      latest = false;
    };
  }, [key, surahNumber, needs, onLoaded]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const loading = result.key !== key;

  return {
    ayahs: result.ayahs,
    hasBismillah: result.hasBismillah,
    loading,
    failed: !loading && result.failed,
    retry,
  };
}
