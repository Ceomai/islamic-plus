import type { HadithProgress, QuranProgress } from '../types';
import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { isCloudUserActive, profileScope as cloudProfileScope } from './cloudUser';
import {
  loadHadithProgress,
  loadQuranProgress,
  saveHadithProgress,
  saveQuranProgress,
} from './readingProgress';

const SYNC_DEBOUNCE_MS = 2500;
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function progressTimestamp(progress: { lastRead?: { updatedAt: string } | null; updatedAt?: string }): string {
  return progress.updatedAt ?? progress.lastRead?.updatedAt ?? '1970-01-01T00:00:00.000Z';
}

function mergeQuranProgress(local: QuranProgress, remote: QuranProgress): QuranProgress {
  const useLocalLast = progressTimestamp(local) >= progressTimestamp(remote);
  const bookmarkMap = new Map<string, (typeof local.bookmarks)[0]>();

  for (const b of [...remote.bookmarks, ...local.bookmarks]) {
    const key = `${b.surahNumber}:${b.ayahNumber}:${b.edition}`;
    const existing = bookmarkMap.get(key);
    if (!existing || b.createdAt > existing.createdAt) {
      bookmarkMap.set(key, b);
    }
  }

  const merged: QuranProgress = {
    lastRead: useLocalLast ? local.lastRead : remote.lastRead,
    bookmarks: [...bookmarkMap.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50),
    updatedAt: new Date().toISOString(),
  };
  return merged;
}

function mergeHadithProgress(local: HadithProgress, remote: HadithProgress): HadithProgress {
  const useLocalLast = progressTimestamp(local) >= progressTimestamp(remote);
  const bookmarkMap = new Map<string, (typeof local.bookmarks)[0]>();

  for (const b of [...remote.bookmarks, ...local.bookmarks]) {
    const key = `${b.collectionId}:${b.itemIndex}`;
    const existing = bookmarkMap.get(key);
    if (!existing || b.createdAt > existing.createdAt) {
      bookmarkMap.set(key, b);
    }
  }

  return {
    lastRead: useLocalLast ? local.lastRead : remote.lastRead,
    bookmarks: [...bookmarkMap.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50),
    updatedAt: new Date().toISOString(),
  };
}

async function fetchRemoteProgress(memberId: string | null): Promise<{
  quran: QuranProgress;
  hadith: HadithProgress;
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_reading_progress', {
    p_profile_scope: cloudProfileScope(memberId),
  });

  if (error) {
    console.warn('[reading-cloud] pull failed:', error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    quran: (row.quran_progress as QuranProgress) ?? { lastRead: null, bookmarks: [] },
    hadith: (row.hadith_progress as HadithProgress) ?? { lastRead: null, bookmarks: [] },
  };
}

/** Pull remote → merge with local → save local. Call on login / app start. */
export async function syncReadingProgressFromCloud(
  memberId: string | null
): Promise<{ quran: QuranProgress; hadith: HadithProgress }> {
  const [localQuran, localHadith] = await Promise.all([
    loadQuranProgress(memberId),
    loadHadithProgress(memberId),
  ]);

  if (!(await isCloudUserActive())) {
    return { quran: localQuran, hadith: localHadith };
  }

  const remote = await fetchRemoteProgress(memberId);
  if (!remote) {
    await pushReadingProgressNow(memberId);
    return { quran: localQuran, hadith: localHadith };
  }

  const quran = mergeQuranProgress(localQuran, remote.quran);
  const hadith = mergeHadithProgress(localHadith, remote.hadith);

  await Promise.all([
    saveQuranProgress(memberId, quran),
    saveHadithProgress(memberId, hadith),
  ]);

  await pushReadingProgressNow(memberId);
  return { quran, hadith };
}

/** Debounced push — avoids DB write on every ayah tap */
export function scheduleReadingProgressCloudSync(memberId: string | null): void {
  if (!isSupabaseConfigured) return;

  const scope = cloudProfileScope(memberId);
  const existing = syncTimers.get(scope);
  if (existing) clearTimeout(existing);

  syncTimers.set(
    scope,
    setTimeout(() => {
      syncTimers.delete(scope);
      void pushReadingProgressNow(memberId);
    }, SYNC_DEBOUNCE_MS)
  );
}

export async function pushReadingProgressNow(memberId: string | null): Promise<void> {
  if (!(await isCloudUserActive())) return;

  const supabase = getSupabase();
  if (!supabase) return;

  const [quran, hadith] = await Promise.all([
    loadQuranProgress(memberId),
    loadHadithProgress(memberId),
  ]);

  const { error } = await supabase.rpc('upsert_reading_progress', {
    p_profile_scope: cloudProfileScope(memberId),
    p_quran: quran,
    p_hadith: hadith,
  });

  if (error) {
    console.warn('[reading-cloud] push failed:', error.message);
  }
}

/** Drop all pending pushes without sending them (account deleted). */
export function cancelReadingProgressCloudSync(): void {
  syncTimers.forEach((timer) => clearTimeout(timer));
  syncTimers.clear();
}

export async function flushReadingProgressCloudSync(memberId: string | null): Promise<void> {
  const scope = cloudProfileScope(memberId);
  const existing = syncTimers.get(scope);
  if (existing) {
    clearTimeout(existing);
    syncTimers.delete(scope);
  }
  await pushReadingProgressNow(memberId);
}
