import { useCallback } from 'react';
import { isGuestFeatureAllowed } from '../config/featureAccess';
import { useAuth } from '../context/AuthContext';
import type { HomeFeatureId } from '../types';

export function useFeatureAccess() {
  const { isGuest } = useAuth();
  const canAccess = useCallback((featureId: HomeFeatureId) => isGuestFeatureAllowed(featureId, isGuest), [isGuest]);
  return { isGuest, canAccess };
}
