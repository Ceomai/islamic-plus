import type { AppLanguage } from '../../types';
import type { ChatLang } from './types';

const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const LATIN_FOLD: [RegExp, string][] = [
  [/ı/g, 'i'],
  [/[şș]/g, 's'],
  [/ğ/g, 'g'],
  [/ç/g, 'c'],
  [/[öô]/g, 'o'],
  [/œ/g, 'oe'],
  [/[üûùú]/g, 'u'],
  [/[âàáä]/g, 'a'],
  [/[îïí]/g, 'i'],
  [/[éèêë]/g, 'e'],
  [/ß/g, 'ss'],
];

/** Lowercase, strip accents and Arabic vowel marks, unify letter variants, drop punctuation. */
export function fold(text: string): string {
  let s = text.toLocaleLowerCase('tr');
  for (const [re, to] of LATIN_FOLD) s = s.replace(re, to);
  return s
    .replace(AR_MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/['’`´]/g, '')
    .replace(/[.,!?;:()"“”«»„\-_/\\؟،…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const isArabic = (s: string) => /[؀-ۿ]/.test(s);

/** Arabic tokens lose leading و / ال / بال / لل so "والمسجد" matches "مسجد". */
export function stripArabicPrefix(token: string): string {
  let t = token;
  if (t.length > 3 && t.startsWith('و')) t = t.slice(1);
  for (const p of ['بال', 'وال', 'لل', 'ال']) {
    if (t.length > p.length + 1 && t.startsWith(p)) return t.slice(p.length);
  }
  return t;
}

export interface Query {
  raw: string;
  folded: string;
  tokens: string[];
}

export function makeQuery(raw: string): Query {
  const folded = fold(raw);
  const tokens = folded.split(' ').filter(Boolean).map((t) => (isArabic(t) ? stripArabicPrefix(t) : t));
  return { raw, folded, tokens };
}

/** Word-start match so Turkish suffixes still match ("duasını" ← "dua"); short words must match exactly. */
export function hasWord(q: Query, keyword: string): boolean {
  const kw = fold(keyword);
  if (!kw) return false;
  if (kw.includes(' ')) return ` ${q.tokens.join(' ')} `.includes(` ${kw}`) || ` ${q.folded} `.includes(` ${kw}`);
  const k = isArabic(kw) ? stripArabicPrefix(kw) : kw;
  const minPrefix = isArabic(k) ? 3 : 4;
  return q.tokens.some((t) => t === k || (k.length >= minPrefix && t.startsWith(k)));
}

export const anyWord = (q: Query, list: string[] | undefined) => (list ?? []).some((w) => hasWord(q, w));
/** Matched keyword length — longer, more specific phrases win. */
export const matchWeight = (q: Query, list: string[] | undefined) =>
  (list ?? []).reduce((best, w) => (hasWord(q, w) ? Math.max(best, fold(w).length) : best), 0);

// ─── Language detection ──────────────────────────────────────────────────────

const LANG_HINTS: Record<Exclude<ChatLang, 'ar'>, string[]> = {
  tr: ['ne', 'nasil', 'nerede', 'nedir', 'hangi', 'bana', 'beni', 'ac', 'goster', 'gotur', 'icin', 'istiyorum', 'mi', 'mu', 'bir', 've', 'ile', 'duasi', 'namaz', 'oruc', 'zekat', 'bul', 'oku', 'kac', 'lutfen', 'merhaba', 'suresi', 'abdest', 'kible', 'bugun', 'zaman', 'nelerdir', 'hakkinda', 'anlat', 'acikla', 'cok', 'ben', 'sen', 'bu', 'icin'],
  en: ['what', 'how', 'where', 'is', 'the', 'a', 'an', 'to', 'for', 'me', 'my', 'open', 'show', 'take', 'go', 'find', 'please', 'i', 'want', 'can', 'you', 'prayer', 'read', 'when', 'which', 'of', 'hello', 'hi', 'about', 'explain', 'does', 'do', 'feel', 'am', 'im', 'need', 'should'],
  de: ['was', 'wie', 'wo', 'ist', 'der', 'die', 'das', 'ein', 'eine', 'und', 'ich', 'mir', 'mich', 'bitte', 'offne', 'zeig', 'zeige', 'gebet', 'bittgebet', 'fur', 'lesen', 'wann', 'gibt', 'es', 'hallo', 'koran', 'fasten', 'nachste', 'erklare', 'uber', 'habe', 'bin', 'mein', 'meine', 'nicht', 'vor', 'dem', 'den'],
  fr: ['quoi', 'comment', 'ou', 'est', 'le', 'la', 'les', 'un', 'une', 'et', 'je', 'moi', 'mon', 'ma', 'pour', 'ouvre', 'montre', 'priere', 'invocation', 'lire', 'quand', 'quel', 'quelle', 'bonjour', 'salut', 'coran', 'jeune', 'vous', 'plait', 'explique', 'sourate', 'qu', 'jai', 'suis', 'des', 'du', 'au', 'peur', 'faire'],
};

/** Words of transliterated Arabic ("la ilahe illa…") say nothing about the writer's language */
const TRANSLIT_WORDS = new Set(['la', 'illa', 've', 'wa', 'va', 'bi', 'bika', 'bike', 'inni', 'min', 'minal', 'ya', 'rabbi', 'rabbena', 'rabbana', 'allahumma', 'allahumme', 'ente', 'anta', 'ala', 'fi']);

export function detectLanguage(raw: string, fallback: AppLanguage): ChatLang {
  if (isArabic(raw)) return 'ar';
  const lower = raw.toLocaleLowerCase('tr');
  const tokens = fold(raw).split(' ').filter((t) => !TRANSLIT_WORDS.has(t));
  const score: Record<Exclude<ChatLang, 'ar'>, number> = { tr: 0, en: 0, de: 0, fr: 0 };
  // Check the raw text: Turkish lowercasing turns an English "I" into "ı"
  if (/[ğışĞŞİ]/.test(raw)) score.tr += 3;
  if (/[ßä]/.test(lower)) score.de += 3;
  if (/[éèêàœ]/.test(lower)) score.fr += 3;
  if (/[öü]/.test(lower)) {
    score.tr += 1;
    score.de += 1;
  }
  for (const lang of Object.keys(LANG_HINTS) as (keyof typeof LANG_HINTS)[]) {
    score[lang] += tokens.filter((t) => LANG_HINTS[lang].includes(t)).length;
  }
  const ranked = (Object.entries(score) as [Exclude<ChatLang, 'ar'>, number][]).sort((a, b) => b[1] - a[1]);
  const [topLang, top] = ranked[0];
  if (top === 0) return fallback;
  // On a tie prefer the app language
  if (ranked[1][1] === top && score[fallback] === top) return fallback;
  return topLang;
}
