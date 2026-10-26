// Islamic+ nearby places — Supabase Edge Function (Deno).
// Google Places (New) when GOOGLE_PLACES_API_KEY is set and the caller is signed in; otherwise
// OpenStreetMap Overpass with a shared 24-hour cache, and Nominatim as the quick answer while Overpass is busy.
// Note: on 2026-10-26 both OSM services refused requests from Supabase Edge Functions (406 / 403), so in
// practice the OSM branch only serves stale cache; the app's own on-device OSM requests are the free path.
// Deploy: supabase functions deploy places
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

/** Supabase runtime hook that keeps a promise running after the response is sent */
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

type PlaceType = 'mosque' | 'prayer_room' | 'halal_restaurant';
interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address?: string;
  type: PlaceType;
  source: 'google' | 'osm';
}
interface RawPlace {
  id: string;
  name?: string;
  lat: number;
  lon: number;
  address?: string;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const TYPES: PlaceType[] = ['mosque', 'prayer_room', 'halal_restaurant'];
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Cache cells are ~1 km; the query reaches this much further so every user in the cell is covered */
const CELL_MARGIN_M = 1000;

/**
 * Attempts in start order (ms after the first). The main server answers 502 "at capacity" when busy and
 * asks for retries with backoff; the mirrors are slower but independent.
 */
const OVERPASS_ATTEMPTS: [string, number][] = [
  ['https://overpass-api.de/api/interpreter', 0],
  ['https://overpass.kumi.systems/api/interpreter', 3000],
  ['https://lz4.overpass-api.de/api/interpreter', 6000],
  ['https://overpass.private.coffee/api/interpreter', 9000],
  ['https://overpass-api.de/api/interpreter', 16000],
  ['https://lz4.overpass-api.de/api/interpreter', 28000],
];
/** Overpass servers refuse requests without a meaningful User-Agent (406 / 429) */
const USER_AGENT = 'IslamicPlus/1.0 (nearby mosque and halal food search; Supabase Edge Function)';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Google Places (New) ───────────────────────────────────────────────────
const GOOGLE_FIELDS = 'places.id,places.displayName,places.location,places.shortFormattedAddress';
const GOOGLE_TEXT: Record<Exclude<PlaceType, 'mosque'>, string> = {
  prayer_room: 'mescit prayer room musalla',
  halal_restaurant: 'halal restaurant',
};

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  location?: { latitude: number; longitude: number };
  shortFormattedAddress?: string;
}

async function googlePlaces(key: string, lat: number, lon: number, type: PlaceType, radius: number): Promise<RawPlace[]> {
  const circle = { center: { latitude: lat, longitude: lon }, radius };
  const [url, body] =
    type === 'mosque'
      ? [
          'https://places.googleapis.com/v1/places:searchNearby',
          { includedTypes: ['mosque'], maxResultCount: 20, rankPreference: 'DISTANCE', locationRestriction: { circle } },
        ]
      : ['https://places.googleapis.com/v1/places:searchText', { textQuery: GOOGLE_TEXT[type], pageSize: 20, locationBias: { circle } }];
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': GOOGLE_FIELDS },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
  const data = (await res.json()) as { places?: GooglePlace[] };
  return (data.places ?? [])
    .filter((p) => p.location)
    .map((p) => ({ id: p.id, name: p.displayName?.text, lat: p.location!.latitude, lon: p.location!.longitude, address: p.shortFormattedAddress }));
}

// ─── OpenStreetMap Overpass ────────────────────────────────────────────────
const OSM_FILTERS: Record<PlaceType, string> = {
  mosque: '["amenity"="place_of_worship"]["religion"="muslim"]',
  prayer_room: '["amenity"="place_of_worship"]["religion"="muslim"]',
  halal_restaurant: '["amenity"~"restaurant|fast_food"]["diet:halal"~"yes|only"]',
};

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: { name?: string; 'addr:street'?: string };
}

/** Staggered requests across mirrors; the first good answer wins */
async function overpass(lat: number, lon: number, type: PlaceType, radius: number): Promise<RawPlace[]> {
  const f = OSM_FILTERS[type];
  const query = `[out:json][timeout:40];(node${f}(around:${radius},${lat},${lon});way${f}(around:${radius},${lat},${lon}););out center 60;`;
  const controllers = OVERPASS_ATTEMPTS.map(() => new AbortController());
  const attempts = OVERPASS_ATTEMPTS.map(
    ([url, delay], i) =>
      new Promise<OverpassElement[]>((resolve, reject) => {
        const start = setTimeout(async () => {
          try {
            const res = await fetch(url, {
              method: 'POST',
              body: `data=${encodeURIComponent(query)}`,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
              signal: controllers[i].signal,
            });
            if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
            resolve(((await res.json()) as { elements?: OverpassElement[] }).elements ?? []);
          } catch (e) {
            reject(e);
          }
        }, delay);
        controllers[i].signal.addEventListener('abort', () => {
          clearTimeout(start);
          reject(new Error('cancelled'));
        });
      })
  );
  const timer = setTimeout(() => controllers.forEach((c) => c.abort()), 55000);
  try {
    const elements = await Promise.any(attempts);
    return elements
      .map((el) => ({ el, lat: el.lat ?? el.center?.lat, lon: el.lon ?? el.center?.lon }))
      .filter((x): x is { el: OverpassElement; lat: number; lon: number } => x.lat != null && x.lon != null)
      .map(({ el, lat: la, lon: lo }) => ({ id: `osm-${el.id}`, name: el.tags?.name, lat: la, lon: lo, address: el.tags?.['addr:street'] }));
  } finally {
    clearTimeout(timer);
    controllers.forEach((c) => c.abort());
  }
}

