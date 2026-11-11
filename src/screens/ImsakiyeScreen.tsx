import React, { useMemo } from 'react';
import { View } from 'react-native';
import { FastCountdownCard } from '../components/prayer/FastCountdownCard';
import { useAppLocation, useSettings } from '../context/AppContext';
import { useDayKey } from '../hooks/useClock';
import { usePrayerDays } from '../hooks/usePrayerDays';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { gregorianToHijri } from '../services/hijriCalendar';
import { formatClock } from '../services/prayerTimes';
import { buildImsakiye, ramadanWindow } from '../services/ramadan';
import { AppText, Button, Screen, Surface } from '../ui';
import { dateFromKey } from '../utils/date';

const COLS = ['day', 'date', 'imsak', 'sunrise', 'iftar', 'isha'] as const;

export function ImsakiyeScreen() {
  const { location, refreshLocation } = useAppLocation();
  const { settings } = useSettings();
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  // Recomputed once a day; only the countdown card ticks
  const todayKey = useDayKey();
  const today = useMemo(() => dateFromKey(todayKey), [todayKey]);
  const ramadan = useMemo(() => ramadanWindow(today), [today]);
  const days = useMemo(
    () => (location ? buildImsakiye(location.latitude, location.longitude, settings.calculationMethod, settings.madhab, ramadan) : []),
    [location?.latitude, location?.longitude, settings.calculationMethod, settings.madhab, ramadan]
  );
  const clock = (d: Date) => formatClock(d, lang);
  const prayerDays = usePrayerDays(location, settings.calculationMethod, settings.madhab, todayKey);

  const range = `${ramadan.start.toLocaleDateString(locale, { day: 'numeric', month: 'long' })} – ${ramadan.end.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  return (
    <Screen>
      <AppText variant="overline" tone="brand">
        {t('ramadan.title', { year: String(ramadan.hijriYear) })}
      </AppText>
      <AppText variant="title" style={{ marginTop: space[1] }}>
        {range}
      </AppText>
      <AppText variant="callout" tone="secondary" style={{ marginTop: space[1] }}>
        {ramadan.inRamadan
          ? t('ramadan.dayOf', { n: String(ramadan.dayOfRamadan), total: String(ramadan.length) })
          : t('ramadan.daysUntil', { n: String(ramadan.daysUntil) })}
      </AppText>

      {prayerDays && ramadan.inRamadan && <FastCountdownCard days={prayerDays} />}

      {!location ? (
        <Surface variant="muted" style={{ marginTop: space[5], alignItems: 'center', gap: space[3] }}>
          <AppText tone="secondary" align="center">
            {t('ramadan.needLocation')}
          </AppText>
          <Button label={t('onboarding.allowLocation')} icon="navigate" onPress={refreshLocation} />
        </Surface>
      ) : (
        <Surface padding={0} style={{ marginTop: space[5], paddingHorizontal: space[3] }}>
          <View style={{ flexDirection: 'row', paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {COLS.map((c) => (
              <AppText key={c} variant="captionStrong" tone="muted" style={{ flex: c === 'date' ? 1.4 : 1, textAlign: c === 'day' ? 'left' : 'center' }}>
                {t(`ramadan.col.${c}`)}
              </AppText>
            ))}
          </View>
          {days.map((d, i) => {
            const isToday = d.key === todayKey;
            return (
              <View
                key={d.key}
                // One spoken line per day instead of six loose cells: "Day 3, 13 March Thursday, Imsak 05:12, …"
                accessible
                accessibilityLabel={[
                  `${t('ramadan.col.day')} ${d.day}`,
                  d.date.toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'long' }),
                  `${t('ramadan.col.imsak')} ${clock(d.imsak)}`,
                  `${t('ramadan.col.sunrise')} ${clock(d.sunrise)}`,
                  `${t('ramadan.col.iftar')} ${clock(d.iftar)}`,
                  `${t('ramadan.col.isha')} ${clock(d.isha)}`,
                ].join(', ')}
                accessibilityState={{ selected: isToday }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: space[2],
                  borderBottomWidth: i < days.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                  backgroundColor: isToday ? colors.primarySoft : 'transparent',
                  marginHorizontal: -space[3],
                  paddingHorizontal: space[3],
                }}
              >
                <AppText variant="captionStrong" numeric style={{ flex: 1 }} tone={isToday ? 'onPrimarySoft' : 'default'}>
                  {d.day}
                </AppText>
                {/* Weekday on its own line keeps every row the same height on narrow phones */}
                <View style={{ flex: 1.4, alignItems: 'center' }}>
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {d.date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                  </AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {d.date.toLocaleDateString(locale, { weekday: 'short' })}
                  </AppText>
                </View>
                {[d.imsak, d.sunrise, d.iftar, d.isha].map((time, j) => (
                  <AppText key={j} variant={j === 0 || j === 2 ? 'captionStrong' : 'caption'} numeric style={{ flex: 1, textAlign: 'center' }}>
                    {clock(time)}
                  </AppText>
                ))}
              </View>
            );
          })}
        </Surface>
      )}

      <AppText variant="caption" tone="muted" style={{ marginTop: space[3] }}>
        {t('ramadan.note', { hijri: gregorianToHijri(today, lang).formatted })}
      </AppText>
    </Screen>
  );
}
