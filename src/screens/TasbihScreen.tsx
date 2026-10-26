import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { incrementTasbih, loadTasbihData, resetTasbihSession, setTasbihTarget } from '../services/tasbihStorage';
import { AppText, Button, Chip, Screen, Surface } from '../ui';

const TARGETS = [33, 99, 100];
const COUNTER_SIZE = 240;

export function TasbihScreen() {
  const { trackActivity } = useApp();
  const { colors, radius, space, type } = useTheme();
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);
  const [totalLifetime, setTotalLifetime] = useState(0);

  useEffect(() => {
    loadTasbihData().then((d) => {
      setCount(d.count);
      setTotalLifetime(d.total);
    });
  }, []);

  const increment = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const data = await incrementTasbih();
    setCount(data.count);
    setTotalLifetime(data.total);
    void trackActivity('tasbih');
    if (data.count === target) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const reset = async () => {
    const data = await resetTasbihSession(target);
    setCount(data.count);
    setTotalLifetime(data.total);
  };

  const changeTarget = async (tgt: number) => {
    const data = await setTasbihTarget(tgt);
    setTarget(tgt);
    setCount(data.count);
    setTotalLifetime(data.total);
  };

  const progress = Math.min(count / target, 1);
  const reached = count >= target;

  return (
    <Screen contentStyle={{ alignItems: 'center' }}>
      <Surface style={{ alignSelf: 'stretch', alignItems: 'center', marginBottom: space[6] }}>
        <AppText style={[type.arabic, { textAlign: 'center' }]} tone="brand">
          سُبْحَانَ اللَّهِ · الْحَمْدُ لِلَّهِ · اللَّهُ أَكْبَرُ
        </AppText>
      </Surface>

      <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[8] }}>
        {TARGETS.map((tgt) => (
          <Chip key={tgt} label={String(tgt)} selected={target === tgt} onPress={() => changeTarget(tgt)} />
        ))}
      </View>

      <Pressable
        onPress={increment}
        accessibilityRole="button"
        accessibilityLabel={`${count} / ${target}`}
        accessibilityHint={t('tasbih.tapHint')}
        style={({ pressed }) => ({
          width: COUNTER_SIZE,
          height: COUNTER_SIZE,
          borderRadius: COUNTER_SIZE / 2,
          borderWidth: 10,
          borderColor: reached ? colors.accent : colors.primarySoft,
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <AppText style={{ fontSize: 64, lineHeight: 72, fontWeight: '700' }} color={colors.onPrimary}>
          {count}
        </AppText>
        <AppText variant="callout" color="rgba(255,255,255,0.75)">
          {t('tasbih.of')} {target}
        </AppText>
      </Pressable>

      <AppText variant="caption" tone="muted" style={{ marginTop: space[3] }}>
        {reached ? t('tasbih.completed') : t('tasbih.tapHint')}
      </AppText>

      <View
        style={{
          alignSelf: 'stretch',
          height: 6,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceMuted,
          marginTop: space[6],
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: reached ? colors.accent : colors.primary }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: space[6] }}>
        <View>
          <AppText variant="caption" tone="secondary">
            {t('tasbih.lifetime')}
          </AppText>
          <AppText variant="heading">{totalLifetime.toLocaleString()}</AppText>
        </View>
        <Button label={t('tasbih.reset')} onPress={reset} variant="secondary" icon="refresh" />
      </View>
    </Screen>
  );
}
