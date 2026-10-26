import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { DHIKR, TESBIHAT_COUNT, TESBIHAT_SEQUENCE, getDhikr } from '../data/dhikr';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { trackFeatureAction } from '../services/cloudAnalytics';
import { completeTasbihRound, incrementTasbih, loadTasbihData, resetTasbihSession } from '../services/tasbihStorage';
import { AppText, Button, Chip, Screen, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Tasbih'>;
type Mode = 'tesbihat' | 33 | 99 | 100;

const MODES: Mode[] = ['tesbihat', 33, 99, 100];
const COUNTER_SIZE = 220;

export function TasbihScreen({ navigation }: Props) {
  const { trackActivity } = useApp();
  const { colors, radius, space, type } = useTheme();
  const { t, lang } = useTranslation();
  const [mode, setMode] = useState<Mode>('tesbihat');
  const [dhikrId, setDhikrId] = useState('subhanallah');
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [justFinished, setJustFinished] = useState(false);

  const tesbihat = mode === 'tesbihat';
  const target = tesbihat ? TESBIHAT_COUNT : mode;
  const currentId = tesbihat ? TESBIHAT_SEQUENCE[step] : dhikrId;
  const dhikr = getDhikr(currentId) ?? DHIKR[0];

  useEffect(() => {
    void loadTasbihData().then((d) => setCount(d.count));
  }, []);

  const increment = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJustFinished(false);
    const data = await incrementTasbih();
    void trackActivity('tasbih', false);

    if (data.count < target) {
      setCount(data.count);
      return;
    }

    // Round complete: store it, then move on to the next phrase (tesbihat) or the next round
    await completeTasbihRound(target, currentId);
    void trackFeatureAction('tasbih', 'round_completed', { target, dhikr: currentId });
    setCount(0);
    if (tesbihat) {
      const nextStep = (step + 1) % TESBIHAT_SEQUENCE.length;
      setStep(nextStep);
      if (nextStep === 0) {
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
    const data = await resetTasbihSession(target, currentId);
    setCount(data.count);
    setStep(0);
    setRounds(0);
    setJustFinished(false);
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
        <AppText style={[type.arabic, { textAlign: 'center', fontSize: 30, lineHeight: 52 }]} tone="brand">
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
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <AppText style={{ fontSize: 64, lineHeight: 72, fontWeight: '700' }} color={colors.onPrimary}>
          {count}
        </AppText>
        <AppText variant="callout" color="rgba(255,255,255,0.75)">
          / {target}
        </AppText>
      </Pressable>

      <View style={{ alignSelf: 'stretch', height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, marginTop: space[5], overflow: 'hidden' }}>
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.primary }} />
      </View>

      <AppText variant="callout" tone={justFinished ? 'brand' : 'muted'} align="center" style={{ marginTop: space[3], fontWeight: justFinished ? '600' : '400' }}>
        {status}
      </AppText>
      <AppText variant="caption" tone="secondary" style={{ marginTop: space[1] }}>
        {tesbihat ? t('tasbih.setsDone', { n: String(rounds) }) : t('tasbih.roundsDone', { n: String(rounds) })}
      </AppText>

      <View style={{ flexDirection: 'row', gap: space[3], alignSelf: 'stretch', marginTop: space[6] }}>
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
