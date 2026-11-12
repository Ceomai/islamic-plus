import type { AppLanguage } from '../types';
import { en } from './locales/en';
import { tr } from './locales/tr';

const locales = { en, tr } as const;

export type TranslationKey = keyof typeof en;
function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function translate(
  lang: AppLanguage,
  key: string,
  params?: Record<string, string>
): string {
  const dict = locales[lang] ?? locales.en;
  let text = getNested(dict as unknown as Record<string, unknown>, key)
    ?? getNested(locales.en as unknown as Record<string, unknown>, key)
    ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
  }
  return text;
}

export function getPrayerLabel(lang: AppLanguage, prayer: string): string {
  return translate(lang, `prayer.${prayer}`);
}

export function getDayNames(lang: AppLanguage): string[] {
  return lang === 'tr'
    ? ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}

/** BCP 47 locale for number and date formatting in the app language */
export function localeFor(lang: AppLanguage): 'tr-TR' | 'en-US' {
  return lang === 'tr' ? 'tr-TR' : 'en-US';
}
