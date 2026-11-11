import { useCallback, useEffect, useState } from 'react';
import { fetchNearbyPlaces } from '../services/places';
import type { AppLanguage, NearbyPlace } from '../types';

export type NearbyStatus = 'loading' | 'ready' | 'error' | 'noLocation';

interface SearchResult {
  /** The search this answers; a different key means a newer search is still running */
  key: string;
  places: NearbyPlace[];
  failed: boolean;
}

/**
 * Places of a type around a point. A new search starts when the point, type, radius or language
 * changes; an answer for an older search that arrives late is ignored. Places from the last answer
 * stay while a newer search runs or fails.
 */
export function useNearbyPlaces(
  point: { latitude: number; longitude: number } | null | undefined,
  type: NearbyPlace['type'],
  radius: number,
  lang: AppLanguage
) {
  const [attempt, setAttempt] = useState(0);
  const latitude = point?.latitude;
  const longitude = point?.longitude;
  const key = `${latitude}|${longitude}|${type}|${radius}|${lang}|${attempt}`;
  const [result, setResult] = useState<SearchResult>({ key: '', places: [], failed: false });

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;
    let latest = true;
    fetchNearbyPlaces(latitude, longitude, type, radius, lang)
      .then((places) => {
        if (latest) setResult({ key, places, failed: false });
      })
      .catch(() => {
        if (latest) setResult((prev) => ({ ...prev, key, failed: true }));
      });
    return () => {
      latest = false;
    };
  }, [key, latitude, longitude, type, radius, lang]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const status: NearbyStatus =
    latitude === undefined || longitude === undefined ? 'noLocation' : result.key !== key ? 'loading' : result.failed ? 'error' : 'ready';

  return { places: result.places, status, retry };
}
