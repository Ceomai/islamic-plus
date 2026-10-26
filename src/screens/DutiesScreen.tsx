import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { saveZakatCalculation } from '../services/zakatHistory';
import { calculateSadaqaSuggested, calculateZakat } from '../services/zakat';

function NumInput({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.field}>
      <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>{label}</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChange}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        placeholder="0"
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

export function DutiesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [cash, setCash] = useState('10000');
  const [gold, setGold] = useState('0');
  const [silver, setSilver] = useState('0');
  const [investments, setInvestments] = useState('0');
  const [debts, setDebts] = useState('0');
  const [goldPrice, setGoldPrice] = useState('75');
  const [income, setIncome] = useState('3000');
  const [sadaqaPct, setSadaqaPct] = useState('2.5');

  const zakat = calculateZakat({
    cash: parseFloat(cash) || 0,
    goldGrams: parseFloat(gold) || 0,
    silverGrams: parseFloat(silver) || 0,
    investments: parseFloat(investments) || 0,
    businessAssets: 0,
    debts: parseFloat(debts) || 0,
    goldPricePerGram: parseFloat(goldPrice) || 75,
    silverPricePerGram: 1,
    nisabBasis: 'gold',
  });

  const saveZakat = async () => {
    await saveZakatCalculation(
      {
        cash: parseFloat(cash) || 0,
        goldGrams: parseFloat(gold) || 0,
        silverGrams: parseFloat(silver) || 0,
        investments: parseFloat(investments) || 0,
        businessAssets: 0,
        debts: parseFloat(debts) || 0,
        goldPricePerGram: parseFloat(goldPrice) || 75,
        silverPricePerGram: 1,
        nisabBasis: 'gold',
      },
      zakat
    );
    Alert.alert(t('duties.saved'));
  };

  const sadaqa = calculateSadaqaSuggested(parseFloat(income) || 0, parseFloat(sadaqaPct) || 0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: colors.text }]}>{t('duties.zakatTitle')}</Text>
      <Text style={[styles.note, { color: colors.textSecondary }]}>{t('duties.zakatNote')}</Text>
      <NumInput label={t('duties.cash')} value={cash} onChange={setCash} colors={colors} />
      <NumInput label={t('duties.gold')} value={gold} onChange={setGold} colors={colors} />
      <NumInput label={t('duties.silver')} value={silver} onChange={setSilver} colors={colors} />
      <NumInput label={t('duties.investments')} value={investments} onChange={setInvestments} colors={colors} />
      <NumInput label={t('duties.debts')} value={debts} onChange={setDebts} colors={colors} />
      <NumInput label={t('duties.goldPrice')} value={goldPrice} onChange={setGoldPrice} colors={colors} />
      <Card>
        <Row label={t('duties.totalWealth')} value={`$${zakat.totalWealth.toFixed(2)}`} colors={colors} />
        <Row label={t('duties.nisab')} value={`$${zakat.nisabThreshold.toFixed(2)}`} colors={colors} />
        <Row
          label={t('duties.obligatory')}
          value={zakat.isObligatory ? t('duties.yes') : t('duties.no')}
          colors={colors}
        />
        <Text style={[styles.zakatDue, { color: colors.primary }]}>
          {t('duties.zakatDue')}: ${zakat.zakatDue.toFixed(2)}
        </Text>
        <Pressable onPress={saveZakat} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.saveBtnText}>{t('duties.saveCalculation')}</Text>
        </Pressable>
      </Card>
      <Text style={[styles.heading, { color: colors.text, marginTop: 24 }]}>{t('duties.sadaqaTitle')}</Text>
      <NumInput label={t('duties.income')} value={income} onChange={setIncome} colors={colors} />
      <NumInput label={t('duties.pct')} value={sadaqaPct} onChange={setSadaqaPct} colors={colors} />
      <Card>
        <Text style={[styles.zakatDue, { color: colors.accent }]}>
          {t('duties.sadaqaDue')}: ${sadaqa.toFixed(2)}
        </Text>
      </Card>
    </ScrollView>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.row}>
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: '700' },
  note: { fontSize: 13, marginVertical: 12, lineHeight: 20 },
  field: { marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  zakatDue: { fontSize: 22, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  saveBtn: { marginTop: 16, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
