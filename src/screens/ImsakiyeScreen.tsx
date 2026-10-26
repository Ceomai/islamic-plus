import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { gregorianToHijri } from '../services/hijriCalendar';
import { formatClock, getPrayerDates } from '../services/prayerTimes';
import { buildImsakiye, fastCountdown, formatDuration, ramadanWindow } from '../services/ramadan';
import { AppText, Button, Screen, Surface } from '../ui';
import { addDays, localDateKey } from '../utils/date';

const COLS = ['day', 'date', 'imsak', 'sunrise', 'iftar', 'isha'] as const;

export function ImsakiyeScreen() {
  const { location, settings, refreshLocation } = useApp();
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  const [now, setNow] = useState(() => new Date());

  // Countdown ticks once a minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const ramadan = useMemo(() => ramadanWindow(now), [localDateKey(now)]);
  const days = useMemo(
    () => (location ? buildImsakiye(location.latitude, location.longitude, settings.calculationMethod, settings.madhab, ramadan) : []),
    [location?.latitude, location?.longitude, settings.calculationMethod, settings.madhab, ramadan]
  );
  const todayKey = localDateKey(now);
  const clock = (d: Date) => formatClock(d, lang);

  const countdown = useMemo(() => {
    if (!location || !ramadan.inRamadan) return null;
    const today = getPrayerDates(location.latitude, location.longitude, now, settings.calculationMethod, settings.madhab);
    const tomorrow = getPrayerDates(location.latitude, location.longitude, addDays(now, 1), settings.calculationMethod, settings.madhab);
    return fastCountdown(now, today, tomorrow.fajr);
  }, [location, now, ramadan.inRamadan, settings.calculationMethod, settings.madhab]);

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

      {countdown && (
        <Surface variant="soft" style={{ marginTop: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Ionicons name={countdown.kind === 'iftar' ? 'restaurant-outline' : 'moon-outline'} size={28} color={colors.onPrimarySoft} />
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color={colors.onPrimarySoft} style={{ fontWeight: '600' }}>
              {countdown.kind === 'iftar' ? t('ramadan.untilIftar') : t('ramadan.untilSahur')} · {clock(countdown.target)}
            </AppText>
            <AppText variant="display" color={colors.onPrimarySoft}>
              {(() => {
                const { h, m } = formatDuration(countdown.target.getTime() - now.getTime());
                return t('ramadan.left', { h: String(h), m: String(m) });
              })()}
            </AppText>
          </View>
        </Surface>
      )}

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
              <AppText key={c} variant="caption" tone="muted" style={{ flex: c === 'date' ? 1.4 : 1, fontWeight: '600', textAlign: c === 'day' ? 'left' : 'center' }}>
                {t(`ramadan.col.${c}`)}
              </AppText>
            ))}
          </View>
          {days.map((d, i) => {
            const isToday = d.key === todayKey;
            return (
              <View
                key={d.key}
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
                <AppText variant="caption" style={{ flex: 1, fontWeight: '700' }} tone={isToday ? 'brand' : 'default'}>
                  {d.day}
                </AppText>
                <AppText variant="caption" tone="secondary" style={{ flex: 1.4, textAlign: 'center' }}>
                  {d.date.toLocaleDateString(locale, { day: 'numeric', month: 'short', weekday: 'short' })}
                </AppText>
                {[d.imsak, d.sunrise, d.iftar, d.isha].map((time, j) => (
                  <AppText key={j} variant="caption" style={{ flex: 1, textAlign: 'center', fontWeight: j === 0 || j === 2 ? '700' : '400' }}>
                    {clock(time)}
                  </AppText>
                ))}
              </View>
            );
          })}
        </Surface>
      )}

      <AppText variant="caption" tone="muted" style={{ marginTop: space[3] }}>
        {t('ramadan.note', { hijri: gregorianToHijri(now, lang).formatted })}
      </AppText>
    </Screen>
  );
}
