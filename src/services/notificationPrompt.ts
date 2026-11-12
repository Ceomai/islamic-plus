export interface NotificationPromptInputs {
  onboardingDone: boolean;
  hasLocation: boolean;
  notificationsEnabled: boolean;
  /** The system prompt was already shown on this device (onboarding, settings or this check) */
  alreadyAsked: boolean;
  /** Current system permission, as expo-notifications reports it ('granted' | 'denied' | 'undetermined') */
  status: string;
  canAskAgain: boolean;
}

/**
 * Whether the app should show the system notification prompt by itself. Someone who skipped
 * "Allow" in the introduction (or never saw it) would otherwise keep notifications switched on in
 * the app with nothing ever scheduled. Asked once per device and never after a denial: from then
 * on the banner in notification settings is the way back.
 */
export function shouldAskNotificationPermission(inputs: NotificationPromptInputs): boolean {
  return (
    inputs.onboardingDone &&
    inputs.hasLocation &&
    inputs.notificationsEnabled &&
    !inputs.alreadyAsked &&
    inputs.status === 'undetermined' &&
    inputs.canAskAgain
  );
}
