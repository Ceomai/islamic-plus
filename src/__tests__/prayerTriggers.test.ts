import { describe, expect, it, jest } from '@jest/globals';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { buildPrayerTriggers, REFRESH_NOTICE_ID } from '../services/prayerTriggers';
import { getPrayerDates } from '../services/prayerTimes';
import type { CustomReminder, PrayerName, UserSettings } from '../types';
import { addDays, localDateKey } from '../utils/date';

jest.mock('expo-notifications', () => ({
  setNotificationCategoryAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(() => Promise.resolve()),
  registerTaskAsync: jest.fn(),
}));

// Tests run in Europe/Istanbul (jest.global-setup.js); Thursday 15 January 2026, 10:00
const NOW = new Date(2026, 0, 15, 10, 0, 0);
const ISTANBUL = { latitude: 41.0082, longitude: 28.9784 };
const PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function settingsWith(patch: Partial<UserSettings> = {}): UserSettings {
  return { ...DEFAULT_SETTINGS, ...patch };
}

/** Prayer times of the day `offset` days after NOW, computed the way the builder does (at noon) */
function timesOn(offset: number, settings: UserSettings = DEFAULT_SETTINGS) {
  const day = addDays(NOW, offset);
  day.setHours(12, 0, 0, 0);
  return getPrayerDates(ISTANBUL.latitude, ISTANBUL.longitude, day, settings.calculationMethod, settings.madhab);
}

const ids = (settings: UserSettings, now = NOW) => buildPrayerTriggers(settings, ISTANBUL, now, 'user-1').map((t) => t.identifier);

