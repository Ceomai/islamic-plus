import React, { useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { isLocationPermissionBlocked } from '../services/location';
import { AppText, Button, Surface } from '../ui';

/**
 * Shown when location was denied for good: the in-app "use my location" button can no longer
 * ask, so the only way forward is the system Settings page. Re-checks when the app returns.
 */
export function LocationBlockedNotice({ recheckKey }: { recheckKey?: unknown }) {
  const { space } = useTheme();
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const check = () => void isLocationPermissionBlocked().then(setBlocked);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [recheckKey]);

  if (!blocked) return null;
  return (
    <Surface variant="muted" style={{ alignSelf: 'stretch', gap: space[3], marginTop: space[4] }}>
      <AppText variant="callout" tone="secondary">
        {t('common.locationBlocked')}
      </AppText>
      <Button label={t('common.openSettings')} icon="settings-outline" variant="secondary" onPress={() => void Linking.openSettings()} />
    </Surface>
  );
}
