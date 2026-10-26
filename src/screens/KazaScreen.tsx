import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Switch, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { getPrayerLabel } from '../i18n';
import { KAZA_PRAYERS, addKazaEstimate, changeKaza, kazaRemaining, loadKaza, resetKaza, type KazaData, type KazaPrayer } from '../services/kaza';
import { AppText, Button, Screen, SectionHeader, Surface, TextField } from '../ui';

export function KazaScreen() {
  const { colors, radius, space } = useTheme();
  const { t, lang } = useTranslation();
  const [data, setData] = useState<KazaData | null>(null);
  const [showEstimate, setShowEstimate] = useState(false);
  const [years, setYears] = useState('');
  const [days, setDays] = useState('');
  const [withWitr, setWithWitr] = useState(true);

  useEffect(() => {
    void loadKaza().then(setData);
  }, []);

  if (!data) return <Screen>{null}</Screen>;

  const label = (p: KazaPrayer) => (p === 'witr' ? t('kaza.witr') : getPrayerLabel(lang, p));
  const num = (n: number) => n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US');

  const change = async (p: KazaPrayer, delta: 1 | -1) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setData(await changeKaza(p, delta));
  };

  const addEstimate = async () => {
    const y = Number(years.replace(',', '.')) || 0;
    const d = Number(days) || 0;
    if (y <= 0 && d <= 0) return;
    setData(await addKazaEstimate(y, d, withWitr));
    setYears('');
    setDays('');
    setShowEstimate(false);
  };

  const confirmReset = () => {
    const run = async () => setData(await resetKaza());
    if (Platform.OS === 'web') {
      void run();
      return;
    }
    Alert.alert(t('kaza.resetTitle'), t('kaza.resetBody'), [
      { text: t('account.cancel'), style: 'cancel' },
      { text: t('kaza.reset'), style: 'destructive', onPress: () => void run() },
    ]);
  };

  const remaining = kazaRemaining(data);

  return (
    <Screen>
      <AppText variant="callout" tone="secondary">
        {t('kaza.intro')}
      </AppText>

      <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[4] }}>
        <Surface variant="soft" padding={space[3]} style={{ flex: 1 }}>
          <AppText variant="title" color={colors.onPrimarySoft}>
            {num(remaining)}
          </AppText>
          <AppText variant="caption" color={colors.onPrimarySoft} style={{ fontWeight: '600' }}>
            {t('kaza.remaining')}
          </AppText>
        </Surface>
        <Surface variant="soft" padding={space[3]} style={{ flex: 1 }}>
          <AppText variant="title" color={colors.onPrimarySoft}>
            {num(data.madeUp)}
          </AppText>
          <AppText variant="caption" color={colors.onPrimarySoft} style={{ fontWeight: '600' }}>
            {t('kaza.madeUp')}
          </AppText>
        </Surface>
      </View>

      <SectionHeader title={t('kaza.byPrayer')} />
      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        {KAZA_PRAYERS.map((p, i) => (
          <View
            key={p}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: space[3],
              borderBottomWidth: i < KAZA_PRAYERS.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {label(p)}
            </AppText>
            <Pressable
              onPress={() => change(p, -1)}
              disabled={data.counts[p] === 0}
              accessibilityRole="button"
              accessibilityLabel={t('kaza.prayedOne', { prayer: label(p) })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[1],
                paddingHorizontal: space[3],
                paddingVertical: space[2],
                borderRadius: radius.pill,
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                opacity: data.counts[p] === 0 ? 0.4 : 1,
              })}
            >
              <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
              <AppText variant="caption" color={colors.onPrimary} style={{ fontWeight: '600' }}>
                {t('kaza.prayed')}
              </AppText>
            </Pressable>
            <AppText variant="heading" style={{ width: 64, textAlign: 'center' }}>
              {num(data.counts[p])}
            </AppText>
            <Pressable
              onPress={() => change(p, 1)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('kaza.addOne', { prayer: label(p) })}
            >
              <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
            </Pressable>
          </View>
        ))}
      </Surface>

      <SectionHeader title={t('kaza.estimateTitle')} />
      {!showEstimate ? (
        <Button label={t('kaza.estimateOpen')} icon="calculator-outline" variant="secondary" onPress={() => setShowEstimate(true)} />
      ) : (
        <Surface>
          <AppText variant="caption" tone="secondary" style={{ marginBottom: space[3] }}>
            {t('kaza.estimateHint')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('kaza.years')} value={years} onChangeText={setYears} keyboardType="decimal-pad" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('kaza.days')} value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="0" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[3] }}>
            <AppText variant="callout">{t('kaza.includeWitr')}</AppText>
            <Switch value={withWitr} onValueChange={setWithWitr} trackColor={{ true: colors.primary, false: colors.borderStrong }} />
          </View>
          <Button label={t('kaza.estimateAdd')} icon="add" onPress={addEstimate} />
        </Surface>
      )}

      <Button label={t('kaza.reset')} icon="refresh" variant="ghost" onPress={confirmReset} style={{ marginTop: space[6] }} />
      <AppText variant="caption" tone="muted" style={{ marginTop: space[3] }}>
        {t('kaza.note')}
      </AppText>
    </Screen>
  );
}
