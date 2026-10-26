import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Share, View, type ListViewToken } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QURAN_AUDIO_BASE, QURAN_EDITIONS } from '../constants/defaults';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { playRemoteAudio, stopAudio } from '../services/audio';
import { fetchSurahReading, type ReaderAyah } from '../services/quranApi';
import { addQuranBookmark, updateQuranLastRead } from '../services/readingProgress';
import type { QuranView } from '../types';
import { AppText, Button, Chip, IconBadge, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'QuranReader'>;

const VIEWS: { id: QuranView; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'parallel', icon: 'albums-outline' },
  { id: 'translation', icon: 'reader-outline' },
  { id: 'arabic', icon: 'text-outline' },
  { id: 'study', icon: 'school-outline' },
  { id: 'mushaf', icon: 'book-outline' },
];
const FONT_STEP = 0.15;
const MUSHAF_CHUNK = 8;
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);

/** A list row: one ayah, or a block of ayahs in the continuous mushaf view */
type Row = { key: string; ayahs: ReaderAyah[] };

export function QuranReaderScreen({ route }: Props) {
  const { surahNumber, edition: routeEdition, surahName, startAyah } = route.params;
  const { settings, updateSettings, quranProgress, refreshReadingProgress, trackActivity } = useApp();
  const { colors, radius, space, type } = useTheme();
  const { t } = useTranslation();
  const view = settings.quranView;
  const scale = settings.quranFontScale;
  // Older bookmarks may point at an Arabic audio edition; read them with the user's translation
  const translationId = QURAN_EDITIONS.some((e) => e.id === routeEdition) ? routeEdition : settings.quranEditionId;
  const translationName = QURAN_EDITIONS.find((e) => e.id === translationId)?.name ?? translationId;

  const [ayahs, setAyahs] = useState<ReaderAyah[]>([]);
  const [hasBismillah, setHasBismillah] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const listRef = useRef<FlatList<Row>>(null);
  const lastAyahRef = useRef(1);
  const scrolledToResume = useRef(false);

  const needs = {
    arabic: view !== 'translation',
    transliteration: view === 'study',
    translation: view === 'arabic' || view === 'mushaf' ? null : translationId,
  };

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    fetchSurahReading(surahNumber, needs)
      .then((r) => {
        setAyahs(r.ayahs);
        setHasBismillah(r.hasBismillahHeader);
        if (r.ayahs.length === 0) setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [surahNumber, needs.arabic, needs.transliteration, needs.translation]);

  useEffect(load, [load]);

  const rows: Row[] = useMemo(() => {
    if (view !== 'mushaf') return ayahs.map((a) => ({ key: String(a.numberInSurah), ayahs: [a] }));
    const out: Row[] = [];
    for (let i = 0; i < ayahs.length; i += MUSHAF_CHUNK) {
      const chunk = ayahs.slice(i, i + MUSHAF_CHUNK);
      out.push({ key: `m${chunk[0].numberInSurah}`, ayahs: chunk });
    }
    return out;
  }, [ayahs, view]);

  // Open at the requested ayah, otherwise resume at the last-read one, once after the first load
  const resumeAyah =
    startAyah ?? (quranProgress.lastRead?.surahNumber === surahNumber ? quranProgress.lastRead.ayahNumber : null);
  useEffect(() => {
    if (scrolledToResume.current || !resumeAyah || rows.length === 0) return;
    scrolledToResume.current = true;
    const index = rows.findIndex((r) => r.ayahs.some((a) => a.numberInSurah === resumeAyah));
    if (index > 0) requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, animated: false }));
  }, [rows.length]);

  // The cleanup below runs with the values of its first render, so the ayah count lives in a ref
  const ayahCountRef = useRef(0);
  ayahCountRef.current = ayahs.length;

  useEffect(() => {
    return () => {
      void stopAudio();
      void updateQuranLastRead(
        settings.activeFamilyMemberId,
        surahNumber,
        translationId,
        surahName,
        lastAyahRef.current,
        ayahCountRef.current
      ).then(
        () => refreshReadingProgress()
      );
      void trackActivity('quran');
    };
  }, [settings.activeFamilyMemberId, surahNumber, translationId, surahName, refreshReadingProgress, trackActivity]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const visible = viewableItems
      .filter((v) => v.isViewable && v.item)
      .flatMap((v) => (v.item as Row).ayahs.map((a) => a.numberInSurah));
    if (visible.length > 0) lastAyahRef.current = Math.max(...visible);
  }).current;

  const bookmarked = useMemo(
    () => new Set(quranProgress.bookmarks.filter((b) => b.surahNumber === surahNumber).map((b) => b.ayahNumber)),
    [quranProgress.bookmarks, surahNumber]
  );

  const shareAyah = (a: ReaderAyah) => {
    const text = [a.arabic, a.translation, `— ${surahName} ${surahNumber}:${a.numberInSurah}`].filter(Boolean).join('\n\n');
    void Share.share({ message: text });
  };

  const bookmarkAyah = async (ayahNumber: number) => {
    lastAyahRef.current = ayahNumber;
    await addQuranBookmark(settings.activeFamilyMemberId, {
      surahNumber,
      surahName,
      edition: translationId,
      ayahNumber,
      label: `${surahName} ${ayahNumber}`,
    });
    await refreshReadingProgress();
  };

  // Recitation continues ayah by ayah until the end of the surah or until stopped
  const playFrom = useCallback(
    async (index: number) => {
      const ayah = ayahs[index];
      if (!ayah) {
        setPlaying(null);
        return;
      }
      setPlaying(ayah.numberInSurah);
      lastAyahRef.current = ayah.numberInSurah;
      const ok = await playRemoteAudio(`${QURAN_AUDIO_BASE}/${ayah.number}.mp3`, () => void playFrom(index + 1));
      if (!ok) setPlaying(null);
    },
    [ayahs]
  );

  const togglePlay = async (numberInSurah: number) => {
    if (playing === numberInSurah) {
      await stopAudio();
      setPlaying(null);
      return;
    }
    await playFrom(ayahs.findIndex((a) => a.numberInSurah === numberInSurah));
  };

  const setView = (next: QuranView) => {
    void stopAudio();
    setPlaying(null);
    void updateSettings({ quranView: next });
  };
  const setScale = (next: number) => void updateSettings({ quranFontScale: Math.min(1.6, Math.max(0.85, Math.round(next * 100) / 100)) });

  const arabicStyle = { ...type.arabic, fontSize: 26 * scale, lineHeight: 48 * scale };
  const translationStyle = { fontSize: 16 * scale, lineHeight: 26 * scale };

  const renderRow = ({ item }: { item: Row }) => {
    if (view === 'mushaf') {
      return (
        <AppText style={[arabicStyle, { textAlign: 'justify', paddingVertical: space[2] }]}>
          {item.ayahs.map((a) => (
            <AppText key={a.numberInSurah} style={arabicStyle} color={playing === a.numberInSurah ? colors.primary : undefined}>
              {a.arabic}{' '}
              <AppText style={[arabicStyle, { color: colors.accent }]}>﴿{toArabicDigits(a.numberInSurah)}﴾ </AppText>
            </AppText>
          ))}
        </AppText>
      );
    }

    const a = item.ayahs[0];
    const marked = bookmarked.has(a.numberInSurah);
    const isPlaying = playing === a.numberInSurah;
    return (
      <View
        style={{
          paddingVertical: space[4],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: isPlaying ? colors.primarySoft : 'transparent',
          marginHorizontal: -space[4],
          paddingHorizontal: space[4],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space[2], gap: space[4] }}>
          <View
            style={{
              minWidth: 32,
              height: 28,
              paddingHorizontal: space[2],
              borderRadius: radius.pill,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="caption" color={colors.onAccentSoft} style={{ fontWeight: '700' }}>
              {a.numberInSurah}
            </AppText>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => togglePlay(a.numberInSurah)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${isPlaying ? t('duas.stop') : t('duas.listen')} ${a.numberInSurah}`}
          >
            <Ionicons name={isPlaying ? 'stop-circle' : 'play-circle-outline'} size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => shareAyah(a)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${t('quran.share')} ${a.numberInSurah}`}
          >
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => bookmarkAyah(a.numberInSurah)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${t('reading.bookmark')} ${a.numberInSurah}`}
            accessibilityState={{ selected: marked }}
          >
            <Ionicons name={marked ? 'bookmark' : 'bookmark-outline'} size={20} color={colors.primary} />
          </Pressable>
        </View>
        {a.arabic ? <AppText style={arabicStyle}>{a.arabic}</AppText> : null}
        {a.transliteration ? (
          <AppText tone="secondary" style={[translationStyle, { fontStyle: 'italic', marginTop: space[2] }]}>
            {a.transliteration}
          </AppText>
        ) : null}
        {a.translation ? (
          <AppText style={[translationStyle, { marginTop: a.arabic ? space[2] : 0 }]}>{a.translation}</AppText>
        ) : null}
      </View>
    );
  };

  const header = (
    <View>
      <Surface variant="hero" padding={space[5]} style={{ alignItems: 'center', marginBottom: space[3] }}>
        <AppText variant="title" color={colors.onHero} align="center">
          {surahName}
        </AppText>
        <AppText variant="caption" color={colors.onHeroMuted} align="center" style={{ marginTop: space[1] }}>
          {ayahs.length} {t('quran.ayahs')}
          {needs.translation ? ` · ${translationName}` : ''}
        </AppText>
      </Surface>
      {hasBismillah && view !== 'translation' ? (
        <AppText tone="brand" style={[arabicStyle, { textAlign: 'center', marginBottom: space[2] }]}>
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </AppText>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Reader toolbar: layout and text size, remembered per account */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: space[4], paddingVertical: space[2], gap: space[2], alignItems: 'center' }}
        >
          {VIEWS.map((v) => (
            <Chip key={v.id} label={t(`quran.view.${v.id}`)} icon={v.icon} selected={view === v.id} onPress={() => setView(v.id)} />
          ))}
          <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: space[1] }} />
          <Pressable
            onPress={() => setScale(scale - FONT_STEP)}
            accessibilityRole="button"
            accessibilityLabel={t('quran.smaller')}
            hitSlop={6}
            style={{ padding: space[1] }}
          >
            <AppText variant="callout" style={{ fontWeight: '700' }}>A−</AppText>
          </Pressable>
          <Pressable
            onPress={() => setScale(scale + FONT_STEP)}
            accessibilityRole="button"
            accessibilityLabel={t('quran.larger')}
            hitSlop={6}
            style={{ padding: space[1] }}
          >
            <AppText variant="heading" style={{ fontWeight: '700' }}>A+</AppText>
          </Pressable>
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : failed ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6] }}>
          <IconBadge name="cloud-offline-outline" size="lg" tone="neutral" />
          <AppText variant="body" tone="secondary" align="center" style={{ marginVertical: space[4] }}>
            {t('quran.loadError')}
          </AppText>
          <Button label={t('common.retry')} onPress={load} variant="secondary" icon="refresh" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          contentContainerStyle={{ padding: space[4], paddingBottom: space[10] }}
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={renderRow}
          extraData={{ bookmarked, playing, scale }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
          // Reaching the bottom (or a short surah that fits on screen) means the last ayah was read
          onEndReached={() => {
            const last = ayahs[ayahs.length - 1];
            if (last) lastAyahRef.current = Math.max(lastAyahRef.current, last.numberInSurah);
          }}
          onEndReachedThreshold={0.1}
          onScrollToIndexFailed={({ index, averageItemLength }) =>
            listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false })
          }
          ListHeaderComponent={header}
        />
      )}
    </View>
  );
}
