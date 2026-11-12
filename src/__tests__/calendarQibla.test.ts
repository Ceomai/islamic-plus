import { describe, expect, it } from '@jest/globals';
import { gregorianToHijri, hijriToGregorian } from '../services/hijriCalendar';
import { getDistanceToKaaba, getQiblaBearing } from '../services/qibla';

/**
 * The app uses the Umm al-Qura calendar (hijri-converter). Expected dates are the Umm al-Qura dates
 * Saudi Arabia announced: Ramadan 1446 began on 1 March 2025, Eid al-Adha 1446 was 6 June 2025,
 * 1 Muharram 1447 was 26 June 2025, and Umm al-Qura puts 1 Ramadan 1447 on 18 February 2026
 * and Eid al-Fitr 1447 on 20 March 2026. A local moon sighting can differ by a day.
 */
describe('gregorianToHijri (Umm al-Qura)', () => {
  it.each([
    [new Date(2025, 2, 1), { day: 1, month: 9, year: 1446 }],
    [new Date(2025, 5, 6), { day: 10, month: 12, year: 1446 }],
    [new Date(2026, 1, 18), { day: 1, month: 9, year: 1447 }],
    [new Date(2026, 2, 20), { day: 1, month: 10, year: 1447 }],
  ])('%s', (date, expected) => {
    expect(gregorianToHijri(date)).toMatchObject(expected);
  });

  it('turns the year between 29 Dhu al-Hijjah 1446 and 1 Muharram 1447', () => {
    expect(gregorianToHijri(new Date(2025, 5, 25))).toMatchObject({ day: 29, month: 12, year: 1446 });
    expect(gregorianToHijri(new Date(2025, 5, 26))).toMatchObject({ day: 1, month: 1, year: 1447 });
  });

  it('names the month in the app language', () => {
    expect(gregorianToHijri(new Date(2026, 1, 18), 'en').formatted).toBe('1 Ramadan 1447 AH');
    expect(gregorianToHijri(new Date(2026, 1, 18), 'tr').formatted).toBe('1 Ramazan 1447');
  });

  it('converts back to the same Gregorian day', () => {
    expect(hijriToGregorian(1447, 9, 1)).toEqual(new Date(2026, 1, 18));
    expect(hijriToGregorian(1446, 12, 10)).toEqual(new Date(2025, 5, 6));
  });
});

describe('qibla', () => {
  it('points south-south-east from Istanbul, about 2,400 km away', () => {
    // Published great-circle qibla for Istanbul: 151.6°
    expect(getQiblaBearing(41.0082, 28.9784)).toBeCloseTo(151.6, 1);
    expect(getDistanceToKaaba(41.0082, 28.9784)).toBeGreaterThan(2380);
    expect(getDistanceToKaaba(41.0082, 28.9784)).toBeLessThan(2420);
  });

  it('points north-east from New York (great circle, not the map line)', () => {
    // Published great-circle qibla for New York: 58.5°
    expect(getQiblaBearing(40.7128, -74.006)).toBeCloseTo(58.5, 1);
  });

  it('is a few kilometres away in Mecca city centre and zero at the Kaaba', () => {
    expect(getDistanceToKaaba(21.3891, 39.8579)).toBeLessThan(6);
    expect(getDistanceToKaaba(21.4225, 39.8262)).toBeCloseTo(0, 6);
  });

  it('points due south from a place due north of the Kaaba and due north from one due south', () => {
    expect(getQiblaBearing(60, 39.8262)).toBeCloseTo(180, 6);
    expect(getQiblaBearing(-10, 39.8262)).toBeCloseTo(0, 6);
  });

  it('gives a sensible bearing and distance near the pole (Longyearbyen, Svalbard)', () => {
    const bearing = getQiblaBearing(78.2232, 15.6267);
    expect(bearing).toBeGreaterThan(150);
    expect(bearing).toBeLessThan(156);
    // 56.8° of latitude south and a little east: roughly 6,400 km
    expect(getDistanceToKaaba(78.2232, 15.6267)).toBeGreaterThan(6300);
    expect(getDistanceToKaaba(78.2232, 15.6267)).toBeLessThan(6600);
  });

  it('always returns a bearing in [0, 360)', () => {
    for (const [lat, lng] of [[51.5, -0.12], [-33.9, 151.2], [35.7, 139.7], [64.1, -21.9], [-54.8, -68.3]]) {
      const b = getQiblaBearing(lat, lng);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
    }
  });
});
