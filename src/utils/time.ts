const MINUTE_STEP = 5;
const pad = (n: number) => String(n).padStart(2, '0');

/** Moves an "HH:MM" time by whole hours or by 5-minute steps, wrapping around midnight. */
export function stepTime(value: string, unit: 'hour' | 'minute', dir: 1 | -1): string {
  const [h, m] = value.split(':').map(Number);
  const hours = Number.isFinite(h) ? h : 8;
  const minutes = Number.isFinite(m) ? m : 0;
  if (unit === 'hour') return `${pad((hours + dir + 24) % 24)}:${pad(minutes)}`;
  // Off-grid minutes (07:32) snap to the 5-minute grid in the direction pressed
  const snapped = dir > 0 ? Math.floor(minutes / MINUTE_STEP) * MINUTE_STEP + MINUTE_STEP : Math.ceil(minutes / MINUTE_STEP) * MINUTE_STEP - MINUTE_STEP;
  const total = (hours * 60 + snapped + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
