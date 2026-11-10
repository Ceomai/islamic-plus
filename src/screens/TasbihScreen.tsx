import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { DHIKR, TESBIHAT_COUNT, TESBIHAT_SEQUENCE, getDhikr } from '../data/dhikr';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { trackFeatureAction } from '../services/cloudAnalytics';
import {
  incrementTasbih,
  loadTasbihData,
  resetTasbihSession,
  setTasbihGoal,
  summarizeTasbih,
} from '../services/tasbihStorage';
import { AppText, Button, Chip, Screen, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Tasbih'>;
type Mode = 'tesbihat' | 33 | 99 | 100;

const MODES: Mode[] = ['tesbihat', 33, 99, 100];
const GOALS = [0, 100, 300, 500, 1000];
const COUNTER_SIZE = 220;
const KEEP_AWAKE_TAG = 'tasbih';

export function TasbihScreen({ navigation }: Props) {
  const { trackActivity } = useApp();
  const { colors, radius, space, component, motion } = useTheme();
  const { t, lang } = useTranslation();
  const [mode, setMode] = useState<Mode>('tesbihat');
  const [dhikrId, setDhikrId] = useState('subhanallah');
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
  const [today, setToday] = useState(0);
  const [goal, setGoal] = useState(0);
  const [editGoal, setEditGoal] = useState(false);

  const tesbihat = mode === 'tesbihat';
  const target = tesbihat ? TESBIHAT_COUNT : mode;
  const currentId = tesbihat ? TESBIHAT_SEQUENCE[step] : dhikrId;
  const dhikr = getDhikr(currentId) ?? DHIKR[0];

  // Long dhikr sessions used to let the screen go dark mid-count
  useEffect(() => {
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      void Promise.resolve()
        .then(() => deactivateKeepAwake(KEEP_AWAKE_TAG))
        .catch(() => undefined);
    };
  }, []);

  // What the counter shows right now. Taps read and change these synchronously, so the number,
  // progress and haptic follow every tap at once and quick taps never act on a stale value
  const live = useRef({ count: 0, today: 0, step: 0 });
  const touched = useRef(false);
  const pending = useRef(0);
  // Bumped by a reset: storage answers for taps before it must not move the counter any more
  const epoch = useRef(0);

  useEffect(() => {
    void loadTasbihData().then((d) => {
      setGoal(d.dailyGoal ?? 0);
      if (touched.current) return; // the answers to those taps bring the stored numbers
      live.current.count = d.count;
      live.current.today = summarizeTasbih(d, 1).today;
      setCount(live.current.count);
      setToday(live.current.today);
    });
  }, []);

  const increment = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJustFinished(false);
    touched.current = true;
    const state = live.current;
    const tapDhikrId = tesbihat ? TESBIHAT_SEQUENCE[state.step] : dhikrId;

    state.today += 1;
    setToday(state.today);
    if (goal > 0 && state.today === goal) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void trackFeatureAction('tasbih', 'goal_reached', { goal });
    }

    // Storage counts the tap and completes the round in one step; the screen doesn't wait for it
    const tapEpoch = epoch.current;
    pending.current += 1;
    void incrementTasbih(target, tapDhikrId)
      .then((result) => {
        // Once every tap is stored, show the stored numbers (they differ only if a tap came before loading)
        if (--pending.current > 0 || tapEpoch !== epoch.current) return;
        state.count = result.count;
        state.today = summarizeTasbih(result.data, 1).today;
        setCount(state.count);
        setToday(state.today);
      })
      .catch(() => {
        pending.current -= 1;
      });
    void trackActivity('tasbih', false);

    if (state.count + 1 < target) {
      state.count += 1;
      setCount(state.count);
      return;
    }

    // Round complete: move on to the next phrase (tesbihat) or the next round
    void trackFeatureAction('tasbih', 'round_completed', { target, dhikr: tapDhikrId });
    state.count = 0;
    setCount(0);
    if (tesbihat) {
      state.step = (state.step + 1) % TESBIHAT_SEQUENCE.length;
      setStep(state.step);
      if (state.step === 0) {
        setRounds((r) => r + 1);
        setJustFinished(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } else {
      setRounds((r) => r + 1);
      setJustFinished(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const reset = async () => {
    epoch.current += 1;
    live.current.count = 0;
    live.current.step = 0;
    setCount(0);
    setStep(0);
    setRounds(0);
    setJustFinished(false);
    await resetTasbihSession(target, currentId);
  };

  const changeMode = async (next: Mode) => {
    if (next === mode) return;
    await reset();
    setMode(next);
  };

  const changeDhikr = async (id: string) => {
    if (id === dhikrId) return;
    await reset();
    setDhikrId(id);
  };

  const progress = Math.min(count / target, 1);
  const status = justFinished
    ? tesbihat
      ? t('tasbih.tesbihatDone')
      : t('tasbih.completed')
    : tesbihat
      ? t('tasbih.stepOf', { step: String(step + 1), total: String(TESBIHAT_SEQUENCE.length) })
      : t('tasbih.tapHint');

  return (
    <Screen contentStyle={{ alignItems: 'center' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ alignSelf: 'stretch', marginHorizontal: -space[4] }}
        contentContainerStyle={{ paddingHorizontal: space[4], gap: space[2] }}
      >
        {MODES.map((m) => (
          <Chip
            key={String(m)}
            label={m === 'tesbihat' ? t('tasbih.tesbihat') : String(m)}
            icon={m === 'tesbihat' ? 'repeat' : undefined}
            selected={mode === m}
            onPress={() => changeMode(m)}
          />
        ))}
      </ScrollView>

      {!tesbihat && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ alignSelf: 'stretch', marginHorizontal: -space[4], marginTop: space[3] }}
          contentContainerStyle={{ paddingHorizontal: space[4], gap: space[2] }}
        >
          {DHIKR.map((d) => (
            <Chip key={d.id} label={d.transliteration} selected={dhikrId === d.id} onPress={() => changeDhikr(d.id)} />
          ))}
        </ScrollView>
      )}

      <Surface style={{ alignSelf: 'stretch', alignItems: 'center', marginTop: space[4] }}>
        <AppText variant="arabicDua" tone="brand" align="center">
          {dhikr.arabic}
        </AppText>
        <AppText variant="bodyStrong" align="center">
          {dhikr.transliteration}
        </AppText>
        <AppText variant="caption" tone="secondary" align="center" style={{ marginTop: 2 }}>
          {dhikr.meaning[lang]}
        </AppText>
        {tesbihat && (
          <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[3] }}>
            {TESBIHAT_SEQUENCE.map((id, i) => (
              <View
                key={id}
                style={{
                  width: 28,
                  height: 6,
                  borderRadius: radius.pill,
                  backgroundColor: i < step ? colors.primary : i === step ? colors.accent : colors.surfaceMuted,
                }}
              />
            ))}
          </View>
        )}
      </Surface>

      <Pressable
        onPress={increment}
        accessibilityRole="button"
        accessibilityLabel={`${dhikr.transliteration}: ${count} / ${target}`}
        accessibilityHint={t('tasbih.tapHint')}
        style={({ pressed }) => ({
          width: COUNTER_SIZE,
          height: COUNTER_SIZE,
          borderRadius: COUNTER_SIZE / 2,
          borderWidth: 10,
          borderColor: justFinished ? colors.accent : colors.primarySoft,
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: space[6],
          transform: [{ scale: pressed ? motion.pressedScale : 1 }],
        })}
      >
        <AppText style={component.tasbihCounter} tone="onPrimary" numeric>
          {count}
        </AppText>
        <AppText variant="callout" tone="onHeroMuted" numeric>
          / {target}
        </AppText>
      </Pressable>

      <View style={{ alignSelf: 'stretch', height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, marginTop: space[5], overflow: 'hidden' }}>
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.primary }} />
      </View>

      <AppText variant={justFinished ? 'calloutStrong' : 'callout'} tone={justFinished ? 'brand' : 'muted'} align="center" style={{ marginTop: space[3] }}>
        {status}
      </AppText>
      <AppText variant="caption" tone="secondary" style={{ marginTop: space[1] }}>
        {tesbihat ? t('tasbih.setsDone', { n: String(rounds) }) : t('tasbih.roundsDone', { n: String(rounds) })}
      </AppText>

      {/* Daily goal */}
      <Surface variant="muted" padding={space[3]} style={{ alignSelf: 'stretch', marginTop: space[5] }}>
        <Pressable onPress={() => setEditGoal((v) => !v)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <Ionicons name={goal > 0 && today >= goal ? 'trophy' : 'flag-outline'} size={16} color={colors.primaryText} />
          <AppText variant="callout" style={{ flex: 1 }}>
            {goal > 0 ? (today >= goal ? t('tasbih.goalReached', { n: String(today) }) : t('tasbih.goalProgress', { n: String(today), goal: String(goal) })) : t('tasbih.goalOff')}
          </AppText>
          <Ionicons name={editGoal ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </Pressable>
        {goal > 0 && (
          <View style={{ height: 4, borderRadius: radius.pill, backgroundColor: colors.surface, marginTop: space[2], overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(today / goal, 1) * 100}%`, height: '100%', backgroundColor: colors.primary }} />
          </View>
        )}
        {editGoal && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] }}>
            {GOALS.map((g) => (
              <Chip
                key={g}
                label={g === 0 ? t('tasbih.goalNone') : String(g)}
                selected={goal === g}
                onPress={() => {
                  setGoal(g);
                  setEditGoal(false);
                  void setTasbihGoal(g);
                }}
              />
            ))}
          </View>
        )}
      </Surface>

      <View style={{ flexDirection: 'row', gap: space[3], alignSelf: 'stretch', marginTop: space[4] }}>
        <Button label={t('tasbih.reset')} icon="refresh" onPress={reset} variant="secondary" style={{ flex: 1 }} />
        <Button label={t('tasbih.stats')} icon="bar-chart-outline" onPress={() => navigation.navigate('TasbihStats')} variant="secondary" style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], marginTop: space[3] }}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <AppText variant="caption" tone="muted">
          {t('tasbih.resetHint')}
        </AppText>
      </View>
    </Screen>
  );
}
