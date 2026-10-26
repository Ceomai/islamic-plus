import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { NavigationState } from '@react-navigation/native';
import {
  trackAppOpen,
  trackScreenEnter,
  trackScreenLeave,
} from '../services/cloudAnalytics';

function getActiveRouteName(state: NavigationState | undefined): string | undefined {
  if (!state) return undefined;
  const index = state.index ?? 0;
  const route = state.routes[index];
  if (!route) return undefined;
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name;
}

export function useNavigationAnalytics() {
  const routeNameRef = useRef<string | undefined>(undefined);
  const startTimeRef = useRef<number>(Date.now());
  const appOpenLoggedRef = useRef(false);

  const leaveCurrentScreen = useCallback(async () => {
    const previous = routeNameRef.current;
    if (!previous) return;
    const duration = Date.now() - startTimeRef.current;
    await trackScreenLeave(previous, duration);
  }, []);

  const onNavigationStateChange = useCallback(
    async (state: NavigationState | undefined) => {
      const current = getActiveRouteName(state);
      if (!current) return;

      if (!appOpenLoggedRef.current) {
        appOpenLoggedRef.current = true;
        void trackAppOpen();
      }

      if (current === routeNameRef.current) return;

      await leaveCurrentScreen();
      routeNameRef.current = current;
      startTimeRef.current = Date.now();
      await trackScreenEnter(current);
    },
    [leaveCurrentScreen]
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        void leaveCurrentScreen();
      }
      if (next === 'active' && routeNameRef.current) {
        startTimeRef.current = Date.now();
        void trackScreenEnter(routeNameRef.current);
      }
    });
    return () => sub.remove();
  }, [leaveCurrentScreen]);

  return { onNavigationStateChange };
}
