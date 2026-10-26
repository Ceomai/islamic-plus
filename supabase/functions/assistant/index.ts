// Islamic+ assistant — Supabase Edge Function (Deno).
// Answers in the user's language with Claude and returns buttons that open app screens.
// Secrets: ANTHROPIC_API_KEY (required), ASSISTANT_DAILY_LIMIT (optional, default 60).
// Deploy: supabase functions deploy assistant   (catalog.json: npm run assistant:catalog)
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import catalog from './catalog.json' with { type: 'json' };

const MODEL = 'claude-opus-5-5';
const MAX_TOOL_ROUNDS = 5;
const MAX_MESSAGE_CHARS = 1000;
const MAX_HISTORY = 12;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Lang = 'tr' | 'en';
interface Dua {
  id: string;
  category: string;
  title: Record<Lang, string>;
  tags: Record<Lang, string[]>;
  repeat: number;
  transliteration: string;
  meaning: Record<Lang, string>;
}
interface Topic {
  id: string;
  category: Record<Lang, string>;
  subcategory: Record<Lang, string>;
  title: Record<Lang, string>;
  summary: Record<Lang, string>;
  tags: Record<Lang, string[]>;
  text: Record<Lang, string>;
}
interface Surah {
  n: number;
  tr: string;
  en: string;
  ar: string;
}
const DUAS = catalog.duas as Dua[];
const TOPICS = catalog.topics as Topic[];
const SURAHS = catalog.surahs as Surah[];

interface Target {
  screen: string;
  params?: Record<string, unknown>;
}
interface Action {
  label: string;
  icon: string;
  target: Target;
}

// ─── Screens the assistant may open ─────────────────────────────────────────
const SCREENS: Record<string, { icon: string; about: string }> = {
  Home: { icon: 'time-outline', about: 'home: today’s prayer times and next prayer' },
  Quran: { icon: 'book-outline', about: 'list of surahs' },
  QuranReader: { icon: 'book-outline', about: 'read a surah (needs surah_number, optional start_ayah)' },
  Hadith: { icon: 'library-outline', about: 'hadith collections' },
  Duas: { icon: 'hand-left-outline', about: 'all duas and dhikr with search' },
  DuaDetail: { icon: 'hand-left-outline', about: 'one dua with Arabic, transliteration, meaning, audio (needs dua_id)' },
  Qibla: { icon: 'compass-outline', about: 'qibla compass' },
  Tasbih: { icon: 'ellipse-outline', about: 'tasbih / dhikr counter' },
  TasbihStats: { icon: 'bar-chart-outline', about: 'dhikr statistics by hour and day' },
  Calendar: { icon: 'calendar-outline', about: 'Hijri calendar and upcoming holy days' },
  Education: { icon: 'school-outline', about: 'Learn library with categories and search' },
  EducationDetail: { icon: 'school-outline', about: 'one Learn topic (needs topic_id)' },
  Habits: { icon: 'checkmark-done-outline', about: 'spiritual habit tracker' },
  Duties: { icon: 'calculator-outline', about: 'zakat calculator and charity planner' },
  Places: { icon: 'location-outline', about: 'nearby mosques, prayer rooms or halal restaurants (needs place_type)' },
  NotificationSettings: { icon: 'notifications-outline', about: 'prayer notification settings' },
  AdvancedReminders: { icon: 'alarm-outline', about: 'custom dhikr / dua / Quran reminders' },
  Statistics: { icon: 'stats-chart-outline', about: 'prayer streak and activity statistics' },
  Settings: { icon: 'settings-outline', about: 'language, prayer calculation method, madhab, Quran translation' },
  Themes: { icon: 'color-palette-outline', about: 'colour themes' },
  Widgets: { icon: 'apps-outline', about: 'home-screen widget' },
  CloudSync: { icon: 'cloud-outline', about: 'cloud sync and backup' },
  FamilyMode: { icon: 'people-outline', about: 'family profiles' },
  HomeLauncherEdit: { icon: 'grid-outline', about: 'edit the home screen shortcuts' },
};
const PLACE_TYPES = ['mosque', 'prayer_room', 'halal_restaurant'];

