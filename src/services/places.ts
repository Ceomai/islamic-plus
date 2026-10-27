import { getSupabase } from '../config/supabase';
import type { NearbyPlace } from '../types';

/** Supabase Edge Function "places" (Google Places / cached OSM); on with EXPO_PUBLIC_PLACES_PROXY=1 */
const PROXY_ENABLED = process.env.EXPO_PUBLIC_PLACES_PROXY === '1';
const PROXY_TIMEOUT_MS = 60000;

async function fetchViaProxy(latitude: number, longitude: number, type: NearbyPlace['type'], radius: number): Promise<NearbyPlace[] | null> {
  const supabase = getSupabase();
  if (!PROXY_ENABLED || !supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('places', {
      body: { latitude, longitude, type, radius },
      timeout: PROXY_TIMEOUT_MS,
    });
    if (error || !Array.isArray(data?.places)) return null;
    return data.places as NearbyPlace[];
  } catch {
    return null;
  }
}

/** Public Overpass instances; the main one can take 30+ seconds when busy. */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
/** A mirror joins in when the previous request has not answered after this long */
const HEDGE_AFTER_MS = 6000;
const TOTAL_TIMEOUT_MS = 45000;
const CACHE_TTL_MS = 10 * 60 * 1000;

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: { name?: string; 'addr:street'?: string } & Record<string, string | undefined>;
}
interface OverpassResponse {
  elements?: OverpassElement[];
}

const cache = new Map<string, { at: number; points: RawPoint[] }>();

/** Ask the endpoints one after another (staggered) and keep the first good answer. */
async function queryOverpass(query: string): Promise<OverpassResponse> {
  const controllers = OVERPASS_ENDPOINTS.map(() => new AbortController());
  const abortAll = () => controllers.forEach((c) => c.abort());
  const timer = setTimeout(abortAll, TOTAL_TIMEOUT_MS);
  const attempts = OVERPASS_ENDPOINTS.map(
    (url, i) =>
      new Promise<OverpassResponse>((resolve, reject) => {
        const start = setTimeout(async () => {
          try {
            const res = await fetch(url, {
              method: 'POST',
              body: `data=${encodeURIComponent(query)}`,
              // Overpass refuses requests without a meaningful User-Agent; browsers ignore this header
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'IslamicPlus/1.0 (nearby mosque search; mobile app)' },
              signal: controllers[i].signal,
            });
            if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
            resolve(await res.json());
          } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        }, i * HEDGE_AFTER_MS);
        controllers[i].signal.addEventListener('abort', () => {
          clearTimeout(start);
          reject(new Error('Overpass request cancelled'));
        });
      })
  );
  try {
    return await Promise.any(attempts);
  } catch {
    throw new Error('Overpass unavailable');
  } finally {
    clearTimeout(timer);
    abortAll();
  }
}

/**
 * Nearby places: the server proxy first when enabled (Google Places for signed-in users), then
 * OpenStreetMap from the device: Overpass for the full list, Nominatim when Overpass is slow.
 */
export async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  type: 'mosque' | 'prayer_room' | 'halal_restaurant',
  radiusMeters = 5000,
  /** Place names in this language when OSM has them (otherwise the local name) */
  lang = 'tr'
): Promise<NearbyPlace[]> {
  const proxied = await fetchViaProxy(latitude, longitude, type, radiusMeters);
  if (proxied) return proxied;

  const osmFilters: Record<string, string> = {
    mosque: '["amenity"="place_of_worship"]["religion"="muslim"]',
    prayer_room: '["amenity"="place_of_worship"]["religion"="muslim"]',
    halal_restaurant:
      '["amenity"~"restaurant|fast_food"]["diet:halal"="yes"]',
  };

  const filter = osmFilters[type] ?? osmFilters.mosque;
  const query = `
    [out:json][timeout:25];
    (
      node${filter}(around:${radiusMeters},${latitude},${longitude});
      way${filter}(around:${radiusMeters},${latitude},${longitude});
    );
    out center 30;
  `;

  const toPlaces = (points: RawPoint[]): NearbyPlace[] =>
    points
      .map((p) => ({
        id: p.id,
        name: p.name || (type === 'halal_restaurant' ? 'Halal Restaurant' : 'Mosque'),
        latitude: p.lat,
        longitude: p.lon,
        distanceKm: Math.round(haversineKm(latitude, longitude, p.lat, p.lon) * 10) / 10,
        address: p.address,
        type,
        source: 'osm' as const,
      }))
      .filter((p) => p.distanceKm * 1000 <= radiusMeters)
      .sort((a, b) => a.distanceKm - b.distanceKm);

  // ~100 m grid so small GPS jitter reuses the last result
  const cacheKey = `${lang}:${type}:${radiusMeters}:${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return toPlaces(cached.points);

  // Overpass has the complete list; when it is busy, Nominatim answers quickly with the main places
  const full = queryOverpass(query).then((data) => {
    const points = overpassPoints(data, lang);
    cache.set(cacheKey, { at: Date.now(), points });
    return points;
  });
  const quick = await Promise.race([full.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), OVERPASS_PATIENCE_MS))]);
  if (quick) return toPlaces(quick);
  try {
    const points = await searchNominatim(latitude, longitude, type, radiusMeters, lang);
    if (points.length > 0) return toPlaces(points);
  } catch {
    // fall through to the slower full answer
  }
  // Surface a failure instead of inventing places the user might try to walk to
  return toPlaces(await full);
}

interface RawPoint {
  id: string;
  name?: string;
  lat: number;
  lon: number;
  address?: string;
}

function overpassPoints(data: OverpassResponse, lang: string): RawPoint[] {
  return (data.elements ?? [])
    .map((el) => ({ el, lat: el.lat ?? el.center?.lat, lon: el.lon ?? el.center?.lon }))
    .filter((x): x is { el: OverpassElement; lat: number; lon: number } => x.lat != null && x.lon != null)
    .map(({ el, lat, lon }) => ({ id: String(el.id), name: el.tags?.[`name:${lang}`] ?? el.tags?.name, lat, lon, address: el.tags?.['addr:street'] }));
}

/** Overpass gets this long before the quicker Nominatim search answers instead */
const OVERPASS_PATIENCE_MS = 12000;
const NOMINATIM_QUERY: Record<NearbyPlace['type'], string> = {
  mosque: 'mosque',
  prayer_room: 'mescit',
  halal_restaurant: 'halal restaurant',
};

/** OpenStreetMap's search API; only called when the user opens the screen and Overpass is slow */
async function searchNominatim(lat: number, lon: number, type: NearbyPlace['type'], radius: number, lang: string): Promise<RawPoint[]> {
  const dLat = radius / 111000;
  const dLon = radius / (111000 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));
  const params = [
    `q=${encodeURIComponent(NOMINATIM_QUERY[type])}`,
    'format=jsonv2',
    `viewbox=${[lon - dLon, lat + dLat, lon + dLon, lat - dLat].join(',')}`,
    'bounded=1',
    'limit=40',
    // Without this Nominatim names places in the browser's language ("Blue Mosque" for Sultanahmet)
    `accept-language=${lang}`,
  ].join('&');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'IslamicPlus/1.0 (nearby mosque search; mobile app)' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const rows = (await res.json()) as { osm_type: string; osm_id: number; name?: string; lat: string; lon: string }[];
    return rows.map((r) => ({ id: `${r.osm_type}-${r.osm_id}`, name: r.name, lat: Number(r.lat), lon: Number(r.lon) }));
  } finally {
    clearTimeout(timer);
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
