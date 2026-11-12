export type TasbihHaptic = 'tap' | 'step' | 'success';

/**
 * The one haptic a counter tap plays. Success marks a finished set (the last tesbihat phrase, or a
 * round of a single dhikr) or the daily goal; when both land on the same tap it still plays once.
 * Finishing an intermediate tesbihat phrase is a step; every other tap is a light tick.
 */
export function tasbihHaptic(tap: { tesbihat: boolean; roundComplete: boolean; setComplete: boolean; goalReached: boolean }): TasbihHaptic {
  if (tap.goalReached || tap.setComplete || (tap.roundComplete && !tap.tesbihat)) return 'success';
  if (tap.roundComplete) return 'step';
  return 'tap';
}
