import React from 'react';
import { useNow } from '../../hooks/useClock';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText } from '../../ui';
import { formatRemaining } from '../../utils/time';

interface Props {
  target: Date;
  tickMs: number;
}

/** "2 h 5 min left" under the next prayer; the only part of the home screen that ticks. */
export function NextPrayerRemaining({ target, tickMs }: Props) {
  const now = useNow(tickMs);
  const { t } = useTranslation();
  const { h, m } = formatRemaining(target.getTime() - now);
  return (
    <AppText variant="calloutStrong" tone="onHeroAccent" numeric>
      {h > 0 ? t('home.remaining', { h: String(h), m: String(m) }) : t('home.remainingMin', { m: String(m) })}
    </AppText>
  );
}