describe('buildPrayerTriggers', () => {
  it('schedules every enabled prayer for seven days and skips the ones already past', () => {
    const list = ids(settingsWith());
    // 10:00: today's Fajr is over, Dhuhr is still ahead
    expect(timesOn(0).fajr.getTime()).toBeLessThan(NOW.getTime());
    expect(timesOn(0).dhuhr.getTime()).toBeGreaterThan(NOW.getTime());
    expect(list).not.toContain('prayer-fajr-0');
    expect(list.slice(0, 4)).toEqual(['prayer-dhuhr-0', 'prayer-asr-0', 'prayer-maghrib-0', 'prayer-isha-0']);
    for (let day = 1; day < 7; day++) for (const p of PRAYERS) expect(list).toContain(`prayer-${p}-${day}`);
    expect(list).not.toContain('prayer-fajr-7');
    expect(list).toHaveLength(4 + 6 * 5 + 1);
  });

  it('fires at the prayer time of each day, with the prayer, day and account in the data', () => {
    const triggers = buildPrayerTriggers(settingsWith(), ISTANBUL, NOW, 'user-1');
    const asrTomorrow = triggers.find((t) => t.identifier === 'prayer-asr-1');
    expect(asrTomorrow?.date.getTime()).toBe(timesOn(1).asr.getTime());
    expect(asrTomorrow?.content).toMatchObject({
      title: expect.stringContaining('Asr'),
      sound: 'default',
      categoryIdentifier: 'prayer',
      data: { prayer: 'asr', date: localDateKey(addDays(NOW, 1)), scope: 'user-1' },
    });
    for (const t of triggers.filter((x) => x.identifier !== REFRESH_NOTICE_ID)) {
      const [, prayer, day] = t.identifier.split('-');
      expect(t.content.data).toEqual({ prayer, date: localDateKey(addDays(NOW, Number(day))), scope: 'user-1' });
    }
  });

  it('keeps a null scope for a guest', () => {
    const first = buildPrayerTriggers(settingsWith(), ISTANBUL, NOW, null)[0];
    expect(first.content.data?.scope).toBeNull();
  });

  it('moves a prayer earlier by its advance minutes and drops it when that moment has passed', () => {
    const base = settingsWith();
    const settings = settingsWith({
      prayerNotifications: { ...base.prayerNotifications, dhuhr: { ...base.prayerNotifications.dhuhr, advanceMinutes: 15 } },
    });
    const dhuhrTomorrow = buildPrayerTriggers(settings, ISTANBUL, NOW, null).find((t) => t.identifier === 'prayer-dhuhr-1');
    expect(dhuhrTomorrow?.date.getTime()).toBe(timesOn(1).dhuhr.getTime() - 15 * 60000);

    // Ten minutes before Dhuhr, a 15-minute warning is already too late for today
    const tenBefore = new Date(timesOn(0).dhuhr.getTime() - 10 * 60000);
    expect(ids(settings, tenBefore)).not.toContain('prayer-dhuhr-0');
    expect(ids(base, tenBefore)).toContain('prayer-dhuhr-0');
  });

  it('leaves out prayers turned off on a date or a weekday', () => {
    const friday = addDays(NOW, 1); // 16 January 2026
    expect(friday.getDay()).toBe(5);
    const list = ids(
      settingsWith({
        disabledPrayerRules: [
          { prayer: 'asr', daysOfWeek: [], specificDates: [localDateKey(addDays(NOW, 2))] },
          { prayer: 'dhuhr', daysOfWeek: [5], specificDates: [] },
        ],
      })
    );
    expect(list).not.toContain('prayer-asr-2');
    expect(list).toContain('prayer-asr-1');
    expect(list).toContain('prayer-asr-3');
    expect(list).not.toContain('prayer-dhuhr-1');
    expect(list).toContain('prayer-dhuhr-2');
  });

  it('schedules nothing for a prayer whose notification is off', () => {
    const base = settingsWith();
    const list = ids(settingsWith({ prayerNotifications: { ...base.prayerNotifications, isha: { ...base.prayerNotifications.isha, enabled: false } } }));
    expect(list.some((id) => id.startsWith('prayer-isha-'))).toBe(false);
    expect(list).toContain('prayer-maghrib-1');
  });

  it('uses the channel of the chosen sound', () => {
    const base = settingsWith();
    const triggers = buildPrayerTriggers(
      settingsWith({
        prayerNotifications: {
          ...base.prayerNotifications,
          asr: { ...base.prayerNotifications.asr, sound: 'silent' },
          maghrib: { ...base.prayerNotifications.maghrib, sound: 'adhan_short' },
        },
      }),
      ISTANBUL,
      NOW,
      null
    );
    const byId = (id: string) => triggers.find((t) => t.identifier === id);
    expect(byId('prayer-asr-1')).toMatchObject({ channelId: 'prayer-silent-v1', content: { sound: undefined } });
    expect(byId('prayer-maghrib-1')).toMatchObject({ channelId: 'prayer-adhan-v1', content: { sound: 'adhan_short.wav' } });
    expect(byId('prayer-isha-1')).toMatchObject({ channelId: 'prayer-times-v2', content: { sound: 'default' } });
  });

  describe('refresh notice', () => {
    it('comes at 21:00 on the last scheduled day', () => {
      const triggers = buildPrayerTriggers(settingsWith(), ISTANBUL, NOW, null);
      const notice = triggers[triggers.length - 1];
      expect(notice.identifier).toBe(REFRESH_NOTICE_ID);
      expect(notice.date).toEqual(new Date(2026, 0, 21, 21, 0, 0));
      expect(notice.content).toEqual({ title: expect.any(String), body: expect.any(String) });
      expect(notice.channelId).toBe('prayer-times-v2');
    });

    it('moves earlier when custom reminders use part of the notification budget', () => {
      // 30 reminder slots leave room for 5 days of five prayers (60 − 1 notice − 30 = 29)
      const reminders: CustomReminder[] = Array.from({ length: 5 }, (_, i) => ({
        id: `r${i}`,
        title: 'x',
        time: '08:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5],
        type: 'dhikr',
        enabled: true,
        sound: 'default',
      }));
      const list = ids(settingsWith({ customReminders: reminders }));
      expect(list).toContain('prayer-isha-4');
      expect(list).not.toContain('prayer-fajr-5');
      const notice = buildPrayerTriggers(settingsWith({ customReminders: reminders }), ISTANBUL, NOW, null).at(-1);
      expect(notice?.date).toEqual(new Date(2026, 0, 19, 21, 0, 0));
    });

    it('is not scheduled when every prayer notification is off', () => {
      const base = settingsWith();
      const off = Object.fromEntries(PRAYERS.map((p) => [p, { ...base.prayerNotifications[p], enabled: false }]));
      expect(buildPrayerTriggers(settingsWith({ prayerNotifications: { ...base.prayerNotifications, ...off } }), ISTANBUL, NOW, null)).toEqual([]);
    });
  });
});
