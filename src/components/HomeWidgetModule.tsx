import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { DUAS } from '../data/duas';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { gregorianToHijri } from '../services/hijriCalendar';
import { formatClock, getNextPrayer } from '../services/prayerTimes';
import { AppText } from '../ui/AppText';
import { Surface } from '../ui/Surface';

const TICK_MS = 30_000;
const DAY_MS = 86_400_000;

/** Same dua for the whole day, rotating through the collection. */
function duaOfTheDay(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((date.getTime() - start) / DAY_MS);
  return DUAS[dayOfYear % DUAS.length];
}

interface Props {
  onOpenDua?: (duaId: string) => void;
}

/** Glanceable summary on the home screen; which rows appear is set in Settings → Widgets. */
export function HomeWidgetModule({ onOpenDua }: Props) {
  const { settings, location } = useApp();
  const { colors, space } = useTheme();
  const { t, prayer, lang } = useTranslation();
  const prefs = settings.widgetPrefs;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const day = new Date(now).toDateString();
  const hijri = useMemo(() => gregorianToHijri(new Date(now), lang), [day, lang]);
  const dua = useMemo(() => duaOfTheDay(new Date(now)), [day]);
  const next = useMemo(
    () => (location ? getNextPrayer(location.latitude, location.longitude, settings.calculationMethod, settings.madhab) : null),
    [location, settings.calculationMethod, settings.madhab, now]
  );

  const prayerLine = (() => {
    if (!next) return t('home.tapLocation');
    const minutes = Math.max(0, Math.round((next.time.getTime() - now) / 60000));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const remaining =
      h > 0 ? t('home.remaining', { h: String(h), m: String(m) }) : t('home.remainingMin', { m: String(m) });
    return `${prayer(next.name)} ${formatClock(next.time, lang)} · ${remaining}`;
  })();

  const rows: { key: string; icon: React.ComponentProps<typeof Ionicons>['name']; text: string; onPress?: () => void }[] = [];
  if (prefs.showNextPrayer) rows.push({ key: 'prayer', icon: 'time-outline', text: prayerLine });
  if (prefs.showHijriDate) rows.push({ key: 'hijri', icon: 'calendar-outline', text: hijri.formatted });
  if (prefs.showDailyDua && dua) {
    rows.push({
      key: 'dua',
      icon: 'hand-left-outline',
      text: `${t(dua.titleKey)} — ${dua.arabic}`,
      onPress: onOpenDua ? () => onOpenDua(dua.id) : undefined,
    });
  }

  if (rows.length === 0) {
    return (
      <Surface variant="muted" style={{ marginBottom: space[3] }}>
        <AppText variant="caption" tone="secondary">
          {t('widgets.allHidden')}
        </AppText>
      </Surface>
    );
  }

  if (prefs.compactMode) {
    return (
      <Surface variant="soft" padding={space[3]} style={{ marginBottom: space[3] }}>
        <AppText variant="callout" color={colors.onPrimarySoft} numberOfLines={2}>
          {rows.map((r) => r.text).join('  ·  ')}
        </AppText>
      </Surface>
    );
  }

  return (
    <Surface variant="soft" style={{ marginBottom: space[3] }}>
      <AppText variant="overline" tone="brand" style={{ marginBottom: space[2] }}>
        {t('launcher.widgetModule')}
      </AppText>
      <View style={{ gap: space[2] }}>
        {rows.map((r) => {
          const content = (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <Ionicons name={r.icon} size={16} color={colors.onPrimarySoft} />
              <AppText variant="callout" style={{ flex: 1 }} numberOfLines={1}>
                {r.text}
              </AppText>
              {r.onPress ? <Ionicons name="chevron-forward" size={14} color={colors.onPrimarySoft} /> : null}
            </View>
          );
          return r.onPress ? (
            <Pressable key={r.key} onPress={r.onPress} accessibilityRole="button">
              {content}
            </Pressable>
          ) : (
            <View key={r.key}>{content}</View>
          );
        })}
      </View>
    </Surface>
  );
}
