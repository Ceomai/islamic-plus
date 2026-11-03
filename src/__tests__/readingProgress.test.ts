import { describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../services/readingProgressCloud', () => ({ scheduleReadingProgressCloudSync: jest.fn() }));

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
