import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { HabitCard } from '../components/HabitCard';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { confirmDestructive } from '../utils/confirm';
import type { SpiritualHabit } from '../types';
import { AppText, Button, Chip, Screen, SectionHeader, Surface, TextField } from '../ui';
import { animateNextLayout } from '../ui/motion';
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
  const { space } = useTheme();
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
    animateNextLayout();
    void addHabit({ title: title.trim(), targetPerWeek: target, category });
    setTitle('');
  };

  // Marking today: a selection tick, or a success when it completes this week's target
  const toggleToday = (h: SpiritualHabit) => {
    const dates = new Set(h.completedDates);
    if (!dates.has(today)) {
      const weekDone = week.filter((k) => dates.has(k)).length;
      if (weekDone + 1 === h.targetPerWeek) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else void Haptics.selectionAsync();
    }
    void toggleHabitToday(h.id);
  };

  const confirmRemove = async (h: SpiritualHabit) => {
    const ok = await confirmDestructive({
      title: t('habits.deleteTitle'),
      message: t('habits.deleteBody', { name: h.title }),
      confirm: t('habits.delete'),
      cancel: t('account.cancel'),
    });
    if (ok) await removeHabit(h.id);
  };

  // A virtualized list: with hundreds of habits the old ScrollView rendered every row at once
  return (
    <Screen scroll={false} contentStyle={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        initialNumToRender={8}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[8] }}
        ListHeaderComponent={
          <View>
            <AppText variant="callout" tone="secondary" style={{ marginBottom: space[4] }}>
              {t('habits.intro')}
            </AppText>

            <Surface>
              <TextField
                label={t('habits.newLabel')}
                placeholder={t('habits.placeholder')}
                value={title}
                onChangeText={setTitle}
                maxLength={80}
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
          </View>
        }
        ListEmptyComponent={
          <Surface variant="muted">
            <AppText variant="callout" tone="secondary" align="center">
              {t('habits.empty')}
            </AppText>
          </Surface>
        }
        ListFooterComponent={
          settings.familyModeEnabled ? (
            <AppText variant="caption" tone="muted" style={{ marginTop: space[2] }}>
              {t('habits.familyNote')}
            </AppText>
          ) : undefined
        }
        renderItem={({ item }) => (
          <HabitCard
            habit={item}
            week={week}
            dayInitials={dayInitials}
            today={today}
            onToggleToday={toggleToday}
            onRemove={confirmRemove}
          />
        )}
      />
    </Screen>
  );
}
