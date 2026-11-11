import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, View, type ListViewToken, type TextStyle } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QURAN_AUDIO_BASE, QURAN_EDITIONS } from '../constants/defaults';
import { useApp } from '../context/AppContext';
import { useOptimisticSet } from '../hooks/useOptimisticSet';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { playRemoteAudio, stopAudio } from '../services/audio';
import { fetchSurahReading, type ReaderAyah } from '../services/quranApi';
import { addQuranBookmark, removeQuranBookmark, updateQuranLastRead } from '../services/readingProgress';
import type { QuranView } from '../types';
import { AppText, Button, Chip, Enter, IconBadge, IconButton, SkeletonBlock, SkeletonGroup, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'QuranReader'>;

const VIEWS: { id: QuranView; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'parallel', icon: 'albums-outline' },
  { id: 'translation', icon: 'reader-outline' },
  { id: 'arabic', icon: 'text-outline' },
  { id: 'study', icon: 'school-outline' },
  { id: 'mushaf', icon: 'book-outline' },
];
const FONT_STEP = 0.15;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.6;
const MUSHAF_CHUNK = 8;
/** Loading placeholder: a few ayahs, each an Arabic line and two translation lines */
const SKELETON_AYAHS = 4;
const SKELETON_LINE_WIDTHS = ['100%', '92%', '64%'] as const;
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);

/** A list row: one ayah, or a block of ayahs in the continuous mushaf view */
type Row = { key: string; ayahs: ReaderAyah[] };

export function QuranReaderScreen({ navigation, route }: Props) {
  const { surahNumber, edition: routeEdition, surahName, startAyah } = route.params;

  // The stack's static title only said "Surah"
  useLayoutEffect(() => {
    navigation.setOptions({ title: surahName ? `${surahNumber}. ${surahName}` : String(surahNumber) });
  }, [navigation, surahNumber, surahName]);
  const { settings, updateSettings, quranProgress, refreshReadingProgress, trackActivity } = useApp();
  const { colors, radius, space, type, layout, motion } = useTheme();
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

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const visible = viewableItems
      .filter((v) => v.isViewable && v.item)
      .flatMap((v) => (v.item as Row).ayahs.map((a) => a.numberInSurah));
    if (visible.length > 0) lastAyahRef.current = Math.max(...visible);
  }).current;

  const storedBookmarks = useMemo(
    () => new Set(quranProgress.bookmarks.filter((b) => b.surahNumber === surahNumber).map((b) => b.ayahNumber)),
    [quranProgress.bookmarks, surahNumber]
  );
  // The icon changes on the tap; storage and the bookmark list catch up behind it
  const { shown: bookmarked, toggle: toggleBookmarkShown } = useOptimisticSet(storedBookmarks);

  const shareAyah = (a: ReaderAyah) => {
    const text = [a.arabic, a.translation, `— ${surahName} ${surahNumber}:${a.numberInSurah}`].filter(Boolean).join('\n\n');
    void Share.share({ message: text });
  };

  // The bookmark button toggles: a second tap removes the bookmark
  const bookmarkAyah = (ayahNumber: number) => {
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
  const setScale = (next: number) => void updateSettings({ quranFontScale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(next * 100) / 100)) });

  const atMinScale = scale <= MIN_SCALE;
  const atMaxScale = scale >= MAX_SCALE;
  const scaleText = `${Math.round(scale * 100)}%`;
  const fontButtonStyle = { minWidth: layout.minTouch, minHeight: layout.minTouch, alignItems: 'center', justifyContent: 'center' } as const;

  // The reader's own font-size setting scales the shared type tokens
  const scaled = (style: TextStyle): TextStyle => ({
    ...style,
    fontSize: (style.fontSize ?? 0) * scale,
    lineHeight: (style.lineHeight ?? 0) * scale,
  });
  const arabicStyle = scaled(type.arabicQuran);
  const translationStyle = scaled(type.body);

  const renderRow = ({ item }: { item: Row }) => {
    if (view === 'mushaf') {
      return (
        <AppText style={[arabicStyle, { textAlign: 'justify', paddingVertical: space[2] }]}>
          {item.ayahs.map((a) => (
            <AppText key={a.numberInSurah} style={arabicStyle} color={playing === a.numberInSurah ? colors.primaryText : undefined}>
              {a.arabic}{' '}
              <AppText style={[arabicStyle, { color: colors.accentText }]}>﴿{toArabicDigits(a.numberInSurah)}﴾ </AppText>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space[1], gap: space[1] }}>
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
            <AppText variant="captionStrong" tone="accent" numeric>
              {a.numberInSurah}
            </AppText>
          </View>
          <View style={{ flex: 1 }} />
          <IconButton
            name={isPlaying ? 'stop-circle' : 'play-circle-outline'}
            onPress={() => togglePlay(a.numberInSurah)}
            accessibilityLabel={`${isPlaying ? t('duas.stop') : t('duas.listen')} ${a.numberInSurah}`}
          />
          <IconButton
            name="share-outline"
            size={20}
            onPress={() => shareAyah(a)}
            accessibilityLabel={`${t('quran.share')} ${a.numberInSurah}`}
          />
          <IconButton
            name={marked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            onPress={() => bookmarkAyah(a.numberInSurah)}
            accessibilityLabel={`${marked ? t('reading.removeBookmark') : t('reading.bookmark')} ${a.numberInSurah}`}
            accessibilityState={{ selected: marked }}
            popWhen={marked}
            popFrom={motion.popFromSubtle}
          />
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
            disabled={atMinScale}
            accessibilityRole="button"
            accessibilityLabel={t('quran.smaller')}
            accessibilityState={{ disabled: atMinScale }}
            accessibilityValue={{ text: scaleText }}
            style={[fontButtonStyle, { opacity: atMinScale ? 0.4 : 1 }]}
          >
            <AppText variant="calloutStrong">A−</AppText>
          </Pressable>
          <Pressable
            onPress={() => setScale(scale + FONT_STEP)}
            disabled={atMaxScale}
            accessibilityRole="button"
            accessibilityLabel={t('quran.larger')}
            accessibilityState={{ disabled: atMaxScale }}
            accessibilityValue={{ text: scaleText }}
            style={[fontButtonStyle, { opacity: atMaxScale ? 0.4 : 1 }]}
          >
            <AppText variant="heading">A+</AppText>
          </Pressable>
        </ScrollView>
      </View>

      {loading ? (
        <SkeletonGroup
          accessibilityLabel={t('common.loading')}
          style={{ padding: space[4], gap: space[6], width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
        >
          {Array.from({ length: SKELETON_AYAHS }, (_, i) => (
            <View key={i} style={{ gap: space[2] }}>
              <SkeletonBlock width={space[8]} height={space[6]} radius={radius.pill} />
              <SkeletonBlock height={type.arabicQuran.fontSize ?? space[6]} style={{ marginVertical: space[2] }} />
              {SKELETON_LINE_WIDTHS.map((w) => (
                <SkeletonBlock key={w} width={w} height={space[3]} />
              ))}
            </View>
          ))}
        </SkeletonGroup>
      ) : failed ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6] }}>
          <IconBadge name="cloud-offline-outline" size="lg" tone="neutral" />
          <AppText variant="body" tone="secondary" align="center" style={{ marginVertical: space[4] }}>
            {t('quran.loadError')}
          </AppText>
          <Button label={t('common.retry')} onPress={load} variant="secondary" icon="refresh" />
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
