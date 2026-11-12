import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { FlatList, Share, View, type ListRenderItem, type ListViewToken, type TextStyle } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AyahRow } from '../components/quran/AyahRow';
import { MushafRow } from '../components/quran/MushafRow';
import { ReaderSkeleton } from '../components/quran/ReaderSkeleton';
import { MAX_READER_SCALE, MIN_READER_SCALE, ReaderToolbar } from '../components/quran/ReaderToolbar';
import { QURAN_EDITIONS } from '../constants/defaults';
import { useActivity, useReading, useSettings } from '../context/AppContext';
import { useAyahPlayer } from '../hooks/useAyahPlayer';
import { useEventCallback } from '../hooks/useEventCallback';
import { useOptimisticSet } from '../hooks/useOptimisticSet';
import { useResumeScroll } from '../hooks/useResumeScroll';
import { useSurahReading } from '../hooks/useSurahReading';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { stopAudio } from '../services/audio';
import type { ReaderAyah } from '../services/quranApi';
import { addQuranBookmark, removeQuranBookmark, updateQuranLastRead } from '../services/readingProgress';
import type { QuranView } from '../types';
import { AppText, Button, Enter, IconBadge, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'QuranReader'>;

const MUSHAF_CHUNK = 8;
/** An ayah counts as read once this much of it has been on screen */
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 40 };

/** A list row: one ayah, or a block of ayahs in the continuous mushaf view */
type Row = { key: string; ayahs: ReaderAyah[] };

/** The reader's own font-size setting scales the shared type tokens */
const scaled = (style: TextStyle, scale: number): TextStyle => ({
  ...style,
  fontSize: (style.fontSize ?? 0) * scale,
  lineHeight: (style.lineHeight ?? 0) * scale,
});

