import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';
import { fetchSurah, type Ayah } from '../services/quranApi';
import { addQuranBookmark, updateQuranLastRead } from '../services/readingProgress';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QuranReader'>;

export function QuranReaderScreen({ route }: Props) {
  const { surahNumber, edition, surahName } = route.params;
  const { settings, refreshReadingProgress, trackActivity } = useApp();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const lastAyahRef = useRef(1);

  useEffect(() => {
    fetchSurah(surahNumber, edition)
      .then((r) => setAyahs(r.ayahs))
      .finally(() => setLoading(false));
  }, [surahNumber, edition]);

  useEffect(() => {
    return () => {
      void updateQuranLastRead(
        settings.activeFamilyMemberId,
        surahNumber,
        edition,
        surahName,
        lastAyahRef.current
      ).then(() => refreshReadingProgress());
      void trackActivity('quran');
    };
  }, [
    settings.activeFamilyMemberId,
    surahNumber,
    edition,
    surahName,
    refreshReadingProgress,
    trackActivity,
  ]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visible = viewableItems
      .filter((v) => v.isViewable && v.item)
      .map((v) => (v.item as Ayah).numberInSurah);
    if (visible.length > 0) {
      lastAyahRef.current = Math.max(...visible);
    }
  }).current;

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
    Alert.alert(t('reading.bookmarked'));
  };

  const renderAyah = useCallback(
    ({ item: a }: { item: Ayah }) => (
      <View style={[styles.ayah, { borderColor: colors.border }]}>
        <View style={styles.ayahHeader}>
          <Text style={[styles.ayahNum, { color: colors.accent }]}>{a.numberInSurah}</Text>
          <Pressable onPress={() => bookmarkAyah(a.numberInSurah)} hitSlop={8}>
            <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
        <Text style={[styles.ayahText, { color: colors.text }]}>{a.text}</Text>
      </View>
    ),
    [colors, surahName, surahNumber, edition, settings.activeFamilyMemberId]
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      data={ayahs}
      keyExtractor={(a) => String(a.numberInSurah)}
      renderItem={renderAyah}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
      ListHeaderComponent={
        <Text style={[styles.title, { color: colors.primary }]}>{surahName}</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  ayah: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  ayahHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ayahNum: { fontSize: 12 },
  ayahText: { fontSize: 18, lineHeight: 32 },
});