// ─── Nominatim (quick, smaller fallback) ────────────────────────────────────
/** Overpass gets this long before the quicker Nominatim search answers instead */
const OVERPASS_PATIENCE_MS = 12000;
/** Nominatim answers are partial, so they are kept shorter than full Overpass lists */
const NOMINATIM_TTL_MS = 6 * 60 * 60 * 1000;
const NOMINATIM_QUERY: Record<PlaceType, string> = {
  mosque: 'mosque',
  prayer_room: 'mescit',
  halal_restaurant: 'halal restaurant',
};

/** OSM search API: max 1 request per second and results must be cached (both true here) */
async function nominatim(lat: number, lon: number, type: PlaceType, radius: number): Promise<RawPlace[]> {
  const dLat = radius / 111000;
  const dLon = radius / (111000 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));
  const params = new URLSearchParams({
    q: NOMINATIM_QUERY[type],
    format: 'jsonv2',
    viewbox: [lon - dLon, lat + dLat, lon + dLon, lat - dLat].join(','),
    bounded: '1',
    limit: '40',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const rows = (await res.json()) as { osm_type: string; osm_id: number; name?: string; lat: string; lon: string }[];
  return rows.map((r) => ({ id: `osm-${r.osm_type}-${r.osm_id}`, name: r.name, lat: Number(r.lat), lon: Number(r.lon) }));
}

// ─── Request ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: { latitude?: number; longitude?: number; type?: string; radius?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const lat = Number(body.latitude);
  const lon = Number(body.longitude);
  const type = (TYPES.includes(body.type as PlaceType) ? body.type : 'mosque') as PlaceType;
  const radius = Math.min(Math.max(Number(body.radius) || 5000, 500), 20000);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return json({ error: 'bad_request' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const finish = (raw: RawPlace[], source: Place['source']) => {
    const places: Place[] = raw
      .map((p) => ({
        id: p.id,
        name: p.name || (type === 'halal_restaurant' ? 'Halal Restaurant' : 'Mosque'),
        latitude: p.lat,
        longitude: p.lon,
        distanceKm: Math.round(haversineKm(lat, lon, p.lat, p.lon) * 10) / 10,
        address: p.address,
        type,
        source,
      }))
      .filter((p) => p.distanceKm * 1000 <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 40);
    return json({ places, source });
  };

  // Google costs money per request, so only signed-in users use it
  const googleKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (googleKey) {
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data } = await userClient.auth.getUser();
    if (data?.user) {
      try {
        return finish(await googlePlaces(googleKey, lat, lon, type, radius), 'google');
      } catch (e) {
        console.error('google places', e instanceof Error ? e.message : e);
      }
    }
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const cellLat = Math.round(lat * 100) / 100;
  const cellLon = Math.round(lon * 100) / 100;
  const cacheKey = `${type}:${radius}:${cellLat.toFixed(2)},${cellLon.toFixed(2)}`;

  const { data: cached } = await admin.from('places_cache').select('places, created_at').eq('cache_key', cacheKey).maybeSingle();
  if (cached && Date.now() - new Date(cached.created_at).getTime() < CACHE_TTL_MS) {
    return finish(cached.places as RawPlace[], 'osm');
  }

  // Overpass gives the complete list; it runs to the end (also after we answered) and fills the cache
  const full = overpass(cellLat, cellLon, type, radius + CELL_MARGIN_M).then(async (raw) => {
    await admin.from('places_cache').upsert({ cache_key: cacheKey, places: raw, created_at: new Date().toISOString() });
    return raw;
  });
  const problems: string[] = [];
  const describe = (e: unknown) => (e instanceof AggregateError ? e.errors.map((x) => (x instanceof Error ? x.message : String(x))).join(', ') : e instanceof Error ? e.message : String(e));
  full.catch((e) => {
    problems.push(`overpass: ${describe(e)}`);
    console.error('overpass', describe(e));
  });

  const quick = await Promise.race([full.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), OVERPASS_PATIENCE_MS))]);
  if (quick) return finish(quick, 'osm');

  // Overpass is slow or down: answer from the stale cache or Nominatim now, let Overpass finish in the background
  EdgeRuntime.waitUntil(full.catch(() => null));
  if (cached) return finish(cached.places as RawPlace[], 'osm');

  const nominatimKey = `${cacheKey}:nominatim`;
  const { data: quickCached } = await admin.from('places_cache').select('places, created_at').eq('cache_key', nominatimKey).maybeSingle();
  if (quickCached && Date.now() - new Date(quickCached.created_at).getTime() < NOMINATIM_TTL_MS) {
    return finish(quickCached.places as RawPlace[], 'osm');
  }
  try {
    const raw = await nominatim(lat, lon, type, radius);
    await admin.from('places_cache').upsert({ cache_key: nominatimKey, places: raw, created_at: new Date().toISOString() });
    return finish(raw, 'osm');
  } catch (e) {
    problems.push(`nominatim: ${describe(e)}`);
    console.error('nominatim', describe(e));
  }

  // Last chance: wait for Overpass after all
  const late = await full.catch(() => null);
  return late ? finish(late, 'osm') : json({ error: 'unavailable', detail: problems.join(' | ').slice(0, 500) }, 503);
});