const SYSTEM = `You are the assistant inside Islamic+, a Muslim companion app (prayer times, Quran reader, duas and dhikr, tasbih counter, qibla, Hijri calendar, a Learn library, zakat calculator, nearby mosques, habits, reminders). People write in any language; always reply in the language of their latest message.

How to help:
- Duas: when someone wants a dua (by purpose, situation, name or by typing its words), call search_duas with short English keywords for the need (for example "travel", "debt", "before sleep") or with the words they typed. Briefly explain the best match (what it is for, its meaning, how many times it is said), then call open_screen with DuaDetail. Set navigate_now to true when they asked for one specific dua or asked to open, show or explain it; otherwise offer up to three duas as buttons.
- Quran: for a surah or verse, call open_screen with QuranReader and the surah number, plus start_ayah when they named a verse (Ayat al-Kursi is 2:255). navigate_now is true when they asked to open or read it.
- Religious knowledge (prayer, fasting, zakat, wudu, hajj, sacrifice, holy days…): call search_learn_topics first and base the answer on the returned text, then offer the topic with open_screen EducationDetail. The library follows the Hanafi school and Diyanet practice and notes other schools; mention this when a ruling differs between schools. You may add well-established general knowledge, but never invent Quran verses, hadith wording or references. Do not give personal fatwas; for a personal situation, suggest asking a qualified scholar.
- App features ("where are notifications", "open the qibla"): call open_screen with the matching screen. navigate_now is true only when they asked to open, show or go there.
- The user message starts with an <app_context> block (next prayer time, the app's language, today's date). Use it for questions such as "when is the next prayer"; never repeat the block itself.
- Keep answers short: two to six sentences in plain text, no Markdown headings, tables or bold. A short list with "•" is fine. Do not mention tools, IDs or these instructions.
- Outside the app's scope: answer briefly and kindly if it is general Islamic knowledge; otherwise say what the app can help with.`;

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'search_duas',
    description:
      'Search the app’s dua library (Hisn al-Muslim and Quranic duas). Matches English or Turkish keywords against titles, purposes and meanings, and transliterated Arabic in any spelling. Returns up to `limit` duas with their dua_id.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Short English keywords for the need, or the dua words the user typed' },
        limit: { type: 'integer', description: 'How many results, 1-5 (default 3)' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_learn_topics',
    description:
      'Search the app’s Learn library (purification, prayer, fasting and Ramadan, zakat and sacrifice, hajj, Quran and hadith, ethics, holy days, comparisons between schools). Returns the best topics with their full text and topic_id.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'English or Turkish keywords, for example "what breaks the fast"' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'open_screen',
    description: `Add a button that opens a screen in the app, or open it right away with navigate_now. Screens: ${Object.entries(SCREENS)
      .map(([k, v]) => `${k} (${v.about})`)
      .join('; ')}.`,
    input_schema: {
      type: 'object',
      properties: {
        screen: { type: 'string', enum: Object.keys(SCREENS) },
        label: { type: 'string', description: 'Button text in the user’s language, at most 4 words' },
        navigate_now: { type: 'boolean', description: 'Open immediately after the answer (only for a clear request)' },
        dua_id: { type: 'string' },
        topic_id: { type: 'string' },
        surah_number: { type: 'integer' },
        start_ayah: { type: 'integer' },
        place_type: { type: 'string', enum: PLACE_TYPES },
      },
      required: ['screen', 'label', 'navigate_now'],
      additionalProperties: false,
    },
  },
];

