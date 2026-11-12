import { APP_KNOWLEDGE, ISLAMIC_KNOWLEDGE } from '../../data/appKnowledge';
import { DUAS, duaTranslitKey, translitHit, type Dua } from '../../data/duas';
import { LEARN_ENTRIES, topicText, type LearnEntry } from '../../data/learn';
import { SURAHS, type SurahName } from '../../data/surahs';
import { BLOCKED_ALIASES, DUA_CONCEPTS, FEATURES, LEARN_TERMS, OPEN_VERBS, STOPWORDS, SURAH_NEEDS_KEYWORD, SURAH_WORDS } from './lexicon';
import { anyWord, fold, hasWord, isArabic, matchWeight, stripArabicPrefix, type Query } from './normalize';
import { contentLang } from './reply';
import type { ChatLang, Feature } from './types';

const SURAH_ALIASES: { surah: SurahName; alias: string; ar: boolean }[] = SURAHS.flatMap((s) => {
  const en = fold(s.en);
  const enBare = en.replace(/^(al|an|ar|as|at|ad|adh|az|ash) /, '');
  const list = new Set([fold(s.tr), en, enBare, enBare.replace(/ /g, '')]);
  return [
    ...[...list].filter(Boolean).map((alias) => ({ surah: s, alias, ar: false })),
    { surah: s, alias: stripArabicPrefix(fold(s.ar)), ar: true },
  ];
});

export function findSurah(q: Query, lang: ChatLang): { surah: SurahName; explicit: boolean } | null {
  const keyword = anyWord(q, Object.values(SURAH_WORDS).flat());

  // "36. sure", "surah 36", "sure 36"
  const num = q.folded.match(/(\d{1,3})\s*\.?\s*(sure|surah|sura|sourate|سوره)|(sure|surah|sura|sourate|سوره)\s*(\d{1,3})/);
  if (num) {
    const n = Number(num[1] ?? num[4]);
    if (n >= 1 && n <= 114) return { surah: SURAHS[n - 1], explicit: true };
  }

  let best: { surah: SurahName; len: number } | null = null;
  for (const { surah, alias, ar } of SURAH_ALIASES) {
    if (alias.length < 2 || BLOCKED_ALIASES.has(alias)) continue;
    const hit = ar
      ? q.tokens.some((t) => t === alias) && (keyword || alias.length >= 4)
      : alias.includes(' ')
        ? ` ${q.folded} `.includes(` ${alias}`)
        : q.tokens.some((t) => t === alias || (alias.length >= 4 && t.startsWith(alias) && t.length - alias.length <= 4));
    if (!hit) continue;
    if (!keyword && (SURAH_NEEDS_KEYWORD.has(alias) || alias.length < 4)) continue;
    if (!best || alias.length > best.len) best = { surah, len: alias.length };
  }
  if (!best) return null;
  return { surah: best.surah, explicit: keyword || anyWord(q, OPEN_VERBS[lang]) };
}

export function findFeature(q: Query): { feature: Feature; weight: number } | null {
  let best: { feature: Feature; weight: number } | null = null;
  for (const feature of FEATURES) {
    const weight = Math.max(...(Object.keys(feature.keywords) as ChatLang[]).map((l) => matchWeight(q, feature.keywords[l])));
    if (weight > 0 && (!best || weight > best.weight)) best = { feature, weight };
  }
  return best;
}

function contentWords(q: Query, lang: ChatLang): string[] {
  const stop = new Set([...STOPWORDS.tr, ...STOPWORDS.en, ...STOPWORDS[lang]].map(fold));
  return q.tokens.filter((t) => t.length >= 3 && !stop.has(t) && !isArabic(t));
}

/** Word-start match against a field, so "yolculuk" finds "yolculuktan" but "dem" doesn't find "adam". */
const fieldHas = (field: string, w: string) => fold(field).split(' ').some((t) => t.startsWith(w));

