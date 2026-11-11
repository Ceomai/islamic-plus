import { useCallback, useMemo, type RefObject } from 'react';
import type { City } from '../../data/cities';
import { useRefState } from '../../hooks/useRefState';
import { logError } from '../../services/errorLog';
import { getCurrentLocation, isSameLocation, type StoredLocation } from '../../services/location';
import { setJson, storageKeys } from '../../services/storage';
import { notifyAppDataChanged } from '../../services/userDataCloud';
import type { UserSettings } from '../../types';
import type { LocationSlice } from './slices';

/** The place prayer times are computed for: GPS or a city picked from the list. */
export function useLocationState(settingsRef: RefObject<UserSettings>) {
  const [location, setLocation, locationRef] = useRefState<StoredLocation | null>(null);

  // Prayer notifications follow the location/settings effect, so only state is set here
  const refreshLocation = useCallback(async () => {
    let loc: StoredLocation | null;
    try {
      loc = await getCurrentLocation();
    } catch (e) {
      // The permission request itself can fail (no activity, system error): same as no fix
      void logError(e, 'promise');
      return false;
    }
    if (!loc) return false;
    // Opening Home or Qibla refreshes the fix; standing in the same place changes nothing
    if (isSameLocation(locationRef.current, loc)) return true;
    setLocation(loc);
    notifyAppDataChanged();
    return true;
  }, [locationRef, setLocation]);

  const setManualLocation = useCallback(
    async (city: City) => {
      const loc: StoredLocation = {
        latitude: city.latitude,
        longitude: city.longitude,
        city: settingsRef.current.appLanguage === 'tr' ? city.tr : city.en,
        country: city.country,
        cityId: city.id,
        updatedAt: new Date().toISOString(),
      };
      await setJson(storageKeys.lastLocation, loc);
      setLocation(loc);
      notifyAppDataChanged();
    },
    [settingsRef, setLocation]
  );

  const locationValue = useMemo<LocationSlice>(
    () => ({ location, refreshLocation, setManualLocation }),
    [location, refreshLocation, setManualLocation]
  );

  return { location, setLocation, locationRef, locationValue };
}
