import { useEffect, type RefObject } from 'react';
import { fireAndForget } from '../../services/fireAndForget';
import type { StoredLocation } from '../../services/location';
import { askNotificationPermissionOnce, schedulePrayerNotifications } from '../../services/notifications';
import type { UserSettings } from '../../types';

/**
 * Asks for notification permission once the introduction is over, when it ended without the
 * "Allow" button, and schedules the prayer notifications if it is given (scheduling never asks).
 */
export function useNotificationPermissionPrompt(
  active: boolean,
  settings: UserSettings,
  hasLocation: boolean,
  settingsRef: RefObject<UserSettings>,
  locationRef: RefObject<StoredLocation | null>
) {
  const { onboardingDone, globalNotificationsEnabled } = settings;
  useEffect(() => {
    if (!active || !onboardingDone || !hasLocation || !globalNotificationsEnabled) return;
    const askThenSchedule = async () => {
      const granted = await askNotificationPermissionOnce({ onboardingDone, hasLocation, notificationsEnabled: globalNotificationsEnabled });
      const loc = locationRef.current;
      if (granted && loc) await schedulePrayerNotifications(loc.latitude, loc.longitude, settingsRef.current);
    };
    fireAndForget(askThenSchedule(), 'notifications.firstPrompt');
  }, [active, onboardingDone, hasLocation, globalNotificationsEnabled, settingsRef, locationRef]);
}
