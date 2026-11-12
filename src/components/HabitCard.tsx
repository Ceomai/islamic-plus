import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { SpiritualHabit } from '../types';
import { AppText, IconButton, PopIn, ProgressBar, Surface } from '../ui';

const CHECKBOX = 32;
const DAY_DOT = 10;

interface Props {
  habit: SpiritualHabit;
  /** Date keys of the last 7 days, oldest first (today last) */
  week: string[];
  /** One-letter weekday names for `week` */
  dayInitials: string[];
  today: string;
  onToggleToday: (habit: SpiritualHabit) => void;
  onRemove: (habit: SpiritualHabit) => void;
}

/** One habit: today's checkbox, this week's progress toward the target and the last 7 days. */
export function HabitCard({ habit: h, week, dayInitials, today, onToggleToday, onRemove }: Props) {
  const { colors, space, motion } = useTheme();
  const { t } = useTranslation();
  const dates = new Set(h.completedDates);
  const doneToday = dates.has(today);
  const weekDone = week.filter((k) => dates.has(k)).length;
  const progress = Math.min(1, weekDone / h.targetPerWeek);

  return (
    <Surface style={{ marginBottom: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <Pressable
          onPress={() => onToggleToday(h)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: doneToday }}
          aria-checked={doneToday}
          accessibilityLabel={h.title}
          hitSlop={8}
          style={({ pressed }) => ({
            width: CHECKBOX,
            height: CHECKBOX,
            borderRadius: CHECKBOX / 2,
            borderWidth: 2,
            borderColor: colors.primary,
            backgroundColor: doneToday ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? motion.pressedOpacity : 1,
          })}
        >
          <PopIn active={doneToday}>
            {doneToday ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} /> : null}
          </PopIn>
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{h.title}</AppText>
          <AppText variant="caption" tone="secondary">
            {t(`habits.cat.${h.category}`)} · {weekDone}/{h.targetPerWeek} {t('habits.thisWeek')}
          </AppText>
        </View>
        <IconButton
          name="trash-outline"
          size={18}
          color={colors.textMuted}
          onPress={() => onRemove(h)}
          accessibilityLabel={`${t('habits.delete')}: ${h.title}`}
          style={{ margin: -space[2] }}
        />
      </View>

      <ProgressBar
        progress={progress}
        duration={motion.duration.medium}
        fillColor={progress >= 1 ? colors.success : colors.primary}
        trackColor={colors.surfaceMuted}
        style={{ marginTop: space[3] }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] }}>
        {week.map((k, i) => {
          const done = dates.has(k);
          return (
            <View key={k} style={{ alignItems: 'center', gap: space[1] }}>
              <AppText variant="caption" tone={k === today ? 'brand' : 'muted'}>
                {dayInitials[i]}
              </AppText>
              <View
                style={{
                  width: DAY_DOT,
                  height: DAY_DOT,
                  borderRadius: DAY_DOT / 2,
                  backgroundColor: done ? colors.primary : colors.surfaceMuted,
                }}
              />
            </View>
          );
        })}
      </View>
    </Surface>
  );
}
