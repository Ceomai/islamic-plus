import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { logError } from '../services/errorLog';
import { fallBackToSystemArabicFont, fontFamily } from './tokens';

/** Bundled fonts (SIL Open Font License 1.1 — see the *-OFL.txt files next to them). */
const FONT_ASSETS = {
  [fontFamily.quran as string]: require('../../assets/fonts/AmiriQuran-Regular.ttf'),
  [fontFamily.arabic as string]: require('../../assets/fonts/NotoNaskhArabic-Regular.ttf'),
};

const LOAD_TIMEOUT_MS = 4000;

/**
 * Loads the Arabic fonts at start-up. Returns true once they loaded or failed — a failure never blocks
 * the app: Arabic text then uses the system font.
 */
export function useAppFonts(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (active) setReady(true);
    };
    // Bundled files load in milliseconds; never keep the splash screen up for long regardless
    const timer = setTimeout(finish, LOAD_TIMEOUT_MS);
    Font.loadAsync(FONT_ASSETS)
      .catch((e) => {
        fallBackToSystemArabicFont();
        void logError(e, 'promise');
      })
      .finally(() => {
        clearTimeout(timer);
        finish();
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  return ready;
}
