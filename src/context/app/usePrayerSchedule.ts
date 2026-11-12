import { useEffect, useRef, type RefObject } from 'react';
import { AppState } from 'react-native';
import { fireAndForget } from '../../services/fireAndForget';
import { updatePrayerWidget, type WidgetInput } from '../../services/homeWidget';
import type { StoredLocation } from '../../services/location';
import { schedulePrayerNotifications } from '../../services/notifications';
import { prayerScheduleKey } from '../../services/prayerScheduleKey';
import { registerWidgetTask, saveWidgetInput } from '../../services/widgetBackground';
import type { UserSettings } from '../../types';

/** Settings changes often come in bursts (a slider, several toggles) */
const SCHEDULE_DEBOUNCE_MS = 400;
/** Foreground returns extend the notification window at most this often */
const FOREGROUND_RESCHEDULE_MS = 60 * 60 * 1000;

const widgetInput = (loc: StoredLocation, s: UserSettings): WidgetInput => ({
  latitude: loc.latitude,
  longitude: loc.longitude,
  city: loc.city,
  method: s.calculationMethod,
  madhab: s.madhab,
  lang: s.appLanguage,
});

/** Keeps prayer notifications and the home-screen widget in step with the place and settings. */
export function usePrayerSchedule(
  settings: UserSettings,
  location: StoredLocation | null,
  settingsRef: RefObject<UserSettings>,
  locationRef: RefObject<StoredLocation | null>
) {
  // Always call: with notifications switched off it cancels what was scheduled before. Follows only
  // what the notifications depend on, and waits a moment so a burst of changes schedules once
  const lastScheduleRef = useRef(0);
  const scheduleKey = location ? prayerScheduleKey(settings, location) : null;
  useEffect(() => {
    if (!scheduleKey) return;
    const timer = setTimeout(() => {
      const loc = locationRef.current;
      if (!loc) return;
      lastScheduleRef.current = Date.now();
      fireAndForget(schedulePrayerNotifications(loc.latitude, loc.longitude, settingsRef.current), 'schedule.prayers');
    }, SCHEDULE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [scheduleKey, locationRef, settingsRef]);

  const widgetKey = location ? JSON.stringify(widgetInput(location, settings)) : null;
  useEffect(() => {
    const loc = locationRef.current;
    if (!widgetKey || !loc) return;
    const input = widgetInput(loc, settingsRef.current);
    updatePrayerWidget(input);
    // Android refreshes the widget in the background from this copy
    fireAndForget(saveWidgetInput(input).then(registerWidgetTask), 'widget.save');
  }, [widgetKey, locationRef, settingsRef]);

  // Prayer notifications cover a limited number of days; extend the window whenever the app comes
  // back to the foreground (at most once an hour)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const loc = locationRef.current;
      if (state !== 'active' || !loc || Date.now() - lastScheduleRef.current <= FOREGROUND_RESCHEDULE_MS) return;
      lastScheduleRef.current = Date.now();
      const s = settingsRef.current;
      fireAndForget(schedulePrayerNotifications(loc.latitude, loc.longitude, s), 'schedule.foreground');
      updatePrayerWidget(widgetInput(loc, s));
    });
    return () => sub.remove();
  }, [locationRef, settingsRef]);
}
