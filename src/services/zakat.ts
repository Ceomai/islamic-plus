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
