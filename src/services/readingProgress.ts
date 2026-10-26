import type {
  HadithBookmark,
  HadithProgress,
  QuranBookmark,
  QuranProgress,
} from '../types';
import { getJson, setJson, storageKeys } from './storage';

type ProgressChangeListener = (memberId: string | null) => void;
const progressListeners = new Set<ProgressChangeListener>();

/** Cloud sync service registers here — avoids circular imports */
export function onReadingProgressChanged(listener: ProgressChangeListener): () => void {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

function notifyProgressChanged(memberId: string | null): void {
  progressListeners.forEach((listener) => listener(memberId));
}

function scopedKey(base: string, memberId: string | null): string {
  return `${base}::${memberId ?? 'default'}`;
}

const emptyQuran: QuranProgress = { lastRead: null, bookmarks: [] };
const emptyHadith: HadithProgress = { lastRead: null, bookmarks: [] };

function stampProgress<T extends { updatedAt?: string }>(data: T): T {
  return { ...data, updatedAt: new Date().toISOString() };
}

async function persistQuran(memberId: string | null, data: QuranProgress): Promise<void> {
  const stamped = stampProgress(data);
  await setJson(scopedKey(storageKeys.quranProgress, memberId), stamped);
  notifyProgressChanged(memberId);
}

async function persistHadith(memberId: string | null, data: HadithProgress): Promise<void> {
  const stamped = stampProgress(data);
  await setJson(scopedKey(storageKeys.hadithProgress, memberId), stamped);
  notifyProgressChanged(memberId);
}

export async function loadQuranProgress(memberId: string | null): Promise<QuranProgress> {
  return getJson(scopedKey(storageKeys.quranProgress, memberId), emptyQuran);
}

export async function saveQuranProgress(memberId: string | null, data: QuranProgress): Promise<void> {
  await persistQuran(memberId, data);
}

export async function updateQuranLastRead(
  memberId: string | null,
  surahNumber: number,
  edition: string,
  surahName: string,
  ayahNumber: number
): Promise<QuranProgress> {
  const current = await loadQuranProgress(memberId);
  const next: QuranProgress = {
    ...current,
    lastRead: {
      surahNumber,
      edition,
      surahName,
      ayahNumber,
      updatedAt: new Date().toISOString(),
    },
  };
  await saveQuranProgress(memberId, next);
  return next;
}

export async function addQuranBookmark(
  memberId: string | null,
  bookmark: Omit<QuranBookmark, 'id' | 'createdAt'>
): Promise<QuranProgress> {
  const current = await loadQuranProgress(memberId);
  const entry: QuranBookmark = {
    ...bookmark,
    id: `bm-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const next: QuranProgress = {
    ...current,
    bookmarks: [
      entry,
      ...current.bookmarks.filter(
        (b) => b.ayahNumber !== bookmark.ayahNumber || b.surahNumber !== bookmark.surahNumber
      ),
    ].slice(0, 50),
  };
  await persistQuran(memberId, next);
  return next;
}

export async function loadHadithProgress(memberId: string | null): Promise<HadithProgress> {
  return getJson(scopedKey(storageKeys.hadithProgress, memberId), emptyHadith);
}

export async function saveHadithProgress(memberId: string | null, data: HadithProgress): Promise<void> {
  await persistHadith(memberId, data);
}

export async function updateHadithLastRead(
  memberId: string | null,
  collectionId: string,
  collectionName: string,
  itemIndex: number
): Promise<HadithProgress> {
  const current = await loadHadithProgress(memberId);
  const next: HadithProgress = {
    ...current,
    lastRead: {
      collectionId,
      collectionName,
      itemIndex,
      updatedAt: new Date().toISOString(),
    },
  };
  await persistHadith(memberId, next);
  return next;
}

export async function addHadithBookmark(
  memberId: string | null,
  collectionId: string,
  collectionName: string,
  itemIndex: number,
  label: string
): Promise<HadithProgress> {
  const current = await loadHadithProgress(memberId);
  const entry: HadithBookmark = {
    id: `bm-${Date.now()}`,
    collectionId,
    collectionName,
    itemIndex,
    label,
    createdAt: new Date().toISOString(),
  };
  const next: HadithProgress = {
    ...current,
    bookmarks: [
      entry,
      ...current.bookmarks.filter(
        (b) => b.collectionId !== collectionId || b.itemIndex !== itemIndex
      ),
    ].slice(0, 50),
  };
  await persistHadith(memberId, next);
  return next;
}
