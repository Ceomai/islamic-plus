import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { getUpcomingIslamicEvents, gregorianToHijri, hijriMonthNames } from '../services/hijriCalendar';
import { AppText, ListRow, Screen, SectionHeader, Surface } from '../ui';

export function CalendarScreen() {
  const { colors, radius, space } = useTheme();
  const { t, lang } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const hijri = useMemo(() => gregorianToHijri(today, lang), [today, lang]);
  const events = useMemo(() => getUpcomingIslamicEvents(today, 9, lang), [today, lang]);
  const months = hijriMonthNames(lang);
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';

  const daysLabel = (n: number) =>
    n === 0 ? t('calendar.today') : n === 1 ? t('calendar.tomorrow') : t('calendar.daysLeft', { n: String(n) });

  return (
    <Screen>
      <Surface variant="hero" padding={space[6]}>
        <AppText variant="overline" color={colors.onHeroMuted}>
          {t('calendar.hijri')}
        </AppText>
        <AppText variant="display" color={colors.onHero} style={{ marginTop: space[1] }}>
          {hijri.day} {hijri.monthName}
        </AppText>
        <AppText variant="heading" color={colors.onHero} style={{ fontWeight: '400' }}>
          {hijri.year}
        </AppText>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: space[4] }} />
        <AppText variant="caption" color={colors.onHeroMuted}>
          {t('calendar.gregorian')}
        </AppText>
        <AppText variant="bodyStrong" color={colors.onHero}>
          {today.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </AppText>
      </Surface>

      <SectionHeader title={t('calendar.events')} />
      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        {events.map((e, i) => (
          <ListRow
            key={e.id}
            icon={e.daysLeft <= 7 ? 'star' : 'star-outline'}
            iconTone={e.daysLeft <= 7 ? 'accent' : 'brand'}
            title={e.name}
            subtitle={`${e.hijriLabel} · ${e.date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`}
            value={daysLabel(e.daysLeft)}
            divider={i < events.length - 1}
          />
        ))}
      </Surface>
      <AppText variant="caption" tone="muted" style={{ marginTop: space[2] }}>
        {t('calendar.sightingNote')}
      </AppText>

      <SectionHeader title={t('calendar.months')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {months.map((m, i) => {
          const current = hijri.month === i + 1;
          return (
            <View
              key={m}
              style={{
                width: '31.5%',
                paddingVertical: space[3],
                paddingHorizontal: space[2],
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: current ? colors.primary : colors.border,
                backgroundColor: current ? colors.primary : colors.surface,
              }}
            >
              <AppText variant="caption" color={current ? colors.onPrimary : colors.textMuted}>
                {i + 1}
              </AppText>
              <AppText variant="callout" color={current ? colors.onPrimary : colors.text} numberOfLines={1} style={{ fontWeight: '600' }}>
                {m}
              </AppText>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
