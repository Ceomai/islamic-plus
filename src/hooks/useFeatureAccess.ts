import { isGuestFeatureAllowed } from '../config/featureAccess';
import { useAuth } from '../context/AuthContext';

export function useFeatureAccess() {
  const { isGuest } = useAuth();
  const canAccess = (featureId: string) => isGuestFeatureAllowed(featureId, isGuest);
  return { isGuest, canAccess };
}
