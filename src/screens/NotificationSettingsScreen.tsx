import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { getDayNames } from '../i18n';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { PrayerName } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'NotificationSettings'>;

const PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const SOUNDS = ['default', 'adhan_short', 'adhan_full', 'silent'] as const;

export function NotificationSettingsScreen({ navigation }: Props) {
  const { settings, updateSettings, location, refreshLocation } = useApp();
  const { colors } = useTheme();
  const { t, prayer } = useTranslation();
  const dayNames = getDayNames(settings.appLanguage);

  const toggleGlobal = (v: boolean) => updateSettings({ globalNotificationsEnabled: v });
  const togglePrayer = (prayerName: PrayerName, enabled: boolean) => {
    updateSettings({
      prayerNotifications: {
        ...settings.prayerNotifications,
        [prayerName]: { ...settings.prayerNotifications[prayerName], enabled },
      },
    });
  };

  const cycleSound = (prayerName: PrayerName) => {
    const current = settings.prayerNotifications[prayerName].sound;
    const idx = SOUNDS.indexOf(current);
    const next = SOUNDS[(idx + 1) % SOUNDS.length];
    updateSettings({
      prayerNotifications: {
        ...settings.prayerNotifications,
        [prayerName]: { ...settings.prayerNotifications[prayerName], sound: next },
      },
    });
  };

  const toggleDayOff = (prayerName: PrayerName, day: number) => {
    const rules = [...settings.disabledPrayerRules];
    const existing = rules.find((r) => r.prayer === prayerName);
    if (existing) {
      const has = existing.daysOfWeek.includes(day);
      existing.daysOfWeek = has
        ? existing.daysOfWeek.filter((d) => d !== day)
        : [...existing.daysOfWeek, day];
      if (existing.daysOfWeek.length === 0 && existing.specificDates.length === 0) {
        updateSettings({ disabledPrayerRules: rules.filter((r) => r.prayer !== prayerName) });
        return;
      }
    } else {
      rules.push({ prayer: prayerName, daysOfWeek: [day], specificDates: [] });
    }
    updateSettings({ disabledPrayerRules: rules });
  };

  const isDayDisabled = (prayerName: PrayerName, day: number) =>
    settings.disabledPrayerRules.some((r) => r.prayer === prayerName && r.daysOfWeek.includes(day));

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>{t('notifications.all')}</Text>
          <Switch
            value={settings.globalNotificationsEnabled}
            onValueChange={toggleGlobal}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>{t('notifications.locationReminder')}</Text>
          <Switch
            value={settings.locationReminderEnabled}
            onValueChange={(v) => updateSettings({ locationReminderEnabled: v })}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </Card>

      {!location && (
        <Text onPress={refreshLocation} style={{ color: colors.primary, marginBottom: 16 }}>
          {t('notifications.enableLocation')}
        </Text>
      )}

      <Pressable
        onPress={() => navigation.navigate('AdvancedReminders')}
        style={[styles.advancedLink, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
      >
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('nav.advancedReminders')} →</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{t('home.remindersSub')}</Text>
      </Pressable>

      {PRAYERS.map((p) => (
        <Card key={p}>
          <View style={styles.row}>
            <Text style={[styles.prayerName, { color: colors.text }]}>{prayer(p)}</Text>
            <Switch
              value={settings.prayerNotifications[p]?.enabled ?? true}
              onValueChange={(v) => togglePrayer(p, v)}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <Text onPress={() => cycleSound(p)} style={{ color: colors.textSecondary, marginTop: 8 }}>
            {t('notifications.sound')}: {settings.prayerNotifications[p]?.sound ?? 'adhan_short'} ({t('notifications.tapChange')})
          </Text>
          <Text style={[styles.disableLabel, { color: colors.textSecondary }]}>{t('notifications.disableDays')}</Text>
          <View style={styles.days}>
            {dayNames.map((d, i) => (
              <Text
                key={d}
                onPress={() => toggleDayOff(p, i)}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: isDayDisabled(p, i) ? colors.error : colors.surface,
                    color: isDayDisabled(p, i) ? '#fff' : colors.text,
                    borderColor: colors.border,
                  },
                ]}
              >
                {d}
              </Text>
            ))}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16 },
  prayerName: { fontSize: 18, fontWeight: '600' },
  disableLabel: { marginTop: 12, fontSize: 13 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  dayChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, fontSize: 12 },
  advancedLink: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
});
