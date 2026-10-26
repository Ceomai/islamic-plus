import { APP_KNOWLEDGE, ISLAMIC_KNOWLEDGE, getKnowledgeCatalog } from '../data/appKnowledge';
import type { AppLanguage } from '../types';

const GREETING = {
  en: 'Assalamu alaikum! I am your Islamic+ guide. Ask how to use any feature (Quran, prayer times, duas, home screen, account…) or general Islamic topics. I give guidance, not personal fatwa.',
  tr: 'Selamün aleyküm! Islamic+ rehberinizim. Her özelliğin kullanımını (Kur’an, namaz, dualar, ana ekran, hesap…) veya genel İslami konuları sorabilirsiniz. Rehberlik veririm; kişisel fetva değilim.',
};

const ALL_ENTRIES = [...APP_KNOWLEDGE, ...ISLAMIC_KNOWLEDGE];

function scoreEntry(question: string, keywords: string[]): number {
  const q = question.toLowerCase();
  let score = 0;
  for (const k of keywords) {
    const key = k.toLowerCase();
    if (q.includes(key)) score += key.length > 4 ? 3 : 2;
    if (q.split(/\s+/).some((w) => w === key)) score += 2;
  }
  return score;
}

export function getAIWelcome(lang: AppLanguage): string {
  return GREETING[lang];
}

export function askAI(question: string, lang: AppLanguage): string {
  const q = question.trim();
  if (!q) return lang === 'tr' ? 'Lütfen bir soru yazın.' : 'Please type a question.';

  const lower = q.toLowerCase();
  if (
    lower.includes('what can you') ||
    lower.includes('ne yapabilir') ||
    lower.includes('help me') ||
    lower.includes('yardım') ||
    lower.includes('özellik') ||
    lower.includes('features')
  ) {
    return getKnowledgeCatalog(lang);
  }

  let best: { score: number; entry: (typeof ALL_ENTRIES)[0] } | null = null;
  for (const entry of ALL_ENTRIES) {
    const score = scoreEntry(q, entry.keywords);
    if (!best || score > best.score) {
      best = { score, entry };
    }
  }

  if (best && best.score >= 2) {
    const text = lang === 'tr' ? best.entry.tr : best.entry.en;
    const hint =
      best.entry.routeHint &&
      (lang === 'tr'
        ? `\n\n📍 Yol: ${best.entry.routeHint}`
        : `\n\n📍 Go to: ${best.entry.routeHint}`);
    return text + (hint ?? '');
  }

  const fallback = {
    en: 'I could not match that exactly. Try: “How do I bookmark Quran?”, “Namaz bildirimi”, “Ana ekranı düzenle”, “Misafir modu”, or “Zekât hesapla”. Say **help** for a full topic list.',
    tr: 'Tam eşleşme bulamadım. Deneyin: “Kur’an yer imi”, “Namaz bildirimi”, “Ana ekranı düzenle”, “Misafir modu”, “Zekât hesapla”. Tüm liste için **yardım** yazın.',
  };
  return fallback[lang];
}