export function findDuas(q: Query, lang: ChatLang): { duas: Dua[]; concept: boolean; recited: boolean } {
  const scores = new Map<string, number>();
  const soundHits = new Map<string, number>();
  const add = (d: Dua, s: number) => scores.set(d.id, (scores.get(d.id) ?? 0) + s);

  const concepts = DUA_CONCEPTS.filter((c) => (Object.keys(c.words) as ChatLang[]).some((l) => anyWord(q, c.words[l])));
  for (const c of concepts) {
    const tag = fold(c.tag);
    for (const d of DUAS) {
      const enTags = d.tags.en.map(fold);
      // A dua whose main tag is the purpose ranks above one that only mentions it
      if (enTags[0] === tag) add(d, 8);
      else if (enTags.includes(tag)) add(d, 6);
      else if (enTags.some((t) => t.includes(tag))) add(d, 3);
    }
  }

  // Remaining words against titles, tags and transliteration; dua content exists only in tr/en
  if (lang === 'tr' || lang === 'en') {
    const conceptWords = concepts.flatMap((c) => Object.values(c.words).flat()).map(fold).filter((k) => !k.includes(' '));
    const words = contentWords(q, lang).filter((w) => !conceptWords.some((k) => w === k || (k.length >= 4 && w.startsWith(k))));
    for (const w of words) {
      for (const d of DUAS) {
        const sc =
          (fieldHas([...d.tags.tr, ...d.tags.en].join(' '), w) ? 3 : 0) +
          (fieldHas(`${d.title.tr} ${d.title.en}`, w) ? 4 : 0) +
          (translitHit(d, w) ? 2 : 0);
        if (sc) add(d, sc);
      }
    }
  }

  // The dua's own words typed in any spelling ("rabbena atina", "a'udhu bika") – works in every chat language
  const latin = q.tokens.filter((t) => t.length >= 4 && !isArabic(t));
  if (latin.length >= 2) {
    for (const d of DUAS) {
      const hits = latin.filter((w) => translitHit(d, w)).length;
      if (hits >= 2) {
        soundHits.set(d.id, hits);
        // A shorter dua covered by the same words is closer to what the user is reciting
        add(d, hits * 4 + Math.min(3, 60 / duaTranslitKey(d).length));
      }
    }
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0]?.[1] ?? 0;
  const duas = ranked
    .filter(([, sc]) => sc >= Math.max(3, top * 0.5))
    .slice(0, 3)
    .map(([id]) => DUAS.find((d) => d.id === id))
    .filter((d): d is Dua => !!d);
  return { duas, concept: concepts.length > 0, recited: duas.length > 0 && (soundHits.get(duas[0].id) ?? 0) >= 2 };
}

/** Turkish suffixes: "namazı" should find "namaz", "rekâtları" "rekât". */
function stemHit(text: string, w: string): boolean {
  if (text.includes(w)) return true;
  if (w.length >= 5 && text.includes(w.slice(0, -1))) return true;
  return w.length >= 7 && text.includes(w.slice(0, -2));
}

export function findTopic(q: Query, lang: ChatLang): { entry: LearnEntry; score: number } | null {
  const searchLang = contentLang(lang);
  let words = contentWords(q, lang);
  if (lang === 'ar' || lang === 'de' || lang === 'fr') {
    words = LEARN_TERMS.filter((t) => anyWord(q, t.words[lang])).map((t) => t.en);
  }
  if (words.length === 0) return null;
  let best: { entry: LearnEntry; score: number } | null = null;
  for (const entry of LEARN_ENTRIES) {
    const body = fold(topicText(entry, searchLang));
    const title = fold(`${entry.topic.title[searchLang]} ${(entry.topic.tags?.[searchLang] ?? []).join(' ')}`);
    let score = 0;
    let found = 0;
    for (const w of words) {
      if (stemHit(title, w)) score += 3;
      if (stemHit(body, w)) {
        score += 1;
        found += 1;
      }
    }
    // A subcategory named exactly like the query ("zakat", "abdest") holds its basic topics; on a tie the earlier topic wins
    if (words.includes(fold(entry.subcategory.title[searchLang]))) score += 0.5;
    if (found >= Math.max(1, Math.ceil(words.length / 2)) && (!best || score > best.score)) best = { entry, score };
  }
  return best && best.score >= 2 ? best : null;
}

export function knowledgeText(id: string | undefined, lang: ChatLang): string | null {
  if (!id || (lang !== 'tr' && lang !== 'en')) return null;
  const entry = APP_KNOWLEDGE.find((e) => e.id === id);
  return entry ? entry[lang] : null;
}

/** Short general answers (ISLAMIC_KNOWLEDGE) for tr/en questions nothing else matched */
export function generalKnowledgeAnswer(q: Query, lang: ChatLang): string | null {
  if (lang !== 'tr' && lang !== 'en') return null;
  let best: { score: number; text: string } | null = null;
  for (const entry of ISLAMIC_KNOWLEDGE) {
    const score = entry.keywords.reduce((s, k) => s + (hasWord(q, k) ? (k.length > 4 ? 3 : 2) : 0), 0);
    if (score >= 3 && (!best || score > best.score)) best = { score, text: entry[lang] };
  }
  return best?.text ?? null;
}
