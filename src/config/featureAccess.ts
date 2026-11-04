/**
 * Developer configuration — guest-restricted features (no UI edits needed).
 * Everything except cloud sync works for guests: their data stays on the device anyway, and
 * locking free features only pushed people away. Sync needs an account to sync to.
 */
export const FEATURE_ACCESS = {
  guestDisabled: ['cloud_sync'] as const,
} as const;

export type GuestRestrictedFeatureId = (typeof FEATURE_ACCESS.guestDisabled)[number];

export function isGuestFeatureAllowed(featureId: string, isGuest: boolean): boolean {
  if (!isGuest) return true;
  return !(FEATURE_ACCESS.guestDisabled as readonly string[]).includes(featureId);
}
