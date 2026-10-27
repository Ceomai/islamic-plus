/**
 * Fails when a translation key used in src/ is missing from the tr or en locale.
 * Keys built at runtime (category ids, view names…) are listed in DYNAMIC below.
 * Run: node scripts/check-i18n.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const DYNAMIC = [
  ...['morning_evening', 'sleep', 'home', 'purification', 'mosque', 'food', 'travel', 'distress', 'health', 'forgiveness', 'family', 'provision', 'knowledge', 'protection', 'nature', 'loss', 'daily', 'dhikr', 'quranic'].map((c) => `duas.cat.${c}`),
  ...['parallel', 'translation', 'arabic', 'study', 'mushaf'].map((v) => `quran.view.${v}`),
  ...['prayer', 'quran', 'dhikr', 'charity', 'fasting', 'other'].map((c) => `habits.cat.${c}`),
  ...['default', 'adhan_short', 'silent'].map((s) => `notifications.sounds.${s}`),
  ...['bug', 'idea', 'content', 'other'].flatMap((c) => [`feedback.cat.${c}`, `feedback.placeholder.${c}`]),
  ...['dhikr', 'dua', 'quran', 'custom'].flatMap((x) => [`reminders.body.${x}`, `reminders.types.${x}`]),
  ...['parent', 'child', 'spouse', 'other'].map((x) => `family.role.${x}`),
  ...['mosque', 'prayer_room', 'halal_restaurant'].flatMap((x) => [`places.${x}`, `places.mapsQuery.${x}`]),
  ...['day', 'date', 'imsak', 'sunrise', 'iftar', 'isha'].map((c) => `ramadan.col.${c}`),
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

const used = new Set(DYNAMIC);
for (const file of walk(SRC)) {
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
  const code = fs.readFileSync(file, 'utf8');
  // t('a.b'), t(cond ? 'a.b' : 'c.d'), cond ? t('a.b') : t('c.d')
  for (const m of code.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
  for (const m of code.matchAll(/\bt\(\s*[\w.]+\s*\?\s*'([a-zA-Z0-9_.]+)'\s*:\s*'([a-zA-Z0-9_.]+)'/g)) {
    used.add(m[1]);
    used.add(m[2]);
  }
}

function loadLocale(lang) {
  const src = fs.readFileSync(path.join(SRC, 'i18n', 'locales', `${lang}.ts`), 'utf8');
  const body = src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1);
  return new Function(`return ${body}`)();
}
const get = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

let missing = 0;
for (const lang of ['tr', 'en']) {
  const locale = loadLocale(lang);
  const absent = [...used].filter((k) => typeof get(locale, k) !== 'string').sort();
  missing += absent.length;
  console.log(`${lang}: ${absent.length ? `missing ${absent.length}: ${absent.join(', ')}` : 'ok'}`);
}
console.log(`${used.size} keys checked`);
process.exit(missing ? 1 : 0);
