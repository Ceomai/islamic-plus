/**
 * Cities for choosing a location by hand (no GPS, permission refused, or a place other than where
 * the phone is). Coordinates are city centres; a 0.1° difference moves prayer times by well under
 * a minute. Türkiye's 81 provinces first, then cities abroad where many Turkish speakers live.
 */
export interface City {
  id: string;
  tr: string;
  en: string;
  country: 'TR' | 'DE' | 'AT' | 'NL' | 'BE' | 'FR' | 'GB' | 'CH' | 'SE' | 'NO' | 'DK' | 'US' | 'CA' | 'AU' | 'AZ' | 'CY' | 'BA' | 'MK' | 'SA' | 'EG' | 'AE';
  latitude: number;
  longitude: number;
}

type Row = [tr: string, en: string, lat: number, lon: number];

const TR_PROVINCES: Row[] = [
  ['Adana', 'Adana', 37.0, 35.32], ['Adıyaman', 'Adiyaman', 37.76, 38.28], ['Afyonkarahisar', 'Afyonkarahisar', 38.76, 30.54],
  ['Ağrı', 'Agri', 39.72, 43.05], ['Aksaray', 'Aksaray', 38.37, 34.03], ['Amasya', 'Amasya', 40.65, 35.83],
  ['Ankara', 'Ankara', 39.93, 32.86], ['Antalya', 'Antalya', 36.9, 30.71], ['Ardahan', 'Ardahan', 41.11, 42.7],
  ['Artvin', 'Artvin', 41.18, 41.82], ['Aydın', 'Aydin', 37.85, 27.84], ['Balıkesir', 'Balikesir', 39.65, 27.88],
  ['Bartın', 'Bartin', 41.64, 32.34], ['Batman', 'Batman', 37.88, 41.13], ['Bayburt', 'Bayburt', 40.26, 40.23],
  ['Bilecik', 'Bilecik', 40.14, 29.98], ['Bingöl', 'Bingol', 38.88, 40.5], ['Bitlis', 'Bitlis', 38.4, 42.11],
  ['Bolu', 'Bolu', 40.74, 31.61], ['Burdur', 'Burdur', 37.72, 30.29], ['Bursa', 'Bursa', 40.19, 29.06],
  ['Çanakkale', 'Canakkale', 40.15, 26.41], ['Çankırı', 'Cankiri', 40.6, 33.62], ['Çorum', 'Corum', 40.55, 34.95],
  ['Denizli', 'Denizli', 37.78, 29.09], ['Diyarbakır', 'Diyarbakir', 37.91, 40.24], ['Düzce', 'Duzce', 40.84, 31.16],
  ['Edirne', 'Edirne', 41.68, 26.56], ['Elazığ', 'Elazig', 38.67, 39.22], ['Erzincan', 'Erzincan', 39.75, 39.49],
  ['Erzurum', 'Erzurum', 39.9, 41.27], ['Eskişehir', 'Eskisehir', 39.78, 30.52], ['Gaziantep', 'Gaziantep', 37.07, 37.38],
  ['Giresun', 'Giresun', 40.91, 38.39], ['Gümüşhane', 'Gumushane', 40.46, 39.48], ['Hakkari', 'Hakkari', 37.58, 43.74],
  ['Hatay', 'Hatay', 36.2, 36.16], ['Iğdır', 'Igdir', 39.92, 44.04], ['Isparta', 'Isparta', 37.76, 30.55],
  ['İstanbul', 'Istanbul', 41.01, 28.98], ['İzmir', 'Izmir', 38.42, 27.14], ['Kahramanmaraş', 'Kahramanmaras', 37.58, 36.94],
  ['Karabük', 'Karabuk', 41.2, 32.62], ['Karaman', 'Karaman', 37.18, 33.22], ['Kars', 'Kars', 40.6, 43.1],
  ['Kastamonu', 'Kastamonu', 41.38, 33.78], ['Kayseri', 'Kayseri', 38.73, 35.48], ['Kırıkkale', 'Kirikkale', 39.85, 33.51],
  ['Kırklareli', 'Kirklareli', 41.73, 27.22], ['Kırşehir', 'Kirsehir', 39.15, 34.16], ['Kilis', 'Kilis', 36.72, 37.12],
  ['Kocaeli', 'Kocaeli', 40.77, 29.92], ['Konya', 'Konya', 37.87, 32.48], ['Kütahya', 'Kutahya', 39.42, 29.98],
  ['Malatya', 'Malatya', 38.35, 38.31], ['Manisa', 'Manisa', 38.61, 27.43], ['Mardin', 'Mardin', 37.31, 40.74],
  ['Mersin', 'Mersin', 36.81, 34.64], ['Muğla', 'Mugla', 37.22, 28.36], ['Muş', 'Mus', 38.75, 41.51],
  ['Nevşehir', 'Nevsehir', 38.62, 34.71], ['Niğde', 'Nigde', 37.97, 34.68], ['Ordu', 'Ordu', 40.98, 37.88],
  ['Osmaniye', 'Osmaniye', 37.07, 36.25], ['Rize', 'Rize', 41.02, 40.52], ['Sakarya', 'Sakarya', 40.78, 30.4],
  ['Samsun', 'Samsun', 41.29, 36.33], ['Siirt', 'Siirt', 37.93, 41.94], ['Sinop', 'Sinop', 42.03, 35.15],
  ['Sivas', 'Sivas', 39.75, 37.02], ['Şanlıurfa', 'Sanliurfa', 37.16, 38.79], ['Şırnak', 'Sirnak', 37.52, 42.46],
  ['Tekirdağ', 'Tekirdag', 40.98, 27.51], ['Tokat', 'Tokat', 40.31, 36.55], ['Trabzon', 'Trabzon', 41.0, 39.72],
  ['Tunceli', 'Tunceli', 39.11, 39.55], ['Uşak', 'Usak', 38.68, 29.41], ['Van', 'Van', 38.5, 43.38],
  ['Yalova', 'Yalova', 40.65, 29.27], ['Yozgat', 'Yozgat', 39.82, 34.81], ['Zonguldak', 'Zonguldak', 41.45, 31.79],
];

