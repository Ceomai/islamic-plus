import { DUA_AUDIO_URLS } from './duaAudioUrls';

export interface Dua {
  id: string;
  category: 'morning' | 'evening' | 'prayer' | 'travel' | 'food' | 'general';
  titleKey: string;
  arabic: string;
  transliteration: string;
  translationEn: string;
  translationTr: string;
  /** Remote audio URL (can be cached offline) */
  audioUrl?: string;
  repeat?: number;
}

export const DUAS: Dua[] = [
  {
    id: 'morning-1',
    category: 'morning',
    titleKey: 'duas.morning1',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
    transliteration: 'Asbahna wa asbahal-mulku lillah',
    translationEn: 'We have reached the morning and at this very time all sovereignty belongs to Allah.',
    translationTr: 'Sabaha erdik; mülk bu sabah da Allah\'ındır.',
    audioUrl: DUA_AUDIO_URLS['morning-1'],
    repeat: 1,
  },
  {
    id: 'evening-1',
    category: 'evening',
    titleKey: 'duas.evening1',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ',
    transliteration: 'Amsayna wa amsal-mulku lillah',
    translationEn: 'We have reached the evening and at this very time all sovereignty belongs to Allah.',
    translationTr: 'Akşama erdik; mülk bu akşam da Allah\'ındır.',
    audioUrl: DUA_AUDIO_URLS['evening-1'],
    repeat: 1,
  },
  {
    id: 'before-food',
    category: 'food',
    titleKey: 'duas.beforeFood',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    translationEn: 'In the name of Allah.',
    translationTr: 'Allah\'ın adıyla.',
    audioUrl: DUA_AUDIO_URLS['before-food'],
    repeat: 1,
  },
  {
    id: 'after-food',
    category: 'food',
    titleKey: 'duas.afterFood',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
    transliteration: 'Alhamdu lillahil-ladhi at\'amana wa saqana wa ja\'alana muslimin',
    translationEn: 'Praise be to Allah Who has fed us and given us drink and made us Muslims.',
    translationTr: 'Bizi yediren, içiren ve Müslüman kılan Allah\'a hamd olsun.',
    audioUrl: DUA_AUDIO_URLS['after-food'],
    repeat: 1,
  },
  {
    id: 'enter-mosque',
    category: 'prayer',
    titleKey: 'duas.enterMosque',
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Allahummaftah li abwaba rahmatik',
    translationEn: 'O Allah, open for me the doors of Your mercy.',
    translationTr: 'Allah\'ım, bana rahmet kapılarını aç.',
    audioUrl: DUA_AUDIO_URLS['enter-mosque'],
    repeat: 1,
  },
  {
    id: 'travel',
    category: 'travel',
    titleKey: 'duas.travel',
    arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ',
    transliteration: 'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin',
    translationEn: 'Glory to Him Who has subjected this to us, and we could never have it by our efforts.',
    translationTr: 'Bunu bizim hizmetimize veren Allah\'ı tesbih ederiz; yoksa buna güç yetiremezdik.',
    audioUrl: DUA_AUDIO_URLS['travel'],
    repeat: 1,
  },
  {
    id: 'istighfar',
    category: 'general',
    titleKey: 'duas.istighfar',
    arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ',
    transliteration: 'Astaghfirullahal-azim',
    translationEn: 'I seek forgiveness from Allah, the Magnificent.',
    translationTr: 'Azim olan Allah\'tan bağışlanma dilerim.',
    audioUrl: DUA_AUDIO_URLS['istighfar'],
    repeat: 3,
  },
  {
    id: 'sleep',
    category: 'evening',
    titleKey: 'duas.sleep',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya',
    translationEn: 'In Your name O Allah, I die and I live.',
    translationTr: 'Allah\'ım, senin adınla ölür ve dirilirim.',
    audioUrl: DUA_AUDIO_URLS['sleep'],
    repeat: 1,
  },
];

export function getDuaAudioUrl(duaId: string): string | undefined {
  return DUA_AUDIO_URLS[duaId];
}

export const DUA_CATEGORIES = ['morning', 'evening', 'prayer', 'travel', 'food', 'general'] as const;
