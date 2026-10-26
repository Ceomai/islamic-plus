import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { ZakatCalculationRecord } from '../types';
import { calculateSadaqaSuggested, calculateZakat, type ZakatInput } from '../services/zakat';
import { loadZakatHistory, saveZakatCalculation } from '../services/zakatHistory';
import { AppText, Button, Chip, ListRow, Screen, SectionHeader, Surface, TextField } from '../ui';

type Currency = 'TRY' | 'USD' | 'EUR';
const CURRENCIES: Currency[] = ['TRY', 'USD', 'EUR'];

/** Accepts "1.250,50", "1,250.50", "1250.5" or "1250,5". */
function parseAmount(raw: string): number {
  const s = raw.replace(/\s/g, '');
  if (!s) return 0;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  const normalized =
    lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function DutiesScreen() {
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  const [currency, setCurrency] = useState<Currency>(lang === 'tr' ? 'TRY' : 'USD');
  const [fields, setFields] = useState({
    cash: '',
    gold: '',
    silver: '',
    investments: '',
    business: '',
    debts: '',
    goldPrice: '',
    silverPrice: '',
  });
  const [nisabBasis, setNisabBasis] = useState<ZakatInput['nisabBasis']>(lang === 'tr' ? 'goldDiyanet' : 'gold');
  const [income, setIncome] = useState('');
  const [sadaqaPct, setSadaqaPct] = useState('2.5');
  const [history, setHistory] = useState<ZakatCalculationRecord[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadZakatHistory().then(setHistory);
  }, []);

  const money = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  const set = (key: keyof typeof fields) => (v: string) => {
    setSaved(false);
    setFields((f) => ({ ...f, [key]: v }));
  };

  const input: ZakatInput = {
    cash: parseAmount(fields.cash),
    goldGrams: parseAmount(fields.gold),
    silverGrams: parseAmount(fields.silver),
    investments: parseAmount(fields.investments),
    businessAssets: parseAmount(fields.business),
    debts: parseAmount(fields.debts),
    goldPricePerGram: parseAmount(fields.goldPrice),
    silverPricePerGram: parseAmount(fields.silverPrice),
    nisabBasis,
  };
  const zakat = calculateZakat(input);
  // Nisab needs the price of the chosen metal; without it the result would claim a 0 threshold
  const priceMissing = nisabBasis === 'silver' ? input.silverPricePerGram === 0 : input.goldPricePerGram === 0;
  const metalPriceMissing = (input.goldGrams > 0 && input.goldPricePerGram === 0) || (input.silverGrams > 0 && input.silverPricePerGram === 0);

  const save = async () => {
    await saveZakatCalculation(input, zakat);
    setHistory(await loadZakatHistory());
    setSaved(true);
  };

  const sadaqa = calculateSadaqaSuggested(parseAmount(income), parseAmount(sadaqaPct));

  return (
    <Screen>
      <AppText variant="title">{t('duties.zakatTitle')}</AppText>
      <AppText variant="callout" tone="secondary" style={{ marginTop: space[1], marginBottom: space[4] }}>
        {t('duties.zakatNote')}
      </AppText>

      <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[4] }}>
        {CURRENCIES.map((c) => (
          <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
        ))}
      </View>

      <Surface>
        <AppText variant="overline" tone="brand" style={{ marginBottom: space[3] }}>
          {t('duties.assets')}
        </AppText>
        <TextField label={t('duties.cash')} value={fields.cash} onChangeText={set('cash')} keyboardType="decimal-pad" placeholder="0" />
        <TextField label={t('duties.investments')} value={fields.investments} onChangeText={set('investments')} keyboardType="decimal-pad" placeholder="0" />
        <TextField label={t('duties.business')} value={fields.business} onChangeText={set('business')} keyboardType="decimal-pad" placeholder="0" />
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <View style={{ flex: 1 }}>
            <TextField label={t('duties.gold')} value={fields.gold} onChangeText={set('gold')} keyboardType="decimal-pad" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label={t('duties.goldPrice')} value={fields.goldPrice} onChangeText={set('goldPrice')} keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <View style={{ flex: 1 }}>
            <TextField label={t('duties.silver')} value={fields.silver} onChangeText={set('silver')} keyboardType="decimal-pad" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label={t('duties.silverPrice')} value={fields.silverPrice} onChangeText={set('silverPrice')} keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>
        <TextField label={t('duties.debts')} value={fields.debts} onChangeText={set('debts')} keyboardType="decimal-pad" placeholder="0" hint={t('duties.debtsHint')} />

        <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
          {t('duties.nisabBasis')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          <Chip label={t('duties.basisGoldDiyanet')} selected={nisabBasis === 'goldDiyanet'} onPress={() => setNisabBasis('goldDiyanet')} />
          <Chip label={t('duties.basisGold')} selected={nisabBasis === 'gold'} onPress={() => setNisabBasis('gold')} />
          <Chip label={t('duties.basisSilver')} selected={nisabBasis === 'silver'} onPress={() => setNisabBasis('silver')} />
        </View>
      </Surface>

      <Surface variant="hero" padding={space[5]} style={{ marginTop: space[4] }}>
        <AppText variant="overline" color={colors.onHeroMuted}>
          {t('duties.zakatDue')}
        </AppText>
        <AppText variant="display" color={colors.onHero}>
          {priceMissing ? '—' : money(zakat.zakatDue)}
        </AppText>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: space[3] }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="caption" color={colors.onHeroMuted}>
            {t('duties.totalWealth')}
          </AppText>
          <AppText variant="callout" color={colors.onHero}>
            {money(zakat.totalWealth)}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[1] }}>
          <AppText variant="caption" color={colors.onHeroMuted}>
            {t('duties.nisab')}
          </AppText>
          <AppText variant="callout" color={colors.onHero}>
            {priceMissing ? '—' : money(zakat.nisabThreshold)}
          </AppText>
        </View>
        <AppText variant="callout" color={colors.accent} style={{ marginTop: space[3], fontWeight: '600' }}>
          {priceMissing ? t('duties.enterPrice') : zakat.isObligatory ? t('duties.obligatoryYes') : t('duties.obligatoryNo')}
        </AppText>
      </Surface>
      {metalPriceMissing && (
        <AppText variant="caption" tone="danger" style={{ marginTop: space[2] }}>
          {t('duties.metalPriceMissing')}
        </AppText>
      )}

      <Button
        label={saved ? t('duties.saved') : t('duties.saveCalculation')}
        icon={saved ? 'checkmark' : 'save-outline'}
        onPress={save}
        variant="secondary"
        disabled={priceMissing || saved}
        fullWidth
        style={{ marginTop: space[3] }}
      />

      {history.length > 0 && (
        <>
          <SectionHeader title={t('duties.history')} />
          <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
            {history.slice(0, 5).map((h, i) => (
              <ListRow
                key={h.id}
                icon="calculator-outline"
                title={new Date(h.calculatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                subtitle={h.isObligatory ? t('duties.obligatoryYes') : t('duties.obligatoryNo')}
                value={new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(h.result.zakatDue ?? 0))}
                divider={i < Math.min(history.length, 5) - 1}
              />
            ))}
          </Surface>
        </>
      )}

      <SectionHeader title={t('duties.sadaqaTitle')} />
      <Surface>
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <View style={{ flex: 2 }}>
            <TextField label={t('duties.income')} value={income} onChangeText={setIncome} keyboardType="decimal-pad" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label={t('duties.pct')} value={sadaqaPct} onChangeText={setSadaqaPct} keyboardType="decimal-pad" />
          </View>
        </View>
        <AppText variant="callout" tone="secondary">
          {t('duties.sadaqaDue')}
        </AppText>
        <AppText variant="title" tone="brand">
          {money(sadaqa)}
        </AppText>
      </Surface>
    </Screen>
  );
}
