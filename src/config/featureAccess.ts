/**
 * Developer configuration — guest-restricted features (no UI edits needed).
 */
export const FEATURE_ACCESS = {
  guestDisabled: [
    'ai_assistant',
    'cloud_sync',
    'family_mode',
    'statistics',
    'advanced_reminders',
    'themes',
    'widgets',
  ] as const,
} as const;

export type GuestRestrictedFeatureId = (typeof FEATURE_ACCESS.guestDisabled)[number];

export function isGuestFeatureAllowed(featureId: string, isGuest: boolean): boolean {
  if (!isGuest) return true;
  return !(FEATURE_ACCESS.guestDisabled as readonly string[]).includes(featureId);
}
