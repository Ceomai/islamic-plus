import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { getDayNames } from '../i18n';
import { normalizeReminderTime } from '../services/advancedReminders';
import type { CustomReminder } from '../types';
import { AppText, Button, Chip, IconBadge, Screen, SectionHeader, Surface, TextField } from '../ui';

const TYPES: { id: CustomReminder['type']; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'dhikr', icon: 'ellipse-outline' },
  { id: 'dua', icon: 'hand-left-outline' },
  { id: 'quran', icon: 'book-outline' },
  { id: 'custom', icon: 'star-outline' },
];
const QUICK_TIMES = ['05:30', '08:00', '13:00', '17:00', '21:30'];

export function AdvancedRemindersScreen() {
  const { settings, addCustomReminder, removeCustomReminder } = useApp();
  const { colors, space } = useTheme();
  const { t } = useTranslation();
  const dayNames = getDayNames(settings.appLanguage);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [type, setType] = useState<CustomReminder['type']>('dhikr');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const handleAdd = () => {
    const normalized = normalizeReminderTime(time);
    if (!normalized) {
      setTimeError(t('reminders.timeError'));
      return;
    }
    if (!title.trim() || days.length === 0) return;
    void addCustomReminder({ title: title.trim(), time: normalized, daysOfWeek: days, type, enabled: true, sound: 'default' });
    setTitle('');
  };

  const daysLabel = (r: CustomReminder) =>
    r.daysOfWeek.length === 7 ? t('reminders.everyDay') : r.daysOfWeek.map((d) => dayNames[d]).join(', ');

  return (
    <Screen>
      <AppText variant="callout" tone="secondary" style={{ marginBottom: space[4] }}>
        {t('reminders.intro')}
      </AppText>

      <Surface>
        <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
          {t('reminders.typeLabel')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[4] }}>
          {TYPES.map((tp) => (
            <Chip key={tp.id} label={t(`reminders.types.${tp.id}`)} icon={tp.icon} selected={type === tp.id} onPress={() => setType(tp.id)} />
          ))}
        </View>

        <TextField label={t('reminders.titleLabel')} placeholder={t('reminders.titlePlaceholder')} value={title} onChangeText={setTitle} />
        <TextField
          label={t('reminders.timeLabel')}
          placeholder="08:00"
          value={time}
          onChangeText={(v) => {
            setTime(v);
            setTimeError(null);
          }}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          error={timeError}
          hint={t('reminders.timeHint')}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[4] }}>
          {QUICK_TIMES.map((q) => (
            <Chip
              key={q}
              label={q}
              selected={normalizeReminderTime(time) === q}
              onPress={() => {
                setTime(q);
                setTimeError(null);
              }}
            />
          ))}
        </View>

        <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
          {t('reminders.daysLabel')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[4] }}>
          {dayNames.map((d, i) => (
            <Chip key={d} label={d} selected={days.includes(i)} onPress={() => toggleDay(i)} />
          ))}
        </View>

        <Button label={t('reminders.add')} icon="add" onPress={handleAdd} disabled={!title.trim() || days.length === 0} fullWidth />
      </Surface>

      <SectionHeader title={t('reminders.scheduled')} />
      {settings.customReminders.length === 0 ? (
        <Surface variant="muted">
          <AppText variant="callout" tone="secondary" align="center">
            {t('reminders.empty')}
          </AppText>
        </Surface>
      ) : (
        settings.customReminders.map((r) => (
          <Surface key={r.id} style={{ marginBottom: space[3], flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <IconBadge name={TYPES.find((x) => x.id === r.type)?.icon ?? 'alarm-outline'} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{r.title}</AppText>
              <AppText variant="caption" tone="secondary">
                {r.time} · {t(`reminders.types.${r.type}`)} · {daysLabel(r)}
              </AppText>
            </View>
            <Pressable onPress={() => removeCustomReminder(r.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('reminders.delete')}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </Pressable>
          </Surface>
        ))
      )}
    </Screen>
  );
}
