/**
 * Builds supabase/functions/assistant/catalog.json from the app's own content (duas, Learn topics,
 * surah names) so the server-side assistant searches exactly what the app can open.
 * Run after changing src/data: npm run assistant:catalog
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const BUILD = path.join(ROOT, 'node_modules', '.cache', 'assistant-catalog');
const OUT = path.join(ROOT, 'supabase', 'functions', 'assistant', 'catalog.json');

// Transpile the data modules (and what they import) to CommonJS so plain Node can read them
const FILES = ['data/duas.ts', 'data/duaLibrary.json', 'data/learn.ts', 'data/education.ts', 'data/surahs.ts'];
for (const rel of FILES) {
  const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
  const dst = path.join(BUILD, rel.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const out = rel.endsWith('.json')
    ? src
    : ts.transpileModule(src, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true },
      }).outputText;
  fs.writeFileSync(dst, out);
}

const { DUAS } = require(path.join(BUILD, 'data/duas.js'));
const { LEARN_ENTRIES } = require(path.join(BUILD, 'data/learn.js'));
const { SURAHS } = require(path.join(BUILD, 'data/surahs.js'));

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function sectionText(topic, lang) {
  return topic.sections
    .map((s) =>
      [s.heading?.[lang], s.text?.[lang], ...(s.bullets?.[lang] ?? []).map((b) => `- ${b}`)].filter(Boolean).join('\n')
    )
    .join('\n\n');
}

const catalog = {
  generatedAt: new Date().toISOString(),
  duas: DUAS.map((d) => ({
    id: d.id,
    category: d.category,
    title: d.title,
    tags: d.tags,
    repeat: d.repeat ?? 1,
    transliteration: clip(d.transliteration, 200),
    meaning: { tr: clip(d.translation.tr, 260), en: clip(d.translation.en, 260) },
  })),
  topics: LEARN_ENTRIES.map(({ category, subcategory, topic }) => ({
    id: topic.id,
    category: category.title,
    subcategory: subcategory.title,
    title: topic.title,
    summary: topic.summary,
    tags: topic.tags ?? { tr: [], en: [] },
    text: { tr: sectionText(topic, 'tr'), en: sectionText(topic, 'en') },
  })),
  surahs: SURAHS.map((s) => ({ n: s.number, tr: s.tr, en: s.en, ar: s.ar })),
};

fs.writeFileSync(OUT, `${JSON.stringify(catalog)}\n`);
console.log(`catalog: ${catalog.duas.length} duas, ${catalog.topics.length} topics, ${catalog.surahs.length} surahs → ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
