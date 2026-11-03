import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { confirmDestructive } from '../utils/confirm';
import { getPrayerLabel } from '../i18n';
import { KAZA_PRAYERS, KAZA_MAX_DAYS, KAZA_MAX_YEARS, addKazaEstimate, changeKaza, kazaRemaining, loadKaza, resetKaza, type KazaData, type KazaPrayer } from '../services/kaza';
import { AppText, Button, Screen, SectionHeader, Surface, TextField } from '../ui';

export function KazaScreen() {
  const { colors, radius, space } = useTheme();
  const { t, lang } = useTranslation();
  const [data, setData] = useState<KazaData | null>(null);
  const [showEstimate, setShowEstimate] = useState(false);
  const [years, setYears] = useState('');
  const [days, setDays] = useState('');
  const [estimateError, setEstimateError] = useState<string | null>(null);
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
    const parse = (s: string) => (/^\s*\d*([.,]\d+)?\s*$/.test(s) ? Number(s.trim().replace(',', '.')) || 0 : NaN);
    const y = parse(years);
    const d = parse(days);
    // Whole numbers only, at most a lifetime (80 years / 30,000 days); "-3" or "1e9" used to slip through
    if (Number.isNaN(y) || Number.isNaN(d) || y > KAZA_MAX_YEARS || d > KAZA_MAX_DAYS) {
      setEstimateError(t('kaza.estimateInvalid', { years: String(KAZA_MAX_YEARS), days: String(KAZA_MAX_DAYS) }));
      return;
    }
    if (y <= 0 && d <= 0) {
      setEstimateError(t('kaza.estimateEmpty'));
      return;
    }
    setEstimateError(null);
    setData(await addKazaEstimate(y, d, withWitr));
    setYears('');
    setDays('');
    setShowEstimate(false);
  };

  const confirmReset = async () => {
    const ok = await confirmDestructive({ title: t('kaza.resetTitle'), message: t('kaza.resetBody'), confirm: t('kaza.reset'), cancel: t('account.cancel') });
    if (ok) setData(await resetKaza());
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
              <TextField label={t('kaza.years')} value={years} onChangeText={setYears} keyboardType="decimal-pad" placeholder="0" maxLength={5} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('kaza.days')} value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="0" maxLength={5} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[3] }}>
            <AppText variant="callout">{t('kaza.includeWitr')}</AppText>
            <Switch value={withWitr} onValueChange={setWithWitr} trackColor={{ true: colors.primary, false: colors.borderStrong }} />
          </View>
          {estimateError && (
            <AppText variant="caption" tone="danger" style={{ marginBottom: space[2] }} accessibilityLiveRegion="polite">
              {estimateError}
            </AppText>
          )}
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
