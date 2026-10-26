import type { AppLanguage } from '../types';

export interface Dhikr {
  id: string;
  arabic: string;
  transliteration: string;
  meaning: Record<AppLanguage, string>;
}

export const DHIKR: Dhikr[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'Sübhânallâh',
    meaning: { tr: "Allah'ı her türlü eksiklikten tenzih ederim.", en: 'Glory be to Allah.' },
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Elhamdülillâh',
    meaning: { tr: "Hamd Allah'a mahsustur.", en: 'All praise is for Allah.' },
  },
  {
    id: 'allahuakbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allâhu ekber',
    meaning: { tr: 'Allah en büyüktür.', en: 'Allah is the Greatest.' },
  },
  {
    id: 'tahlil',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ',
    transliteration: 'Lâ ilâhe illallâh',
    meaning: { tr: "Allah'tan başka ilah yoktur.", en: 'There is no god but Allah.' },
  },
  {
    id: 'istighfar',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Estağfirullâh',
    meaning: { tr: "Allah'tan bağışlanma dilerim.", en: 'I seek forgiveness from Allah.' },
  },
  {
    id: 'salawat',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
    transliteration: 'Allâhumme salli alâ Muhammed',
    meaning: { tr: "Allah'ım! Muhammed'e salat eyle.", en: 'O Allah, send blessings upon Muhammad.' },
  },
];

export function getDhikr(id: string | undefined): Dhikr | undefined {
  return DHIKR.find((d) => d.id === id);
}

/** Post-prayer tesbihat: each phrase 33 times, one after another */
export const TESBIHAT_SEQUENCE = ['subhanallah', 'alhamdulillah', 'allahuakbar'];
export const TESBIHAT_COUNT = 33;
