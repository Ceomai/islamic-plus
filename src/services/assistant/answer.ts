import { SURAHS } from '../../data/surahs';
import type { AssistantAction, AssistantTarget } from '../../types';
import { AYAT_KURSI, DUA_WORDS, EXPLAIN_WORDS, GREET_WORDS, HELP_WORDS, OPEN_VERBS, PRAYER_NAMES } from './lexicon';
import { findDuas, findFeature, findSurah, findTopic, generalKnowledgeAnswer, knowledgeText } from './matchers';
import { anyWord, detectLanguage, hasWord, makeQuery } from './normalize';
import { T, clip, contentLang, featureAction, fill, surahTarget } from './reply';
import type { AssistantContext, AssistantReply } from './types';

/**
 * On-device assistant: detects the question's language (tr, en, ar, de, fr), finds what the user
 * wants (a page, a surah, a dua, a Learn topic or app help) and answers in that language with
 * buttons that open the matching screen. Clear requests ("open…", a named dua or surah) also
 * navigate on their own.
 */
export function askAssistant(raw: string, ctx: AssistantContext): AssistantReply {
  const lang = detectLanguage(raw, ctx.appLang);
  const q = makeQuery(raw);
  const reply = (text: string, actions: AssistantAction[] = [], autoNavigate?: AssistantTarget): AssistantReply => ({ lang, text, actions, autoNavigate });

  if (!q.folded) return reply(T.empty[lang]);
  if (anyWord(q, HELP_WORDS)) return reply(T.help[lang]);

  const wantsOpen = anyWord(q, OPEN_VERBS[lang]) || anyWord(q, OPEN_VERBS.en);
  const wantsExplain = anyWord(q, EXPLAIN_WORDS[lang]);
  const saysDua = Object.values(DUA_WORDS).some((w) => anyWord(q, w));
  const feature = findFeature(q);

  // 1. Ayat al-Kursi and surahs
  if (AYAT_KURSI.some((a) => hasWord(q, a))) {
    const target = surahTarget(SURAHS[1], ctx, lang, 255);
    return reply(T.ayatKursi[lang], [{ label: lang === 'tr' ? 'Bakara 255' : 'Al-Baqarah 2:255', icon: 'book-outline', target }], target);
  }
  const surah = saysDua ? null : findSurah(q, lang);
  if (surah) {
    const s = surah.surah;
    const name = lang === 'tr' ? s.tr : lang === 'ar' ? s.ar : s.en;
    const target = surahTarget(s, ctx, lang);
    const action = { label: name, icon: 'book-outline', target };
    return surah.explicit
      ? reply(fill(T.surahOpening[lang], { name, n: s.number }), [action], target)
      : reply(fill(T.surahOffer[lang], { name, n: s.number }), [action]);
  }

  // A topic whose title matches well ("abdesti bozan durumlar") beats a purpose word inside it
  const topic = findTopic(q, lang);
  const topicFirst = !saysDua && topic !== null && (topic.score >= 6 || (wantsExplain && topic.score >= 4));

  // 2. Duas by purpose or name. A long, specific page phrase ("zikir istatistikleri") wins over the word "zikir".
  const strongFeature = feature && feature.weight >= 5 && feature.feature.id !== 'duas';
  const featureWins = feature && feature.weight >= 8 && feature.feature.id !== 'duas';
  if (!topicFirst && !featureWins && (saysDua || !strongFeature)) {
    const { duas, concept, recited } = findDuas(q, lang);
    if (duas.length > 0 && (saysDua || concept || recited)) {
      const [top, ...rest] = duas;
      const cl = contentLang(lang);
      const parts = [fill(T.duaFound[lang], { title: top.title[cl] })];
      if (lang === 'ar') parts.push(top.arabic);
      parts.push(`${clip(top.translation[cl], 260)} ${T.meaningEn[lang]}`.trim());
      if (top.repeat && top.repeat > 1) parts.push(fill(T.repeat[lang], { n: top.repeat }));
      const explicit = saysDua || wantsOpen || wantsExplain;
      parts.push(explicit ? T.duaGoing[lang] : T.duaPick[lang]);
      if (rest.length) parts.push(T.others[lang]);
      const actions = duas.map((d) => ({ label: d.title[cl], icon: 'hand-left-outline', target: { screen: 'DuaDetail', params: { duaId: d.id } } }));
      return reply(parts.join('\n\n'), actions, explicit ? actions[0].target : undefined);
    }
  }

  // 3. Live answer: next prayer
  if (feature?.feature.id === 'prayerTimes' && !wantsOpen) {
    const action = featureAction(feature.feature, lang);
    if (!ctx.nextPrayer) return reply(T.noLocation[lang], [action]);
    return reply(fill(T.nextPrayer[lang], { name: PRAYER_NAMES[ctx.nextPrayer.name][lang], time: ctx.nextPrayer.time }), [action]);
  }

  // 4. Explicit "open X"
  if (feature && wantsOpen) {
    return reply(fill(T.opening[lang], { name: feature.feature.name[lang] }), [featureAction(feature.feature, lang)], feature.feature.target);
  }

  // 5. Learn topics ("what breaks the fast?")
  if (topic && (topicFirst || wantsExplain || !feature || feature.weight < 5)) {
    const { entry: found } = topic;
    const cl = contentLang(lang);
    const first = found.topic.sections[0];
    const detail = first?.text?.[cl] ?? (first?.bullets?.[cl] ?? []).slice(0, 4).map((b) => `• ${b}`).join('\n');
    const text = [fill(T.topic[lang], { title: found.topic.title[cl] }), found.topic.summary[cl], clip(detail, 420), T.topicMore[lang]]
      .filter(Boolean)
      .join('\n\n');
    const actions: AssistantAction[] = [{ label: T.openTopic[lang], icon: 'school-outline', target: { screen: 'EducationDetail', params: { topicId: found.topic.id } } }];
    if (feature) actions.push(featureAction(feature.feature, lang));
    return reply(text, actions, wantsOpen ? actions[0].target : undefined);
  }

  // 6. A feature was mentioned: explain it and offer the page
  if (feature) {
    const how = knowledgeText(feature.feature.knowledgeId, lang);
    return reply(how ?? fill(T.canOpen[lang], { name: feature.feature.name[lang] }), [featureAction(feature.feature, lang)]);
  }

  if (anyWord(q, GREET_WORDS)) return reply(T.greeting[lang]);

  const general = generalKnowledgeAnswer(q, lang);
  if (general) return reply(general);

  return { ...reply(T.fallback[lang]), matched: false };
}
