/** Compass math for the Qibla screen (pure, so it can be tested without a sensor). */

/** Turn into the -180..180 range: the shortest signed way around. */
export function normalizeDelta(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** 0..360 */
export function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Signed shortest turn from `from` to `to`, in degrees (-180..180). Positive = turn right. */
export function turnDelta(from: number, to: number): number {
  return normalizeDelta(to - from);
}

/**
 * Follows a 0–360° compass reading with a continuous angle: crossing north goes from 359 to 360,
 * not back to 0, so a rotation driven by it never spins the long way round. `alpha` is a low-pass
 * filter (0..1, smaller = calmer) that takes out sensor jitter.
 */
export function smoothHeading(previous: number | null, reading: number, alpha: number): number {
  if (previous === null) return reading;
  return previous + normalizeDelta(reading - previous) * alpha;
}

/** Hysteresis: become aligned within `enter` degrees, stay aligned until past `exit` degrees. */
export function nextAligned(wasAligned: boolean, offBy: number, enter: number, exit: number): boolean {
  return Math.abs(offBy) <= (wasAligned ? exit : enter);
}
