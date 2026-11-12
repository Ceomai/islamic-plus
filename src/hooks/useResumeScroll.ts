import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';
import type { FlatList } from 'react-native';

/**
 * Scrolls the list once, after the first rows arrive, to the row holding `ayah` (the requested
 * ayah or the last-read one). Later row changes (view switches) leave the scroll position alone.
 */
export function useResumeScroll<Row extends { ayahs: { numberInSurah: number }[] }>(
  listRef: RefObject<FlatList<Row> | null>,
  rows: Row[],
  ayah: number | null | undefined
) {
  const done = useRef(false);

  const scrollToAyah = useEffectEvent(() => {
    if (done.current || !ayah || rows.length === 0) return;
    done.current = true;
    const index = rows.findIndex((r) => r.ayahs.some((a) => a.numberInSurah === ayah));
    if (index > 0) requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, animated: false }));
  });

  // Runs when the row count changes, as before: the latest rows and ayah are read inside
  useEffect(() => {
    scrollToAyah();
  }, [rows.length]);
}
