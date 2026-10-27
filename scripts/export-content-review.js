/**
 * Writes docs/review/LEARN.md and docs/review/DUAS.md: every Learn topic and every dua's Turkish
 * text in one readable document, for a scholar to review outside the app.
 * Run after changing src/data: node scripts/export-content-review.js
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const BUILD = path.join(ROOT, 'node_modules', '.cache', 'content-review');
const OUT = path.join(ROOT, 'docs', 'review');

for (const rel of ['data/duas.ts', 'data/duaLibrary.json', 'data/learn.ts', 'data/education.ts']) {
  const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
  const dst = path.join(BUILD, rel.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(
    dst,
    rel.endsWith('.json')
      ? src
      : ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  );
}
const { LEARN_CATEGORIES } = require(path.join(BUILD, 'data/learn.js'));
const { DUAS } = require(path.join(BUILD, 'data/duas.js'));

const checkbox = '- [ ] Uygun  - [ ] Düzeltilmeli  · Not: ______________________';
const today = new Date().toISOString().slice(0, 10);

const learn = [
  '# Öğren kütüphanesi — içerik incelemesi',
  '',
  `Oluşturulma: ${today} · ${LEARN_CATEGORIES.reduce((n, c) => n + c.subcategories.reduce((m, s) => m + s.topics.length, 0), 0)} konu`,
  '',
  'Esas: Hanefî mezhebi ve Diyanet uygulaması; diğer mezheplerin görüşleri metin içinde belirtilmiştir. Lütfen her konuyu işaretleyin; düzeltme önerilerini nota yazın.',
  '',
];
for (const c of LEARN_CATEGORIES) {
  learn.push(`## ${c.title.tr}`, '');
  for (const s of c.subcategories) {
    learn.push(`### ${s.title.tr}`, '');
    for (const t of s.topics) {
      learn.push(`#### ${t.title.tr}  \`${t.id}\``, '', `*${t.summary.tr}*`, '');
      for (const sec of t.sections) {
        if (sec.heading) learn.push(`**${sec.heading.tr}**`, '');
        if (sec.text) learn.push(sec.text.tr, '');
        if (sec.bullets) learn.push(...sec.bullets.tr.map((b) => `- ${b}`), '');
      }
      learn.push(checkbox, '');
    }
  }
}

const duas = [
  '# Dualar — meal ve okunuş incelemesi',
  '',
  `Oluşturulma: ${today} · ${DUAS.length} dua`,
  '',
  'Arapça metinler Hisnü’l-Müslim ve Kur’an ile karşılaştırılmıştır (npm run duas:verify). İncelenecek olan Türkçe başlık, okunuş ve mealdir.',
  '',
];
for (const d of DUAS) {
  const src = d.source.type === 'quran' ? `Kur’an ${d.source.ref}` : `Hisnü’l-Müslim${d.source.chapter ? ` ${d.source.chapter}` : ''}`;
  duas.push(
    `### ${d.title.tr}  \`${d.id}\``,
    '',
    `Kategori: ${d.category} · Kaynak: ${src}${d.repeat > 1 ? ` · ${d.repeat} kez` : ''}`,
    '',
    `> ${d.arabic}`,
    '',
    `**Okunuş:** ${d.transliteration}`,
    '',
    `**Meal:** ${d.translation.tr}`,
    '',
    checkbox,
    ''
  );
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'LEARN.md'), learn.join('\n'));
fs.writeFileSync(path.join(OUT, 'DUAS.md'), duas.join('\n'));
console.log(`docs/review/LEARN.md and docs/review/DUAS.md written`);