export function QuranReaderScreen({ navigation, route }: Props) {
  const { surahNumber, edition: routeEdition, surahName, startAyah } = route.params;

  // The stack's static title only said "Surah"
  useLayoutEffect(() => {
    navigation.setOptions({ title: surahName ? `${surahNumber}. ${surahName}` : String(surahNumber) });
  }, [navigation, surahNumber, surahName]);
  const { settings, updateSettings } = useSettings();
  const { quranProgress, refreshReadingProgress } = useReading();
  const { trackActivity } = useActivity();
  const { colors, space, type, layout, motion } = useTheme();
  const { t } = useTranslation();
  const view = settings.quranView;
  const scale = settings.quranFontScale;
  // Older bookmarks may point at an Arabic audio edition; read them with the user's translation
  const translationId = QURAN_EDITIONS.some((e) => e.id === routeEdition) ? routeEdition : settings.quranEditionId;
  const translationName = QURAN_EDITIONS.find((e) => e.id === translationId)?.name ?? translationId;

  const listRef = useRef<FlatList<Row>>(null);
  const lastAyahRef = useRef(1);

  // What the view shows decides what is fetched; switching between views that need the same parts does not refetch
  const needArabic = view !== 'translation';
  const needTransliteration = view === 'study';
  const needTranslation = view === 'arabic' || view === 'mushaf' ? null : translationId;
  const needs = useMemo(
    () => ({ arabic: needArabic, transliteration: needTransliteration, translation: needTranslation }),
    [needArabic, needTransliteration, needTranslation]
  );

  // The unmount cleanup below runs with the values of its first render, so the ayah count lives in a ref
  const ayahCountRef = useRef(0);
  const onLoaded = useCallback((count: number) => {
    ayahCountRef.current = count;
  }, []);
  const { ayahs, hasBismillah, loading, failed, retry } = useSurahReading(surahNumber, needs, onLoaded);
  const { playing, togglePlay, stop } = useAyahPlayer(ayahs, lastAyahRef);

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
  useResumeScroll(listRef, rows, resumeAyah);

  useEffect(() => {
    return () => {
      void stopAudio();
      // A surah that never loaded (offline, error) must not overwrite "continue reading" with ayah 1
      if (ayahCountRef.current === 0) return;
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

  // FlatList does not allow this handler to change identity, so it only touches refs
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const visible = viewableItems
      .filter((v) => v.isViewable && v.item)
      .flatMap((v) => (v.item as Row).ayahs.map((a) => a.numberInSurah));
    if (visible.length > 0) lastAyahRef.current = Math.max(...visible);
  }, []);

  const storedBookmarks = useMemo(
    () => new Set(quranProgress.bookmarks.filter((b) => b.surahNumber === surahNumber).map((b) => b.ayahNumber)),
    [quranProgress.bookmarks, surahNumber]
  );
  // The icon changes on the tap; storage and the bookmark list catch up behind it
  const { shown: bookmarked, toggle: toggleBookmarkShown } = useOptimisticSet(storedBookmarks);

  // Row handlers keep their identity, so the memoized rows re-render only when their own ayah changes
  const shareAyah = useEventCallback((a: ReaderAyah) => {
    const text = [a.arabic, a.translation, `— ${surahName} ${surahNumber}:${a.numberInSurah}`].filter(Boolean).join('\n\n');
    void Share.share({ message: text });
  });

  // The bookmark button toggles: a second tap removes the bookmark
  const bookmarkAyah = useEventCallback((ayahNumber: number) => {
    lastAyahRef.current = ayahNumber;
    const adding = !bookmarked.has(ayahNumber);
    if (adding) void Haptics.selectionAsync();
    void toggleBookmarkShown(ayahNumber, async () => {
      if (adding) {
        await addQuranBookmark(settings.activeFamilyMemberId, {
          surahNumber,
          surahName,
          edition: translationId,
          ayahNumber,
          label: `${surahName} ${ayahNumber}`,
        });
      } else {
        await removeQuranBookmark(settings.activeFamilyMemberId, surahNumber, ayahNumber);
      }
      await refreshReadingProgress();
    });
  });

  const setView = (next: QuranView) => {
    stop();
    void updateSettings({ quranView: next });
  };
  const setScale = (next: number) =>
    void updateSettings({ quranFontScale: Math.min(MAX_READER_SCALE, Math.max(MIN_READER_SCALE, Math.round(next * 100) / 100)) });

  const arabicStyle = useMemo(() => scaled(type.arabicQuran, scale), [type.arabicQuran, scale]);
  const translationStyle = useMemo(() => scaled(type.body, scale), [type.body, scale]);

  const renderRow = useCallback<ListRenderItem<Row>>(
    ({ item }) => {
      if (view === 'mushaf') {
        const inBlock = playing !== null && item.ayahs.some((a) => a.numberInSurah === playing);
        return <MushafRow ayahs={item.ayahs} playing={inBlock ? playing : null} arabicStyle={arabicStyle} />;
      }
      const a = item.ayahs[0];
      return (
        <AyahRow
          ayah={a}
          marked={bookmarked.has(a.numberInSurah)}
          isPlaying={playing === a.numberInSurah}
          arabicStyle={arabicStyle}
          translationStyle={translationStyle}
          onTogglePlay={togglePlay}
          onShare={shareAyah}
          onBookmark={bookmarkAyah}
        />
      );
    },
    [view, playing, bookmarked, arabicStyle, translationStyle, togglePlay, shareAyah, bookmarkAyah]
  );
  const extraData = useMemo(() => ({ bookmarked, playing, scale }), [bookmarked, playing, scale]);

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
      <ReaderToolbar view={view} scale={scale} onViewChange={setView} onScaleChange={setScale} />

      {loading ? (
        <ReaderSkeleton />
      ) : failed ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6] }}>
          <IconBadge name="cloud-offline-outline" size="lg" tone="neutral" />
          <AppText variant="body" tone="secondary" align="center" style={{ marginVertical: space[4] }}>
            {t('quran.loadError')}
          </AppText>
          <Button label={t('common.retry')} onPress={retry} variant="secondary" icon="refresh" />
        </View>
      ) : (
        <Enter duration={motion.duration.medium} style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            contentContainerStyle={{
              padding: space[4],
              paddingBottom: space[10],
              width: '100%',
              maxWidth: layout.contentMaxWidth,
              alignSelf: 'center',
            }}
            data={rows}
            keyExtractor={(r) => r.key}
            renderItem={renderRow}
            extraData={extraData}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY_CONFIG}
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
            // Tanzil's terms ask for the source to be named wherever its text is shown
            ListFooterComponent={
              <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[4], marginBottom: space[6] }}>
                {t('quran.source', { translation: translationName })}
              </AppText>
            }
          />
        </Enter>
      )}
    </View>
  );
}
