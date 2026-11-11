import { useCallback, useMemo } from 'react';
import { translate } from '../i18n';
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
    () => ({ t, prayer, appLanguage: lang, lang }),
    [t, prayer, lang]
  );
}
