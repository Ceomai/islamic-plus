import { describe, expect, it } from '@jest/globals';
import { shouldAskNotificationPermission, type NotificationPromptInputs } from '../services/notificationPrompt';

const ready: NotificationPromptInputs = {
  onboardingDone: true,
  hasLocation: true,
  notificationsEnabled: true,
  alreadyAsked: false,
  status: 'undetermined',
  canAskAgain: true,
};

describe('asking for notification permission after the introduction', () => {
  it('asks once the introduction ended without the prompt', () => {
    expect(shouldAskNotificationPermission(ready)).toBe(true);
  });

  it('waits for the introduction, a place and notifications switched on', () => {
    expect(shouldAskNotificationPermission({ ...ready, onboardingDone: false })).toBe(false);
    expect(shouldAskNotificationPermission({ ...ready, hasLocation: false })).toBe(false);
    expect(shouldAskNotificationPermission({ ...ready, notificationsEnabled: false })).toBe(false);
  });

  it('never asks twice on a device', () => {
    expect(shouldAskNotificationPermission({ ...ready, alreadyAsked: true })).toBe(false);
  });

  it('does not ask again after a denial, or when already allowed', () => {
    expect(shouldAskNotificationPermission({ ...ready, status: 'denied' })).toBe(false);
    expect(shouldAskNotificationPermission({ ...ready, status: 'denied', canAskAgain: false })).toBe(false);
    expect(shouldAskNotificationPermission({ ...ready, canAskAgain: false })).toBe(false);
    expect(shouldAskNotificationPermission({ ...ready, status: 'granted' })).toBe(false);
  });
});
