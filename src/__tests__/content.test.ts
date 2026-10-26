import { describe, expect, it } from '@jest/globals';
import { DHIKR, TESBIHAT_SEQUENCE, getDhikr } from '../data/dhikr';
import { DUAS, DUA_CATEGORIES, searchDuas, translitKey } from '../data/duas';
import { LEARN_CATEGORIES, LEARN_ENTRIES, findLearnTopic, searchLearn } from '../data/learn';
import { SURAHS } from '../data/surahs';

const label = (c: string) => c;

describe('dua library', () => {
  it('has unique ids and both languages for every dua', () => {
    expect(new Set(DUAS.map((d) => d.id)).size).toBe(DUAS.length);
    const categories = new Set(DUA_CATEGORIES.map((c) => c.id));
    for (const d of DUAS) {
      expect(d.title.tr && d.title.en && d.translation.tr && d.translation.en && d.arabic && d.transliteration).toBeTruthy();
      expect(categories.has(d.category)).toBe(true);
    }
  });

  it.each([
    ['sınav', 'difficulty'],
    ['borc', 'debt'],
    ['anxiety', 'distress-hamm'],
    ['rabbena atina', 'rabbana-atina'],
    ['allahumme inni euzu bike minel hemmi', 'distress-hamm'],
    ['rabbi zidni ilma', 'rabbi-zidni'],
  ])('search "%s" finds %s first', (query, id) => {
    expect(searchDuas(query, 'tr', label)[0]?.id).toBe(id);
  });

  it('returns nothing for unrelated words', () => {
    expect(searchDuas('xyzq', 'tr', label)).toHaveLength(0);
  });

  it('gives Turkish and English transliterations the same sound-alike key', () => {
    expect(translitKey("a'udhu bika")).toBe(translitKey('euzu bike'));
    expect(translitKey('Allahumma')).toBe(translitKey('Allahümme'));
    expect(translitKey('rabbana')).toBe(translitKey('rabbena'));
    expect(translitKey('Bismillahi')).toBe(translitKey('bismillah'));
  });
});

describe('Learn library', () => {
  it('has unique topic ids and text in both languages', () => {
    expect(new Set(LEARN_ENTRIES.map((e) => e.topic.id)).size).toBe(LEARN_ENTRIES.length);
    expect(LEARN_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    for (const { topic } of LEARN_ENTRIES) {
      expect(topic.title.tr && topic.title.en && topic.summary.tr && topic.summary.en).toBeTruthy();
      expect(topic.sections.length).toBeGreaterThan(0);
    }
  });

  it('keeps the original comparative topic ids so read progress survives', () => {
    for (const id of ['prayer-validity', 'zakat-differences', 'fasting-ramadan', 'halal-food', 'interest-finance']) {
      expect(findLearnTopic(id)?.category.id).toBe('comparative');
    }
  });

  it('search folds Turkish letters and needs every word', () => {
    expect(searchLearn(LEARN_ENTRIES, 'oruc bozan', 'tr')[0]?.topic.id).toBe('orucu-bozanlar');
    expect(searchLearn(LEARN_ENTRIES, 'nisab', 'tr').length).toBeGreaterThan(1);
    expect(searchLearn(LEARN_ENTRIES, 'xyzq', 'tr')).toHaveLength(0);
  });
});

describe('surahs and dhikr', () => {
  it('lists 114 surahs in order', () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS[35]).toMatchObject({ number: 36, tr: 'Yâsîn' });
    expect(SURAHS[113].number).toBe(114);
  });

  it('runs the after-prayer tesbihat in the usual order', () => {
    expect(TESBIHAT_SEQUENCE).toEqual(['subhanallah', 'alhamdulillah', 'allahuakbar']);
    for (const id of TESBIHAT_SEQUENCE) expect(getDhikr(id)).toBeDefined();
    expect(new Set(DHIKR.map((d) => d.id)).size).toBe(DHIKR.length);
  });
});
