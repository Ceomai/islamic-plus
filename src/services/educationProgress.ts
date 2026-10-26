import type { EducationProgressEntry } from '../types';
import { getJson, setJson, storageKeys } from './storage';
import { notifyAppDataChanged } from './userDataCloud';

export async function loadEducationProgress(): Promise<EducationProgressEntry[]> {
  return getJson(storageKeys.educationProgress, []);
}

export async function markEducationTopicRead(topicId: string): Promise<EducationProgressEntry[]> {
  const list = await loadEducationProgress();
  const now = new Date().toISOString();
  const existing = list.find((e) => e.topicId === topicId);
  const entry: EducationProgressEntry = existing
    ? { ...existing, readCount: existing.readCount + 1, lastOpenedAt: now }
    : { topicId, readCount: 1, lastOpenedAt: now };

  const next = [entry, ...list.filter((e) => e.topicId !== topicId)];
  await setJson(storageKeys.educationProgress, next);
  notifyAppDataChanged();
  return next;
}

export function mergeEducationProgress(
  a: EducationProgressEntry[],
  b: EducationProgressEntry[]
): EducationProgressEntry[] {
  const map = new Map<string, EducationProgressEntry>();
  for (const item of [...a, ...b]) {
    const existing = map.get(item.topicId);
    if (!existing) {
      map.set(item.topicId, item);
    } else {
      map.set(item.topicId, {
        topicId: item.topicId,
        readCount: Math.max(existing.readCount, item.readCount),
        lastOpenedAt: existing.lastOpenedAt > item.lastOpenedAt ? existing.lastOpenedAt : item.lastOpenedAt,
      });
    }
  }
  return [...map.values()];
}
