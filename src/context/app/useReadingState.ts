import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadHadithProgress, loadQuranProgress, onReadingProgressChanged } from '../../services/readingProgress';
import { scheduleReadingProgressCloudSync } from '../../services/readingProgressCloud';
import type { AuthSession, HadithProgress, QuranProgress } from '../../types';
import type { ReadingSlice } from './slices';

const EMPTY_PROGRESS = { lastRead: null, bookmarks: [] };

/** Quran and hadith reading progress of the active family member. */
export function useReadingState(activeFamilyMemberId: string | null, session: AuthSession | null) {
  const [quranProgress, setQuranProgress] = useState<QuranProgress>(EMPTY_PROGRESS);
  const [hadithProgress, setHadithProgress] = useState<HadithProgress>(EMPTY_PROGRESS);

  const setReadingProgress = useCallback((quran: QuranProgress, hadith: HadithProgress) => {
    setQuranProgress(quran);
    setHadithProgress(hadith);
  }, []);

  const loadReadingProgress = useCallback(
    async (memberId: string | null) => {
      const [qp, hp] = await Promise.all([loadQuranProgress(memberId), loadHadithProgress(memberId)]);
      setReadingProgress(qp, hp);
    },
    [setReadingProgress]
  );

  const refreshReadingProgress = useCallback(
    () => loadReadingProgress(activeFamilyMemberId),
    [loadReadingProgress, activeFamilyMemberId]
  );

  const signedIn = !!session && !session.isGuest;
  useEffect(() => {
    return onReadingProgressChanged((memberId) => {
      if (signedIn) scheduleReadingProgressCloudSync(memberId);
    });
  }, [signedIn]);

  const readingValue = useMemo<ReadingSlice>(
    () => ({ quranProgress, hadithProgress, refreshReadingProgress }),
    [quranProgress, hadithProgress, refreshReadingProgress]
  );

  return { setReadingProgress, loadReadingProgress, readingValue };
}
