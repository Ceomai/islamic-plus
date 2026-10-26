import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { SpiritualHabit } from '../types';
import { AppText, Button, Chip, Screen, SectionHeader, Surface, TextField } from '../ui';
import { lastDayKeys, localDateKey } from '../utils/date';

const CATEGORIES: SpiritualHabit['category'][] = ['prayer', 'quran', 'dhikr', 'charity', 'fasting', 'other'];
const TARGETS = [1, 3, 5, 7];
const CATEGORY_ICONS: Record<SpiritualHabit['category'], React.ComponentProps<typeof Ionicons>['name']> = {
  prayer: 'moon-outline',
  quran: 'book-outline',
  dhikr: 'ellipse-outline',
  charity: 'gift-outline',
  fasting: 'restaurant-outline',
  other: 'star-outline',
};

export function HabitsScreen() {
  const { habits, addHabit, toggleHabitToday, removeHabit, settings } = useApp();
  const { colors, radius, space } = useTheme();
  const { t, lang } = useTranslation();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SpiritualHabit['category']>('dhikr');
  const [target, setTarget] = useState(7);
  const today = localDateKey();
  const week = lastDayKeys(7);
  const dayInitials = week.map((k) =>
    new Date(`${k}T12:00:00`).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'narrow' })
  );

  const handleAdd = () => {
    if (!title.trim()) return;
    void addHabit({ title: title.trim(), targetPerWeek: target, category });
    setTitle('');
  };

  const confirmRemove = (h: SpiritualHabit) =>
    Alert.alert(t('habits.deleteTitle'), t('habits.deleteBody', { name: h.title }), [
      { text: t('account.cancel'), style: 'cancel' },
      { text: t('habits.delete'), style: 'destructive', onPress: () => void removeHabit(h.id) },
    ]);

  return (
    <Screen>
      <AppText variant="callout" tone="secondary" style={{ marginBottom: space[4] }}>
        {t('habits.intro')}
      </AppText>

      <Surface>
        <TextField
          label={t('habits.newLabel')}
          placeholder={t('habits.placeholder')}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
          {t('habits.categoryLabel')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[4] }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={t(`habits.cat.${c}`)} icon={CATEGORY_ICONS[c]} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
        <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
          {t('habits.targetLabel')}
        </AppText>
        <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[4] }}>
          {TARGETS.map((n) => (
            <Chip key={n} label={t('habits.perWeek', { n: String(n) })} selected={target === n} onPress={() => setTarget(n)} />
          ))}
        </View>
        <Button label={t('habits.add')} icon="add" onPress={handleAdd} disabled={!title.trim()} fullWidth />
      </Surface>

      <SectionHeader title={t('habits.listTitle')} />
      {habits.length === 0 ? (
        <Surface variant="muted">
          <AppText variant="callout" tone="secondary" align="center">
            {t('habits.empty')}
          </AppText>
        </Surface>
      ) : (
        habits.map((h) => {
          const doneToday = h.completedDates.includes(today);
          const weekDone = week.filter((k) => h.completedDates.includes(k)).length;
          const progress = Math.min(1, weekDone / h.targetPerWeek);
          return (
            <Surface key={h.id} style={{ marginBottom: space[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                <Pressable
                  onPress={() => toggleHabitToday(h.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: doneToday }}
                  accessibilityLabel={h.title}
                  hitSlop={8}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    backgroundColor: doneToday ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {doneToday ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} /> : null}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{h.title}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {t(`habits.cat.${h.category}`)} · {weekDone}/{h.targetPerWeek} {t('habits.thisWeek')}
                  </AppText>
                </View>
                <Pressable onPress={() => confirmRemove(h)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('habits.delete')}>
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, marginTop: space[3], overflow: 'hidden' }}>
                <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: progress >= 1 ? colors.success : colors.primary }} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] }}>
                {week.map((k, i) => {
                  const done = h.completedDates.includes(k);
                  return (
                    <View key={k} style={{ alignItems: 'center', gap: 4 }}>
                      <AppText variant="caption" tone={k === today ? 'brand' : 'muted'}>
                        {dayInitials[i]}
                      </AppText>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: done ? colors.primary : colors.surfaceMuted,
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            </Surface>
          );
        })
      )}
      {settings.familyModeEnabled ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: space[2] }}>
          {t('habits.familyNote')}
        </AppText>
      ) : null}
    </Screen>
  );
}
