import { useCallback, useState, type RefObject } from 'react';
import { QURAN_AUDIO_BASE } from '../constants/defaults';
import { playRemoteAudio, stopAudio } from '../services/audio';
import type { ReaderAyah } from '../services/quranApi';
import { useEventCallback } from './useEventCallback';

/**
 * Ayah-by-ayah recitation: playing continues to the next ayah until the end of the surah or until
 * stopped. `lastAyah` follows the recited ayah so "continue reading" resumes there.
 */
export function useAyahPlayer(ayahs: ReaderAyah[], lastAyah: RefObject<number>) {
  const [playing, setPlaying] = useState<number | null>(null);

  const playFrom = useCallback(
    (start: number) => {
      const playAt = async (index: number): Promise<void> => {
        const ayah = ayahs[index];
        if (!ayah) {
          setPlaying(null);
          return;
        }
        setPlaying(ayah.numberInSurah);
        lastAyah.current = ayah.numberInSurah;
        const ok = await playRemoteAudio(`${QURAN_AUDIO_BASE}/${ayah.number}.mp3`, () => void playAt(index + 1));
        if (!ok) setPlaying(null);
      };
      return playAt(start);
    },
    [ayahs, lastAyah]
  );

  // Stable identity for the memoized rows; a second tap on the playing ayah stops it
  const togglePlay = useEventCallback(async (numberInSurah: number) => {
    if (playing === numberInSurah) {
      await stopAudio();
      setPlaying(null);
      return;
    }
    await playFrom(ayahs.findIndex((a) => a.numberInSurah === numberInSurah));
  });

  /** Stops recitation without waiting for the player (view switches) */
  const stop = useCallback(() => {
    void stopAudio();
    setPlaying(null);
  }, []);

  return { playing, togglePlay, stop };
}
