import { useCallback, useMemo } from 'react';
import { localeFor, translate } from '../i18n';
import { useAppLanguage } from '../context/AppContext';

export function useTranslation() {
  const lang = useAppLanguage();

  const t = useCallback(
    (key: string, params?: Record<string, string>) => translate(lang, key, params),
    [lang]
  );

  const prayer = useCallback(
    (name: string) => translate(lang, `prayer.${name}`),
    [lang]
  );

  return useMemo(
    // locale: BCP 47 tag for toLocaleString / Intl formatting in the app language
    () => ({ t, prayer, appLanguage: lang, lang, locale: localeFor(lang) }),
    [t, prayer, lang]
  );
}
