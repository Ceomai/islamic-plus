import React, { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { getDayNames } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { playAdhan, stopAudio } from '../services/audio';
import type { PrayerName, PrayerNotificationSettings } from '../types';
import { AppText, Button, Chip, ListRow, Screen, SectionHeader, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'NotificationSettings'>;

const PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
/** Sounds that ship with the app; "adhan_short" is the bundled 28-second adhan */
const SOUNDS: PrayerNotificationSettings['sound'][] = ['default', 'adhan_short', 'silent'];
const soundChoice = (s: PrayerNotificationSettings['sound'] | undefined) =>
  s === 'silent' ? 'silent' : s === 'adhan_short' || s === 'adhan_full' ? 'adhan_short' : 'default';
const ADVANCE_OPTIONS = [0, 5, 10, 15, 30];

export function NotificationSettingsScreen({ navigation }: Props) {
  const { settings, updateSettings, location, refreshLocation } = useApp();
  const { colors, space } = useTheme();
  const { t, prayer } = useTranslation();
  const dayNames = getDayNames(settings.appLanguage);
  const track = { true: colors.primary, false: colors.borderStrong };

  const patchPrayer = (p: PrayerName, patch: Partial<PrayerNotificationSettings>) =>
    updateSettings({
      prayerNotifications: { ...settings.prayerNotifications, [p]: { ...settings.prayerNotifications[p], ...patch } },
    });

  const toggleDayOff = (p: PrayerName, day: number) => {
    const rules = settings.disabledPrayerRules.map((r) => ({ ...r, daysOfWeek: [...r.daysOfWeek] }));
    const existing = rules.find((r) => r.prayer === p);
    if (existing) {
      existing.daysOfWeek = existing.daysOfWeek.includes(day)
        ? existing.daysOfWeek.filter((d) => d !== day)
        : [...existing.daysOfWeek, day];
      const cleaned = rules.filter((r) => r.daysOfWeek.length > 0 || r.specificDates.length > 0);
      void updateSettings({ disabledPrayerRules: cleaned });
      return;
    }
    void updateSettings({ disabledPrayerRules: [...rules, { prayer: p, daysOfWeek: [day], specificDates: [] }] });
  };

  const [adhanPlaying, setAdhanPlaying] = useState(false);
  useEffect(() => () => void stopAudio(), []);
  const toggleAdhan = async () => {
    if (adhanPlaying) {
      await stopAudio();
      setAdhanPlaying(false);
      return;
    }
    setAdhanPlaying(await playAdhan(() => setAdhanPlaying(false)));
  };

  const isDayOff = (p: PrayerName, day: number) =>
    settings.disabledPrayerRules.some((r) => r.prayer === p && r.daysOfWeek.includes(day));

  return (
    <Screen>
      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        <ListRow
          icon="notifications-outline"
          title={t('notifications.all')}
          subtitle={t('notifications.allHint')}
          trailing={
            <Switch
              value={settings.globalNotificationsEnabled}
              onValueChange={(v) => updateSettings({ globalNotificationsEnabled: v })}
              trackColor={track}
            />
          }
          divider
        />
        <ListRow
          icon={adhanPlaying ? 'stop-circle-outline' : 'play-circle-outline'}
          title={adhanPlaying ? t('notifications.stopAdhan') : t('notifications.listenAdhan')}
          subtitle={t('notifications.adhanHint')}
          onPress={toggleAdhan}
        />
      </Surface>

      {!location && (
        <Surface variant="soft" style={{ marginTop: space[3] }}>
          <AppText variant="callout" color={colors.onPrimarySoft} style={{ marginBottom: space[3] }}>
            {t('notifications.enableLocation')}
          </AppText>
          <Button label={t('qibla.useLocation')} icon="locate" onPress={refreshLocation} variant="secondary" />
        </Surface>
      )}

      <Surface padding={0} style={{ paddingHorizontal: space[4], marginTop: space[3] }}>
        <ListRow
          icon="alarm-outline"
          title={t('nav.advancedReminders')}
          subtitle={t('home.remindersSub')}
          onPress={() => navigation.navigate('AdvancedReminders')}
        />
      </Surface>

      {settings.globalNotificationsEnabled &&
        PRAYERS.map((p) => {
          const cfg = settings.prayerNotifications[p];
          const enabled = cfg?.enabled ?? true;
          return (
            <View key={p}>
              <SectionHeader title={prayer(p)} />
              <Surface>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText variant="bodyStrong">{t('notifications.enabled')}</AppText>
                  <Switch value={enabled} onValueChange={(v) => patchPrayer(p, { enabled: v })} trackColor={track} />
                </View>

                {enabled && (
                  <>
                    <AppText variant="caption" tone="secondary" style={{ marginTop: space[4], marginBottom: space[2] }}>
                      {t('notifications.sound')}
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                      {SOUNDS.map((s) => (
                        <Chip
                          key={s}
                          label={t(`notifications.sounds.${s}`)}
                          selected={soundChoice(cfg?.sound) === s}
                          onPress={() => patchPrayer(p, { sound: s })}
                        />
                      ))}
                    </View>

                    <AppText variant="caption" tone="secondary" style={{ marginTop: space[4], marginBottom: space[2] }}>
                      {t('notifications.advance')}
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                      {ADVANCE_OPTIONS.map((m) => (
                        <Chip
                          key={m}
                          label={m === 0 ? t('notifications.onTime') : t('notifications.minutesBefore', { n: String(m) })}
                          selected={(cfg?.advanceMinutes ?? 0) === m}
                          onPress={() => patchPrayer(p, { advanceMinutes: m })}
                        />
                      ))}
                    </View>

                    <AppText variant="caption" tone="secondary" style={{ marginTop: space[4], marginBottom: space[2] }}>
                      {t('notifications.disableDays')}
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                      {dayNames.map((d, i) => (
                        <Chip key={d} label={d} selected={isDayOff(p, i)} onPress={() => toggleDayOff(p, i)} />
                      ))}
                    </View>
                  </>
                )}
              </Surface>
            </View>
          );
        })}

      <AppText variant="caption" tone="muted" style={{ marginTop: space[4] }}>
        {t('notifications.footnote')}
      </AppText>
    </Screen>
  );
}