const ABROAD: [City['country'], ...Row][] = [
  ['DE', 'Berlin', 'Berlin', 52.52, 13.4], ['DE', 'Köln', 'Cologne', 50.94, 6.96], ['DE', 'Hamburg', 'Hamburg', 53.55, 9.99],
  ['DE', 'Münih', 'Munich', 48.14, 11.58], ['DE', 'Frankfurt', 'Frankfurt', 50.11, 8.68], ['DE', 'Stuttgart', 'Stuttgart', 48.78, 9.18],
  ['DE', 'Düsseldorf', 'Dusseldorf', 51.23, 6.78], ['AT', 'Viyana', 'Vienna', 48.21, 16.37], ['NL', 'Amsterdam', 'Amsterdam', 52.37, 4.9],
  ['NL', 'Rotterdam', 'Rotterdam', 51.92, 4.48], ['BE', 'Brüksel', 'Brussels', 50.85, 4.35], ['FR', 'Paris', 'Paris', 48.86, 2.35],
  ['FR', 'Strazburg', 'Strasbourg', 48.57, 7.75], ['GB', 'Londra', 'London', 51.51, -0.13], ['CH', 'Zürih', 'Zurich', 47.38, 8.54],
  ['SE', 'Stockholm', 'Stockholm', 59.33, 18.07], ['NO', 'Oslo', 'Oslo', 59.91, 10.75], ['DK', 'Kopenhag', 'Copenhagen', 55.68, 12.57],
  ['US', 'New York', 'New York', 40.71, -74.01], ['CA', 'Toronto', 'Toronto', 43.65, -79.38], ['AU', 'Sidney', 'Sydney', -33.87, 151.21],
  ['AZ', 'Bakü', 'Baku', 40.41, 49.87], ['CY', 'Lefkoşa', 'Nicosia', 35.19, 33.36], ['BA', 'Saraybosna', 'Sarajevo', 43.86, 18.41],
  ['MK', 'Üsküp', 'Skopje', 42.0, 21.43], ['SA', 'Mekke', 'Mecca', 21.42, 39.83], ['SA', 'Medine', 'Medina', 24.47, 39.61],
  ['EG', 'Kahire', 'Cairo', 30.04, 31.24], ['AE', 'Dubai', 'Dubai', 25.2, 55.27],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const CITIES: City[] = [
  ...TR_PROVINCES.map(([tr, en, latitude, longitude]) => ({ id: `tr-${slug(en)}`, tr, en, country: 'TR' as const, latitude, longitude })),
  ...ABROAD.map(([country, tr, en, latitude, longitude]) => ({ id: `${country.toLowerCase()}-${slug(en)}`, tr, en, country, latitude, longitude })),
];

/** Lower-case, Turkish letters folded, so "istanbul", "İstanbul" and "ISTANBUL" all match */
export function foldCityText(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .trim();
}

export function searchCities(query: string): City[] {
  const q = foldCityText(query);
  if (!q) return CITIES;
  return CITIES.filter((c) => foldCityText(c.tr).includes(q) || foldCityText(c.en).includes(q));
}
