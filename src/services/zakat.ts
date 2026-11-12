export interface ZakatInput {
  cash: number;
  goldGrams: number;
  silverGrams: number;
  investments: number;
  businessAssets: number;
  debts: number;
  goldPricePerGram: number;
  silverPricePerGram: number;
  /** gold: 85 g (common contemporary value), goldDiyanet: 80.18 g (Diyanet, Türkiye), silver: 595 g */
  nisabBasis: 'gold' | 'goldDiyanet' | 'silver';
}

export interface ZakatResult {
  totalWealth: number;
  nisabThreshold: number;
  zakatableAmount: number;
  zakatDue: number;
  isObligatory: boolean;
}

const NISAB_GOLD_GRAMS = 85;
const NISAB_GOLD_GRAMS_DIYANET = 80.18;
const NISAB_SILVER_GRAMS = 595;
const ZAKAT_RATE = 0.025;

export function calculateZakat(input: ZakatInput): ZakatResult {
  const goldValue = input.goldGrams * input.goldPricePerGram;
  const silverValue = input.silverGrams * input.silverPricePerGram;
  const totalWealth = Math.max(
    0,
    input.cash + goldValue + silverValue + input.investments + input.businessAssets - input.debts
  );

  const nisabThreshold =
    input.nisabBasis === 'silver'
      ? NISAB_SILVER_GRAMS * input.silverPricePerGram
      : (input.nisabBasis === 'goldDiyanet' ? NISAB_GOLD_GRAMS_DIYANET : NISAB_GOLD_GRAMS) * input.goldPricePerGram;

  // Without a metal price there is no threshold to compare against, so nothing is due
  const isObligatory = nisabThreshold > 0 && totalWealth > 0 && totalWealth >= nisabThreshold;
  const zakatableAmount = isObligatory ? totalWealth : 0;
  const zakatDue = zakatableAmount * ZAKAT_RATE;

  return {
    totalWealth,
    nisabThreshold,
    zakatableAmount,
    zakatDue,
    isObligatory,
  };
}

export function calculateSadaqaSuggested(monthlyIncome: number, percentage: number): number {
  return (monthlyIncome * percentage) / 100;
}

/**
 * Reads an amount as people type it: "1.250,50" and "1,250.50" (both separators: the last one is
 * the decimal mark), "1.500" or "100.000" (a dot before exactly three digits is a Turkish thousands
 * separator, not 1.5), "1250,5" (a single comma is a decimal mark) and "80.18". In English the
 * roles of a lone separator swap: "1,500" is 1500 and "1.500" is 1.5.
 */
export function parseAmount(raw: string, lang: 'tr' | 'en' = 'tr'): number {
  const s = raw.replace(/\s/g, '');
  if (!s) return 0;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const thousands = lang === 'en' ? /^\d{1,3}(,\d{3})+$/ : /^\d{1,3}(,\d{3}){2,}$/;
    normalized = thousands.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (lastDot >= 0) {
    normalized = lang === 'tr' && /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
  } else {
    normalized = s;
  }
  if (!/^\d*\.?\d+$/.test(normalized)) return 0;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
