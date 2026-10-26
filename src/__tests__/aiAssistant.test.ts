import { describe, expect, it } from '@jest/globals';
import { askAssistant, detectLanguage, type AssistantContext } from '../services/aiAssistant';

const ctx: AssistantContext = { appLang: 'tr', quranEdition: 'tr.diyanet', nextPrayer: { name: 'maghrib', time: '18:15' } };

interface Case {
  q: string;
  lang: string;
  /** Screen of the first button */
  screen?: string;
  params?: Record<string, unknown>;
  /** Whether the reply opens the screen by itself */
  auto?: boolean;
  /** Text the reply must contain */
  text?: string;
}

// Real questions in five languages and what the on-device assistant must do with them
const CASES: Case[] = [
  // Surahs
  { q: 'Yasin suresini aç', lang: 'tr', screen: 'QuranReader', params: { surahNumber: 36 }, auto: true },
  { q: '36. sure', lang: 'tr', screen: 'QuranReader', params: { surahNumber: 36 }, auto: true },
  { q: 'Kehf', lang: 'tr', screen: 'QuranReader', params: { surahNumber: 18 }, auto: false },
  { q: 'ayetel kürsi', lang: 'tr', screen: 'QuranReader', params: { surahNumber: 2, startAyah: 255 }, auto: true },
  { q: 'سورة الكهف', lang: 'ar', screen: 'QuranReader', params: { surahNumber: 18 }, auto: true },
  { q: 'Öffne Sure Al-Fatiha', lang: 'de', screen: 'QuranReader', params: { surahNumber: 1 }, auto: true },
  { q: 'ouvre la sourate al-mulk', lang: 'fr', screen: 'QuranReader', params: { surahNumber: 67 }, auto: true },
  { q: 'open surah rahman', lang: 'en', screen: 'QuranReader', params: { surahNumber: 55 }, auto: true },
  // Duas by purpose
  { q: 'Yolculuk duasını açıkla', lang: 'tr', screen: 'DuaDetail', params: { duaId: 'travel' }, auto: true },
  { q: 'borç için dua', lang: 'tr', screen: 'DuaDetail', params: { duaId: 'debt' }, auto: true },
  { q: 'yemekten sonra ne okunur', lang: 'tr', screen: 'DuaDetail', params: { duaId: 'after-food' }, auto: false },
  { q: 'dua for anxiety', lang: 'en', screen: 'DuaDetail', params: { duaId: 'distress-hamm' }, auto: true },
  { q: 'what to say before sleeping', lang: 'en', screen: 'DuaDetail', params: { duaId: 'sleep' }, auto: true },
  { q: 'دعاء السفر', lang: 'ar', screen: 'DuaDetail', params: { duaId: 'travel' }, auto: true },
  { q: 'Bittgebet vor dem Schlafen', lang: 'de', screen: 'DuaDetail', params: { duaId: 'sleep' }, auto: true },
  { q: 'Gebet für Schulden', lang: 'de', screen: 'DuaDetail', params: { duaId: 'debt' }, auto: true },
  { q: 'invocation pour le voyage', lang: 'fr', screen: 'DuaDetail', params: { duaId: 'travel' }, auto: true },
  { q: "j'ai peur", lang: 'fr', screen: 'DuaDetail', params: { duaId: 'distress-hamm' } },
  // Duas by their words, in any spelling
  { q: 'rabbena atina', lang: 'tr', screen: 'DuaDetail', params: { duaId: 'rabbana-atina' } },
  { q: 'allahumma inni a udhu bika minal hammi', lang: 'en', screen: 'DuaDetail', params: { duaId: 'distress-hamm' } },
  { q: 'subhanallahi ve bihamdihi', lang: 'tr', screen: 'DuaDetail', params: { duaId: 'subhanallahi-wabihamdihi' } },
  { q: 'bismillahi tevekkeltu alallah', lang: 'tr', screen: 'DuaDetail', params: { duaId: 'leave-home' } },
  // Live answer
  { q: 'Sıradaki namaz ne zaman?', lang: 'tr', screen: 'Home', text: '18:15' },
  { q: 'when is the next prayer', lang: 'en', screen: 'Home', text: 'Maghrib' },
  { q: 'متى الصلاة القادمة', lang: 'ar', screen: 'Home', text: 'المغرب' },
  // Pages
  { q: 'Kıbleyi göster', lang: 'tr', screen: 'Qibla', auto: true },
  { q: 'zikir istatistiklerimi göster', lang: 'tr', screen: 'TasbihStats', auto: true },
  { q: 'dualar sayfasını aç', lang: 'tr', screen: 'Duas', auto: true },
  { q: 'en yakın cami', lang: 'tr', screen: 'Places', params: { type: 'mosque' }, auto: false },
  { q: 'zekat hesapla', lang: 'tr', screen: 'Duties' },
  { q: 'افتح القبلة', lang: 'ar', screen: 'Qibla', auto: true },
  { q: 'zeig die qibla', lang: 'de', screen: 'Qibla', auto: true },
  { q: 'ouvre le tasbih', lang: 'fr', screen: 'Tasbih', auto: true },
  { q: 'imsakiyeyi aç', lang: 'tr', screen: 'Imsakiye', auto: true },
  { q: 'iftara ne kadar kaldı', lang: 'tr', screen: 'Imsakiye' },
  { q: 'kaza namazı takibi', lang: 'tr', screen: 'Kaza' },
  // Learn topics
  { q: 'Orucu bozan şeyler nedir?', lang: 'tr', screen: 'EducationDetail', params: { topicId: 'orucu-bozanlar' } },
  { q: 'abdesti bozan durumlar', lang: 'tr', screen: 'EducationDetail', params: { topicId: 'abdesti-bozanlar' } },
  { q: 'abdest nasıl alınır', lang: 'tr', screen: 'EducationDetail', params: { topicId: 'abdest-farzlari' } },
  { q: 'sabah namazı kaç rekat', lang: 'tr', screen: 'EducationDetail', params: { topicId: 'vakit-rekatlar' } },
  { q: 'zekat kimlere verilir', lang: 'tr', screen: 'EducationDetail', params: { topicId: 'zekat-verilecekler' } },
  { q: 'What breaks the fast?', lang: 'en', screen: 'EducationDetail', params: { topicId: 'orucu-bozanlar' } },
  { q: 'what is zakat', lang: 'en', screen: 'EducationDetail', params: { topicId: 'zekat-kimlere-farz' } },
  { q: 'ما هي مبطلات الصيام', lang: 'ar', screen: 'EducationDetail', params: { topicId: 'orucu-bozanlar' } },
  { q: 'was bricht das fasten', lang: 'de', screen: 'EducationDetail', params: { topicId: 'orucu-bozanlar' } },
  { q: 'comment faire les ablutions', lang: 'fr', screen: 'EducationDetail', params: { topicId: 'abdest-farzlari' } },
];

