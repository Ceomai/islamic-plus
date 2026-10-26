/**
 * Verifies every Arabic text in src/data/duaLibrary.json against its source and fills in audio:
 *   - "hisn"  → Hisnul Muslim dataset (rn0x/Adhkar-json); audio = that entry's recitation
 *   - "quran" → Quran text (alquran.cloud, quran-simple-clean); audio = Alafasy recitation of the first ayah
 * Arabic is compared without diacritics, punctuation or alef/hamza spelling variants.
 * Run: node scripts/verify-duas.js   (exits 1 and lists mismatches if any text is not found)
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const LIBRARY = path.join(__dirname, '..', 'src', 'data', 'duaLibrary.json');
const ADHKAR_BASE = 'https://cdn.jsdelivr.net/gh/Alsarmad/Adhkar-json@main';
const QURAN_API = 'https://api.alquran.cloud/v1';
const QURAN_AUDIO = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(fetchJson(res.headers.location));
          return;
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`${url}: ${e.message}`));
          }
        });
      })
      .on('error', reject);
  });
}

function normalizeArabic(s) {
  return (s || '')
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[^ء-ي\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function quranText(ref) {
  const [surah, range] = ref.split(':');
  const [from, to = from] = range.split('-').map(Number);
  const parts = [];
  let firstNumber = null;
  for (let a = from; a <= to; a++) {
    const json = await fetchJson(`${QURAN_API}/ayah/${surah}:${a}/quran-simple-clean`);
    parts.push(json.data.text);
    if (firstNumber === null) firstNumber = json.data.number;
  }
  return { text: parts.join(' '), firstNumber };
}

async function main() {
  const library = JSON.parse(fs.readFileSync(LIBRARY, 'utf8'));
  const adhkar = await fetchJson(`${ADHKAR_BASE}/adhkar.json`);
  const hisnItems = adhkar.flatMap((c) =>
    c.array.map((x) => ({ chapter: c.category, audio: x.audio, norm: normalizeArabic(x.text) }))
  );

  const failures = [];
  for (const dua of library) {
    const needle = normalizeArabic(dua.arabic);
    if (dua.source.type === 'hisn') {
      const matches = hisnItems.filter((x) => x.norm.includes(needle)).sort((a, b) => a.norm.length - b.norm.length);
      if (matches.length === 0) {
        failures.push(`${dua.id}: not found in Hisnul Muslim`);
        continue;
      }
      dua.source.chapter = matches[0].chapter;
      dua.audioUrl = matches[0].audio ? `${ADHKAR_BASE}${matches[0].audio}` : undefined;
    } else if (dua.source.type === 'quran') {
      const { text, firstNumber } = await quranText(dua.source.ref);
      if (!normalizeArabic(text).includes(needle)) {
        failures.push(`${dua.id}: text does not match Quran ${dua.source.ref}`);
        continue;
      }
      dua.audioUrl = `${QURAN_AUDIO}/${firstNumber}.mp3`;
    }
    dua.verified = true;
  }

  if (failures.length) {
    console.error(`✖ ${failures.length} dua(s) failed verification:\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(LIBRARY, JSON.stringify(library, null, 2) + '\n');
  console.log(`✔ ${library.length} duas verified; audio URLs written to src/data/duaLibrary.json`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
