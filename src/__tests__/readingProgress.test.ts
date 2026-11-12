import { describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../services/readingProgressCloud', () => ({ scheduleReadingProgressCloudSync: jest.fn() }));
jest.mock('../services/userDataCloud', () => ({ notifyAppDataChanged: jest.fn() }));

import { addHadithBookmark, addQuranBookmark, removeHadithBookmark, removeQuranBookmark } from '../services/readingProgress';

describe('bookmarks can be removed (Y7)', () => {
  it('adds and removes Quran and hadith bookmarks', async () => {
    await AsyncStorage.clear();
    await addQuranBookmark(null, { surahNumber: 36, surahName: 'Yâsîn', edition: 'tr.diyanet', ayahNumber: 5, label: 'Yâsîn 5' });
    await addQuranBookmark(null, { surahNumber: 36, surahName: 'Yâsîn', edition: 'tr.diyanet', ayahNumber: 9, label: 'Yâsîn 9' });
    const after = await removeQuranBookmark(null, 36, 5);
    expect(after.bookmarks.map((b) => b.ayahNumber)).toEqual([9]);
    await addHadithBookmark(null, 'bukhari', 'Buhârî', 12, 'x');
    expect((await removeHadithBookmark(null, 'bukhari', 12)).bookmarks).toHaveLength(0);
  });
});

describe('fast taps on tasbih and kaza (O2)', () => {
  it('counts every tasbih tap', async () => {
    const { incrementTasbih, loadTasbihData } = require('../services/tasbihStorage') as typeof import('../services/tasbihStorage');
    await AsyncStorage.clear();
    await Promise.all(Array.from({ length: 33 }, () => incrementTasbih(100)));
    const data = await loadTasbihData();
    expect(data.count).toBe(33);
    expect(data.total).toBe(33);
  });
  it('applies every kaza +/- tap', async () => {
    const { changeKaza, loadKaza } = require('../services/kaza') as typeof import('../services/kaza');
    await AsyncStorage.clear();
    await Promise.all([changeKaza('fajr', 1), changeKaza('fajr', 1), changeKaza('fajr', 1), changeKaza('fajr', -1)]);
    expect((await loadKaza()).counts.fajr).toBe(2);
  });
});
