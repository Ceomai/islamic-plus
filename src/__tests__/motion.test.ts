import { describe, expect, it } from '@jest/globals';
import { webPrefersReducedMotion } from '../hooks/useReducedMotion';
import { nextAligned, normalizeDelta, smoothHeading, turnDelta, wrap360 } from '../services/compass';
import { tasbihHaptic } from '../services/tasbihFeedback';
import { applyOverrides, reconcileOverrides, withOverride } from '../utils/optimistic';

describe('compass angle unwrapping', () => {
  it('normalizes any turn into -180..180', () => {
    expect(normalizeDelta(10)).toBe(10);
    expect(normalizeDelta(350)).toBe(-10);
    expect(normalizeDelta(-350)).toBe(10);
    expect(normalizeDelta(720 + 30)).toBe(30);
    expect(wrap360(-10)).toBe(350);
    expect(wrap360(370)).toBe(10);
  });

  it('turns the short way to the qibla', () => {
    expect(turnDelta(350, 10)).toBe(20);
    expect(turnDelta(10, 350)).toBe(-20);
  });

  it('keeps counting past north instead of jumping back to 0', () => {
    // 350 → 10 is a 20° turn to the right, so the continuous angle goes to 370, not 10
    expect(smoothHeading(350, 10, 1)).toBe(370);
    expect(smoothHeading(10, 350, 1)).toBe(-10);
    let angle: number | null = null;
    for (const reading of [340, 350, 0, 10, 20]) angle = smoothHeading(angle, reading, 1);
    expect(angle).toBe(380);
  });

  it('low-pass filters jitter toward the new reading', () => {
    expect(smoothHeading(null, 90, 0.2)).toBe(90);
    expect(smoothHeading(90, 100, 0.2)).toBeCloseTo(92);
    // Across north the filter still moves the short way
    expect(smoothHeading(355, 5, 0.2)).toBeCloseTo(357);
  });
});

describe('qibla alignment hysteresis', () => {
  it('becomes aligned within 5° and stays until past 8°', () => {
    expect(nextAligned(false, 6, 5, 8)).toBe(false);
    expect(nextAligned(false, -4.9, 5, 8)).toBe(true);
    expect(nextAligned(true, 7, 5, 8)).toBe(true);
    expect(nextAligned(true, -7.9, 5, 8)).toBe(true);
    expect(nextAligned(true, 8.1, 5, 8)).toBe(false);
  });
});

describe('optimistic prayer marks', () => {
  const stored = new Set(['fajr']);

  it('shows a tap before storage confirms it', () => {
    const overrides = withOverride(new Map(), 'dhuhr', true);
    expect([...applyOverrides(stored, overrides)].sort()).toEqual(['dhuhr', 'fajr']);
    expect([...applyOverrides(stored, withOverride(overrides, 'fajr', false))]).toEqual(['dhuhr']);
  });

  it('drops an override once storage agrees, keeps one still on its way', () => {
    const overrides = withOverride(withOverride(new Map(), 'dhuhr', true), 'asr', true);
    const confirmed = new Set(['fajr', 'dhuhr']);
    const next = reconcileOverrides(overrides, confirmed);
    expect([...next.keys()]).toEqual(['asr']);
    expect([...applyOverrides(confirmed, next)].sort()).toEqual(['asr', 'dhuhr', 'fajr']);
  });

  it('keeps a second tap that storage has not caught up with', () => {
    // Marked, then unmarked before the first write was confirmed
    const overrides = withOverride(new Map(), 'isha', false);
    const afterFirstWrite = new Set(['isha']);
    expect(reconcileOverrides(overrides, afterFirstWrite)).toBe(overrides);
    expect(applyOverrides(afterFirstWrite, overrides).has('isha')).toBe(false);
  });

  it('falls back to the stored state when an override is cleared (failed write)', () => {
    const overrides = withOverride(withOverride(new Map(), 'maghrib', true), 'maghrib', undefined);
    expect(applyOverrides(stored, overrides)).toEqual(stored);
  });
});

describe('tasbih haptics', () => {
  const tap = { tesbihat: true, roundComplete: false, setComplete: false, goalReached: false };

  it('ticks lightly on an ordinary tap', () => {
    expect(tasbihHaptic(tap)).toBe('tap');
  });

  it('marks a finished tesbihat phrase as a step and the finished set as a success', () => {
    expect(tasbihHaptic({ ...tap, roundComplete: true })).toBe('step');
    expect(tasbihHaptic({ ...tap, roundComplete: true, setComplete: true })).toBe('success');
    expect(tasbihHaptic({ ...tap, tesbihat: false, roundComplete: true, setComplete: true })).toBe('success');
  });

  it('plays one success when the goal and a round end land on the same tap', () => {
    expect(tasbihHaptic({ ...tap, roundComplete: true, goalReached: true })).toBe('success');
    expect(tasbihHaptic({ ...tap, goalReached: true })).toBe('success');
  });
});

describe('reduced motion on the web', () => {
  it('reads the prefers-reduced-motion media query', () => {
    const host = (matches: boolean) => ({ matchMedia: (q: string) => ({ matches: matches && q.includes('reduce') }) });
    expect(webPrefersReducedMotion(host(true))).toBe(true);
    expect(webPrefersReducedMotion(host(false))).toBe(false);
  });

  it('falls back to full motion without matchMedia', () => {
    expect(webPrefersReducedMotion(undefined)).toBe(false);
    expect(webPrefersReducedMotion({})).toBe(false);
    expect(
      webPrefersReducedMotion({
        matchMedia: () => {
          throw new Error('unsupported');
        },
      })
    ).toBe(false);
  });
});
