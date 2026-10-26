/**
 * Builds src/data/hadithIndex.json: the chapter list of each hadith collection (name and hadith
 * number range) from fawazahmed0/hadith-api (public domain, "Unlicense"). The full info.json is
 * ~10 MB, so the app ships this small index and downloads hadith text one chapter at a time.
 * Run: node scripts/build-hadith-index.js
 */
const fs = require('fs');
const path = require('path');

const SOURCE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/info.json';
const OUT = path.join(__dirname, '..', 'src', 'data', 'hadithIndex.json');

// Collections offered in the app, in display order; `tr` is false where no Turkish edition exists
const COLLECTIONS = [
  { id: 'nawawi', tr: true },
  { id: 'qudsi', tr: false },
  { id: 'bukhari', tr: true },
  { id: 'muslim', tr: true },
  { id: 'abudawud', tr: true },
  { id: 'tirmidhi', tr: true },
  { id: 'nasai', tr: true },
  { id: 'ibnmajah', tr: true },
  { id: 'malik', tr: true },
];

(async () => {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`info.json HTTP ${res.status}`);
  const info = await res.json();
  const index = COLLECTIONS.map(({ id, tr }) => {
    const meta = info[id].metadata;
    const sections = Object.entries(meta.sections)
      .map(([n, name]) => ({ n: Number(n), name, ...meta.section_details[n] }))
      // Section 0 and chapters without hadiths are placeholders in the source
      .filter((s) => s.n > 0 && s.name && s.hadithnumber_last > 0)
      .map((s) => ({ n: s.n, name: s.name, first: s.hadithnumber_first, last: s.hadithnumber_last }));
    return { id, name: meta.name, tr, total: meta.last_hadithnumber, sections };
  });
  fs.writeFileSync(OUT, `${JSON.stringify(index)}\n`);
  console.log(`${index.map((c) => `${c.id}: ${c.sections.length}`).join(', ')} → ${Math.round(fs.statSync(OUT).size / 1024)} KB`);
})();
