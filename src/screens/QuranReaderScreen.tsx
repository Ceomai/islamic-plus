import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View, type ViewToken } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QURAN_EDITIONS } from '../constants/defaults';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { fetchSurah, type Ayah } from '../services/quranApi';
import { addQuranBookmark, updateQuranLastRead } from '../services/readingProgress';
import { AppText, Button, IconBadge, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'QuranReader'>;

export function QuranReaderScreen({ route }: Props) {
  const { surahNumber, edition, surahName } = route.params;
  const { settings, quranProgress, refreshReadingProgress, trackActivity } = useApp();
  const { colors, radius, space, type } = useTheme();
  const { t } = useTranslation();
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const listRef = useRef<FlatList<Ayah>>(null);
  const lastAyahRef = useRef(1);
  const isArabic = edition.startsWith('ar.');
  const editionName = QURAN_EDITIONS.find((e) => e.id === edition)?.name ?? edition;

  // Resume where the reader left off in this surah and edition
  const resumeAyah =
    quranProgress.lastRead?.surahNumber === surahNumber && quranProgress.lastRead.edition === edition
      ? quranProgress.lastRead.ayahNumber
      : null;

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    fetchSurah(surahNumber, edition)
      .then((r) => {
        setAyahs(r.ayahs);
        if (r.ayahs.length === 0) setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [surahNumber, edition]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!resumeAyah || ayahs.length === 0) return;
    const index = Math.min(resumeAyah - 1, ayahs.length - 1);
    if (index > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0 }));
    }
  }, [ayahs.length]);

  useEffect(() => {
    return () => {
      void updateQuranLastRead(settings.activeFamilyMemberId, surahNumber, edition, surahName, lastAyahRef.current).then(
        () => refreshReadingProgress()
      );
      void trackActivity('quran');
    };
  }, [settings.activeFamilyMemberId, surahNumber, edition, surahName, refreshReadingProgress, trackActivity]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visible = viewableItems.filter((v) => v.isViewable && v.item).map((v) => (v.item as Ayah).numberInSurah);
    if (visible.length > 0) lastAyahRef.current = Math.max(...visible);
  }).current;

  const bookmarked = useMemo(
    () =>
      new Set(
        quranProgress.bookmarks
          .filter((b) => b.surahNumber === surahNumber && b.edition === edition)
          .map((b) => b.ayahNumber)
      ),
    [quranProgress.bookmarks, surahNumber, edition]
  );

  const bookmarkAyah = async (ayahNumber: number) => {
    lastAyahRef.current = ayahNumber;
    await addQuranBookmark(settings.activeFamilyMemberId, {
      surahNumber,
      surahName,
      edition,
      ayahNumber,
      label: `${surahName} ${ayahNumber}`,
    });
    await refreshReadingProgress();
  };

  const renderAyah = ({ item: a }: { item: Ayah }) => {
    const marked = bookmarked.has(a.numberInSurah);
    return (
      <View style={{ paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[2] }}>
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
        <AppText style={isArabic ? type.arabic : { fontSize: 17, lineHeight: 28 }}>{a.text}</AppText>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], backgroundColor: colors.background }}>
        <IconBadge name="cloud-offline-outline" size="lg" tone="neutral" />
        <AppText variant="body" tone="secondary" align="center" style={{ marginVertical: space[4] }}>
          {t('quran.loadError')}
        </AppText>
        <Button label={t('common.retry')} onPress={load} variant="secondary" icon="refresh" />
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: space[4], paddingBottom: space[10] }}
      data={ayahs}
      keyExtractor={(a) => String(a.numberInSurah)}
      renderItem={renderAyah}
      extraData={bookmarked}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
      onScrollToIndexFailed={({ index, averageItemLength }) =>
        listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false })
      }
      ListHeaderComponent={
        <Surface variant="hero" padding={space[5]} style={{ alignItems: 'center', marginBottom: space[2] }}>
          <AppText variant="title" color={colors.onHero} align="center">
            {surahName}
          </AppText>
          <AppText variant="caption" color={colors.onHeroMuted} align="center" style={{ marginTop: space[1] }}>
            {ayahs.length} {t('quran.ayahs')} · {editionName}
          </AppText>
        </Surface>
      }
    />
  );
}
