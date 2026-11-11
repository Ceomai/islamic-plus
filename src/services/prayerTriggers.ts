import { getPrayerLabel, translate } from '../i18n';
import type { DisabledPrayerRule, PrayerName, UserSettings } from '../types';
import { localDateKey } from '../utils/date';
import { prayerDaysAhead } from './notificationBudget';
import { PRAYER_CATEGORY } from './prayerAction';
import { getPrayerDates } from './prayerTimes';

/**
 * Android channel. v2 replaces the original "prayer-times" channel, which pointed at an adhan
 * sound file that was never bundled; channel sounds can't be changed once a channel exists.
 */
export const PRAYER_CHANNEL_ID = 'prayer-times-v2';
/** Android plays the channel's sound, not the notification's, so each sound choice has a channel */
export const ADHAN_CHANNEL_ID = 'prayer-adhan-v1';
export const SILENT_CHANNEL_ID = 'prayer-silent-v1';
/** Bundled through the expo-notifications plugin (app.json); 28 s, under iOS's 30 s limit */
export const ADHAN_SOUND_FILE = 'adhan_short.wav';
/** Identifier of the "open the app to keep the alerts coming" notice on the last evening */
export const REFRESH_NOTICE_ID = 'prayer-refresh';

const NOTIFY_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function soundFor(sound: string | undefined): { sound?: string; channelId: string } {
  if (sound === 'silent') return { sound: undefined, channelId: SILENT_CHANNEL_ID };
  if (sound === 'adhan_short' || sound === 'adhan_full') return { sound: ADHAN_SOUND_FILE, channelId: ADHAN_CHANNEL_ID };
  return { sound: 'default', channelId: PRAYER_CHANNEL_ID };
}

function isPrayerDisabled(prayer: PrayerName, date: Date, rules: DisabledPrayerRule[]): boolean {
  const dateStr = localDateKey(date);
  const dayOfWeek = date.getDay();
  return rules.some(
    (r) => r.prayer === prayer && (r.specificDates.includes(dateStr) || r.daysOfWeek.includes(dayOfWeek))
  );
}

/** One notification to schedule; `channelId` goes into the content on Android only */
export interface PrayerTrigger {
  identifier: string;
  content: {
    title: string;
    body: string;
    sound?: string;
    categoryIdentifier?: string;
    data?: { prayer: PrayerName; date: string; scope: string | null };
  };
  channelId: string;
  date: Date;
}

/**
 * The prayer notifications for the coming days (as many as the notification budget allows) and,
 * when any prayer is on, a notice on the last evening that the alerts end unless the app is opened.
 * Triggers at or before `now` are left out. `scope` is the account a "Prayed" tap is applied to.
 */
export function buildPrayerTriggers(
  settings: UserSettings,
  coords: { latitude: number; longitude: number },
  now: Date,
  scope: string | null
): PrayerTrigger[] {
  const lang = settings.appLanguage;
  const triggers: PrayerTrigger[] = [];
  // Shares iOS's 64-notification limit with custom reminders (see notificationBudget)
  const perDay = NOTIFY_PRAYERS.filter((p) => settings.prayerNotifications[p]?.enabled).length;
  const daysAhead = prayerDaysAhead(settings.customReminders ?? [], perDay);

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(12, 0, 0, 0);

    // Use the computed Date objects directly: formatting to a clock string and parsing it back
    // depended on the device locale (e.g. Turkish "ÖS" instead of "PM").
    const times = getPrayerDates(coords.latitude, coords.longitude, date, settings.calculationMethod, settings.madhab);

    for (const prayer of NOTIFY_PRAYERS) {
      const notifSettings = settings.prayerNotifications[prayer];
      if (!notifSettings?.enabled) continue;
      if (isPrayerDisabled(prayer, date, settings.disabledPrayerRules)) continue;

      const triggerDate = new Date(times[prayer].getTime() - (notifSettings.advanceMinutes ?? 0) * 60000);
      if (triggerDate <= now) continue;

      const prayerLabel = getPrayerLabel(lang, prayer);
      const tone = soundFor(notifSettings.sound);
      triggers.push({
        identifier: `prayer-${prayer}-${dayOffset}`,
        content: {
          title: translate(lang, 'notifications.title', { prayer: prayerLabel }),
          body: translate(lang, 'notifications.body', { prayer: prayerLabel }),
          sound: tone.sound,
          categoryIdentifier: PRAYER_CATEGORY,
          data: { prayer, date: localDateKey(date), scope },
        },
        channelId: tone.channelId,
        date: triggerDate,
      });
    }
  }

  // The window ends after daysAhead days unless the app is opened again; say so on the last evening
  if (perDay > 0) {
    const notice = new Date(now);
    notice.setDate(notice.getDate() + daysAhead - 1);
    notice.setHours(21, 0, 0, 0);
    if (notice > now) {
      triggers.push({
        identifier: REFRESH_NOTICE_ID,
        content: {
          title: translate(lang, 'notifications.refreshTitle'),
          body: translate(lang, 'notifications.refreshBody'),
        },
        channelId: PRAYER_CHANNEL_ID,
        date: notice,
      });
    }
  }
  return triggers;
}
