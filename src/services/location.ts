import * as Location from 'expo-location';
import { getJson, setJson, storageKeys } from './storage';

export interface StoredLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  /** Set when the place was chosen from the city list instead of GPS */
  cityId?: string;
  updatedAt: string;
}

const GPS_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

export async function getCurrentLocation(): Promise<StoredLocation | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return getJson<StoredLocation | null>(storageKeys.lastLocation, null);

  // With location services off, or indoors, a fix may never come: fall back to the last known
  // position, then to the saved place, instead of waiting forever
  const position =
    (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), GPS_TIMEOUT_MS).catch(() => null)) ??
    (await Location.getLastKnownPositionAsync().catch(() => null));
  if (!position) return null;

  let city: string | undefined;
  let country: string | undefined;
  try {
    const [geo] =
      (await withTimeout(
        Location.reverseGeocodeAsync({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        5000
      )) ?? [];
    city = geo?.city ?? geo?.subregion ?? undefined;
    country = geo?.country ?? undefined;
  } catch {
    /* geocode optional */
  }

  const loc: StoredLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    city,
    country,
    updatedAt: new Date().toISOString(),
  };
  await setJson(storageKeys.lastLocation, loc);
  return loc;
}

export async function getCachedLocation(): Promise<StoredLocation | null> {
  return getJson<StoredLocation | null>(storageKeys.lastLocation, null);
}

/** True when location was refused and the system will not ask again (only Settings can change it). */
export async function isLocationPermissionBlocked(): Promise<boolean> {
  try {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    return status !== 'granted' && !canAskAgain;
  } catch {
    return false;
  }
}
