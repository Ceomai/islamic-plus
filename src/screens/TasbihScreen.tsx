import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { incrementTasbih, loadTasbihData, resetTasbihSession, setTasbihTarget } from '../services/tasbihStorage';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

const TARGETS = [33, 99, 100];

export function TasbihScreen() {
  const { trackActivity } = useApp();
  const { colors } = useTheme();
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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const data = await incrementTasbih();
    setCount(data.count);
    setTotalLifetime(data.total);
    void trackActivity('tasbih');
    if (data.count >= target) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.targets}>
        {TARGETS.map((tgt) => (
          <Pressable
            key={tgt}
            onPress={() => changeTarget(tgt)}
            style={[
              styles.targetBtn,
              { backgroundColor: target === tgt ? colors.primary : colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={{ color: target === tgt ? '#fff' : colors.text }}>{tgt}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={increment}
        style={[styles.circle, { backgroundColor: colors.primary, borderColor: colors.accent }]}
      >
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.sub}>{t('tasbih.of')} {target}</Text>
      </Pressable>
      <View style={[styles.bar, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
      </View>
      <Pressable onPress={reset} style={styles.reset}>
        <Text style={{ color: colors.textSecondary }}>{t('tasbih.reset')}</Text>
      </Pressable>
      <Text style={[styles.lifetime, { color: colors.textSecondary }]}>
        {t('tasbih.lifetime')}: {totalLifetime.toLocaleString()}
      </Text>
      <Text style={[styles.dhikr, { color: colors.primary }]}>
        سُبْحَانَ اللَّهِ · الْحَمْدُ لِلَّهِ · اللَّهُ أَكْبَرُ
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  targets: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  targetBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  circle: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', borderWidth: 4 },
  count: { color: '#fff', fontSize: 56, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  bar: { width: '80%', height: 6, borderRadius: 3, marginTop: 32, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  reset: { marginTop: 24, padding: 12 },
  lifetime: { marginTop: 8 },
  dhikr: { marginTop: 32, fontSize: 18, textAlign: 'center' },
});