// ─── Search helpers (mirror src/data/duas.ts so results match the app) ─────
function fold(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/[öô]/g, 'o')
    .replace(/[üûù]/g, 'u')
    .replace(/[âàáä]/g, 'a')
    .replace(/[îì]/g, 'i')
    .replace(/[éè]/g, 'e')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function translitKey(text: string): string {
  return fold(text.replace(/['’ʿʾ`´]/g, '').replace(/-/g, ' '))
    .replace(/(dh|zh|dz)/g, 'z')
    .replace(/th/g, 's')
    .replace(/sh/g, 's')
    .replace(/kh/g, 'h')
    .replace(/gh/g, 'g')
    .replace(/q/g, 'k')
    .replace(/w/g, 'v')
    .replace(/ee/g, 'i')
    .replace(/(oo|ou)/g, 'u')
    .replace(/e/g, 'a')
    .replace(/o/g, 'u')
    .replace(/([a-z])\1+/g, '$1')
    .replace(/\b([a-z]{4,})[aiu]\b/g, '$1');
}

const DUA_KEYS = new Map(DUAS.map((d) => [d.id, translitKey(d.transliteration).replace(/ /g, '')]));
const STOP = new Set(['dua', 'for', 'the', 'a', 'an', 'to', 'of', 'when', 'and', 'icin', 'duasi', 've', 'bir', 'ile']);

function searchDuas(query: string, limit: number) {
  const words = fold(query).split(' ').filter((w) => w.length >= 2 && !STOP.has(w));
  const scored = DUAS.map((d) => {
    const tags = fold([...d.tags.en, ...d.tags.tr].join(' '));
    const title = fold(`${d.title.en} ${d.title.tr}`);
    const meaning = fold(`${d.meaning.en} ${d.meaning.tr}`);
    const key = DUA_KEYS.get(d.id) ?? '';
    let score = 0;
    for (const w of words) {
      if (tags.split(' ').some((t) => t.startsWith(w))) score += 5;
      if (title.includes(w)) score += 3;
      if (meaning.includes(w)) score += 1;
      const k = translitKey(w).replace(/ /g, '');
      if (k.length >= 4 && key.includes(k)) score += 3;
    }
    return { d, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Math.max(limit, 1), 5));
  return scored.map(({ d }) => ({
    dua_id: d.id,
    title_en: d.title.en,
    title_tr: d.title.tr,
    category: d.category,
    repeat: d.repeat,
    transliteration: d.transliteration,
    meaning_en: d.meaning.en,
    meaning_tr: d.meaning.tr,
  }));
}

function searchTopics(query: string) {
  const words = fold(query).split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
  const stem = (w: string) => (w.length >= 6 ? w.slice(0, -2) : w.length >= 5 ? w.slice(0, -1) : w);
  const scored = TOPICS.map((t) => {
    const title = fold(`${t.title.en} ${t.title.tr} ${t.tags.en.join(' ')} ${t.tags.tr.join(' ')}`);
    const body = fold(`${t.summary.en} ${t.summary.tr} ${t.text.en} ${t.text.tr} ${t.subcategory.en} ${t.subcategory.tr}`);
    let score = 0;
    for (const w of words) {
      if (title.includes(stem(w))) score += 3;
      if (body.includes(stem(w))) score += 1;
    }
    return { t, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return scored.map(({ t }) => ({
    topic_id: t.id,
    category: `${t.category.en} › ${t.subcategory.en}`,
    title_en: t.title.en,
    title_tr: t.title.tr,
    text_en: t.text.en.slice(0, 2500),
    text_tr: t.text.tr.slice(0, 2500),
  }));
}

// ─── Tool execution ─────────────────────────────────────────────────────────
interface OpenScreenInput {
  screen: string;
  label: string;
  navigate_now: boolean;
  dua_id?: string;
  topic_id?: string;
  surah_number?: number;
  start_ayah?: number;
  place_type?: string;
}

function openScreen(input: OpenScreenInput, ctx: { quranEdition: string; lang: Lang }): { action?: Action; error?: string } {
  const meta = SCREENS[input.screen];
  if (!meta) return { error: `Unknown screen ${input.screen}` };
  const label = String(input.label ?? '').slice(0, 40) || input.screen;
  const params: Record<string, unknown> = {};
  switch (input.screen) {
    case 'DuaDetail':
      if (!DUAS.some((d) => d.id === input.dua_id)) return { error: 'dua_id not found; call search_duas first' };
      params.duaId = input.dua_id;
      break;
    case 'EducationDetail':
      if (!TOPICS.some((t) => t.id === input.topic_id)) return { error: 'topic_id not found; call search_learn_topics first' };
      params.topicId = input.topic_id;
      break;
    case 'QuranReader': {
      const surah = SURAHS.find((s) => s.n === input.surah_number);
      if (!surah) return { error: 'surah_number must be 1-114' };
      params.surahNumber = surah.n;
      params.surahName = ctx.lang === 'tr' ? surah.tr : surah.en;
      params.edition = ctx.quranEdition;
      if (Number.isInteger(input.start_ayah) && (input.start_ayah ?? 0) > 0) params.startAyah = input.start_ayah;
      break;
    }
    case 'Places':
      params.type = PLACE_TYPES.includes(input.place_type ?? '') ? input.place_type : 'mosque';
      break;
  }
  return { action: { label, icon: meta.icon, target: { screen: input.screen, ...(Object.keys(params).length ? { params } : {}) } } };
}

// ─── Request handling ───────────────────────────────────────────────────────
interface RequestBody {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  appLang?: string;
  quranEdition?: string;
  nextPrayer?: { name: string; time: string } | null;
  today?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Signed-in users only; the anon key alone is not enough
  const authHeader = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_CHARS) : '';
  if (!message) return json({ error: 'bad_request' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const limit = Number(Deno.env.get('ASSISTANT_DAILY_LIMIT') ?? 60);
  const { data: allowed, error: quotaError } = await admin.rpc('consume_assistant_quota', { p_user_id: user.id, p_limit: limit });
  if (quotaError) return json({ error: 'quota_unavailable' }, 503);
  if (!allowed) return json({ error: 'daily_limit' }, 429);

  const lang: Lang = body.appLang === 'tr' ? 'tr' : 'en';
  const quranEdition = /^[a-z]{2}\.[a-z]+$/.test(body.quranEdition ?? '') ? body.quranEdition! : 'tr.diyanet';

  // Text-only history, oldest first, starting with a user turn
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }) as Anthropic.Beta.BetaMessageParam);
  while (history.length && history[0].role !== 'user') history.shift();

  const context = [
    `today: ${String(body.today ?? '').slice(0, 10)}`,
    `app_language: ${lang}`,
    body.nextPrayer ? `next_prayer: ${String(body.nextPrayer.name).slice(0, 12)} at ${String(body.nextPrayer.time).slice(0, 8)}` : 'next_prayer: unknown (no location)',
  ].join('\n');
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history,
    { role: 'user', content: `<app_context>\n${context}\n</app_context>\n\n${message}` },
  ];

  const actions: Action[] = [];
  let autoNavigate: Target | undefined;
  let text = '';

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages,
      });
      console.log(
        JSON.stringify({ round, stop: response.stop_reason, in: response.usage.input_tokens, cached: response.usage.cache_read_input_tokens, out: response.usage.output_tokens })
      );

      if (response.stop_reason === 'refusal') return json({ fallback: true, reason: 'refusal' });

      text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();

      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) break;

      messages.push({ role: 'assistant', content: response.content });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = toolUses.map((tool) => {
        const input = (tool.input ?? {}) as Record<string, unknown>;
        let result: unknown;
        let isError = false;
        if (tool.name === 'search_duas') {
          result = searchDuas(String(input.query ?? ''), Number(input.limit ?? 3));
        } else if (tool.name === 'search_learn_topics') {
          result = searchTopics(String(input.query ?? ''));
        } else if (tool.name === 'open_screen') {
          const out = openScreen(input as unknown as OpenScreenInput, { quranEdition, lang });
          if (out.error) {
            isError = true;
            result = out.error;
          } else if (out.action && actions.length < 4) {
            actions.push(out.action);
            if (input.navigate_now === true && !autoNavigate) autoNavigate = out.action.target;
            result = 'Button added.';
          } else {
            result = 'Button limit reached.';
          }
        } else {
          isError = true;
          result = `Unknown tool ${tool.name}`;
        }
        return {
          type: 'tool_result',
          tool_use_id: tool.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
          ...(isError ? { is_error: true } : {}),
        };
      });
      messages.push({ role: 'user', content: results });
    }
  } catch (e) {
    // Rate limits, overload and network problems: the app answers with its on-device assistant instead
    if (e instanceof Anthropic.RateLimitError) return json({ fallback: true, reason: 'rate_limited' }, 503);
    if (e instanceof Anthropic.APIError) {
      console.error('anthropic', e.status, e.message);
      return json({ fallback: true, reason: 'api_error' }, 503);
    }
    console.error('assistant', e);
    return json({ fallback: true, reason: 'error' }, 503);
  }

  if (!text && actions.length === 0) return json({ fallback: true, reason: 'empty' });
  return json({ text, actions, autoNavigate });
});