describe('on-device assistant', () => {
  it.each(CASES)('$q', ({ q, lang, screen, params, auto, text }) => {
    const reply = askAssistant(q, ctx);
    expect(reply.lang).toBe(lang);
    if (screen) {
      expect(reply.actions[0]?.target.screen).toBe(screen);
      if (params) expect(reply.actions[0]?.target.params).toMatchObject(params);
    }
    if (auto === true) expect(reply.autoNavigate).toEqual(reply.actions[0].target);
    if (auto === false) expect(reply.autoNavigate).toBeUndefined();
    if (text) expect(reply.text).toContain(text);
  });

  it('answers help, greetings and nonsense without buttons', () => {
    expect(askAssistant('yardım', ctx).text).toContain('Türkçe, İngilizce, Arapça');
    expect(askAssistant('selam', ctx).actions).toHaveLength(0);
    const unknown = askAssistant('asdfgh', ctx);
    expect(unknown.actions).toHaveLength(0);
    expect(unknown.text).toContain('Yasin');
  });

  it('asks for location when the next prayer is unknown', () => {
    const reply = askAssistant('when is the next prayer', { ...ctx, nextPrayer: null });
    expect(reply.text).toContain('location');
    expect(reply.actions[0].target.screen).toBe('Home');
  });
});

describe('language detection', () => {
  it.each([
    ['I feel anxious', 'en'],
    ['ich habe angst', 'de'],
    ['Kıbleyi göster', 'tr'],
    ['دعاء', 'ar'],
    ['prochaine prière', 'fr'],
    // Transliterated Arabic says nothing about the writer; the app language wins
    ['la ilahe illa ente', 'tr'],
  ])('%s → %s', (q, lang) => {
    expect(detectLanguage(q, 'tr')).toBe(lang);
  });
});
