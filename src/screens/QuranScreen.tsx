import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QURAN_EDITIONS } from '../constants/defaults';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { SURAHS } from '../data/surahs';
import { fold } from '../services/aiAssistant';
import type { SurahListItem } from '../services/quranApi';
import type { QuranBookmark } from '../types';
import { removeQuranBookmark, startNewKhatm } from '../services/readingProgress';
import { AppText, Button, IconBadge, SearchField, Surface } from '../ui';
import { animateNextLayout } from '../ui/motion';

type Props = NativeStackScreenProps<RootStackParamList, 'Quran'>;

export function QuranScreen({ navigation }: Props) {
  const { settings, quranProgress, refreshReadingProgress } = useApp();
  const { colors, radius, space, motion } = useTheme();
  const { t, lang } = useTranslation();
  const [query, setQuery] = useState('');
  // Bookmarks being removed leave the list at once (animated) while storage catches up
  const [removing, setRemoving] = useState<ReadonlySet<string>>(() => new Set());
  const edition = settings.quranEditionId;
  const editionMeta = QURAN_EDITIONS.find((e) => e.id === edition);

  // The surah list ships with the app, so it opens instantly and offline (it used to need the API)
  const surahs = useMemo<SurahListItem[]>(
    () => SURAHS.map((s) => ({ number: s.number, name: s.ar, englishName: lang === 'tr' ? s.tr : s.en, numberOfAyahs: s.ayahs })),
    [lang]
  );

  // Accents, dashes and Turkish letters are ignored, and every spelling is searched:
  // "yasin" finds Yâsîn (it found nothing), "al-kahf" and "kehf" find Kehf
  const filtered = useMemo(() => {
    const key = (t: string) => fold(t).replace(/s+/g, '');
    const q = key(query);
    if (!q) return surahs;
    return surahs.filter((s) => {
      if (String(s.number) === query.trim()) return true;
      const names = SURAHS[s.number - 1];
      return [names.tr, names.en, names.ar].some((n) => key(n).includes(q));
    });
  }, [surahs, query]);

  const lastRead = quranProgress.lastRead;
  const completed = useMemo(() => new Set(quranProgress.completedSurahs ?? []), [quranProgress.completedSurahs]);
  const bookmarks = quranProgress.bookmarks.filter((b) => !removing.has(b.id));
  const removeBookmark = async (b: QuranBookmark) => {
    animateNextLayout();
    setRemoving((prev) => new Set(prev).add(b.id));
    try {
      await removeQuranBookmark(settings.activeFamilyMemberId, b.surahNumber, b.ayahNumber);
      await refreshReadingProgress();
    } finally {
      // Gone from storage now (or, on failure, shown again)
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(b.id);
        return next;
      });
    }
  };

  const newKhatm = async () => {
    await startNewKhatm(settings.activeFamilyMemberId);
    await refreshReadingProgress();
  };

  const header = (
    <View style={{ paddingBottom: space[2] }}>
      {lastRead && (
        <Surface
          variant="soft"
          onPress={() =>
            navigation.navigate('QuranReader', {
              surahNumber: lastRead.surahNumber,
              edition: lastRead.edition,
              surahName: lastRead.surahName,
            })
          }
          style={{ marginBottom: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] }}
        >
          <IconBadge name="bookmark" tone="brand" />
          <View style={{ flex: 1 }}>
            <AppText variant="captionStrong" tone="onPrimarySoft">
              {t('reading.continueQuran')}
            </AppText>
            <AppText variant="bodyStrong">
              {lastRead.surahName} · {t('reading.ayah')} {lastRead.ayahNumber}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.onPrimarySoft} />
        </Surface>
      )}

      {/* Khatm: surahs read to the end in the current round */}
      <Surface style={{ marginBottom: space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="bodyStrong">{t('quran.khatm')}</AppText>
          <AppText variant="calloutStrong" tone="brand" numeric>
            {completed.size}/114
          </AppText>
        </View>
        <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, marginTop: space[2], overflow: 'hidden' }}>
          <View style={{ width: `${(completed.size / 114) * 100}%`, height: '100%', backgroundColor: colors.primary }} />
        </View>
        <AppText variant="caption" tone="secondary" style={{ marginTop: space[2] }}>
          {completed.size >= 114
            ? t('quran.khatmDone', { n: String(quranProgress.khatmCount ?? 1) })
            : t('quran.khatmHint', { n: String(quranProgress.khatmCount ?? 0) })}
        </AppText>
        {completed.size >= 114 && (
          <Button label={t('quran.newKhatm')} icon="refresh" variant="secondary" onPress={newKhatm} style={{ marginTop: space[3] }} />
        )}
      </Surface>

      {/* Bookmarks saved in the reader: open one, or remove it */}
      {bookmarks.length > 0 && (
        <Surface padding={space[1]} style={{ marginBottom: space[4], paddingHorizontal: space[3] }}>
          <AppText variant="bodyStrong" style={{ paddingVertical: space[2] }}>
            {t('reading.bookmarks')} ({bookmarks.length})
          </AppText>
          {bookmarks.map((b) => (
            <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border }}>
              <Pressable
                onPress={() => navigation.navigate('QuranReader', { surahNumber: b.surahNumber, edition: b.edition, surahName: b.surahName, startAyah: b.ayahNumber })}
                accessibilityRole="button"
                accessibilityLabel={`${b.surahName}, ${t('reading.ayah')} ${b.ayahNumber}`}
                style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
              >
                <AppText variant="body">
                  {b.surahName} · {t('reading.ayah')} {b.ayahNumber}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => void removeBookmark(b)}
                accessibilityRole="button"
                accessibilityLabel={`${t('reading.removeBookmark')}: ${b.surahName} ${b.ayahNumber}`}
                hitSlop={8}
                style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? motion.pressedOpacity : 1 })}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </Surface>
      )}

      <SearchField value={query} onChangeText={setQuery} placeholder={t('quran.search')} style={{ marginBottom: space[2] }} />
      <AppText variant="caption" tone="muted">
        {t('quran.edition')}: {editionMeta?.name ?? edition}
      </AppText>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: space[4], paddingBottom: space[8] }}
      data={filtered}
      keyExtractor={(item) => String(item.number)}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <AppText variant="callout" tone="muted" align="center" style={{ marginTop: space[6] }}>
          {t('quran.noResults')}
        </AppText>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('QuranReader', { surahNumber: item.number, edition, surahName: item.englishName })}
          accessibilityRole="button"
          accessibilityLabel={[
            `${item.number}. ${item.englishName}`,
            `${item.numberOfAyahs} ${t('quran.ayahs')}`,
            completed.has(item.number) ? t('quran.surahRead') : null,
          ]
            .filter(Boolean)
            .join(', ')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: space[3],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            opacity: pressed ? motion.pressedOpacity : 1,
          })}
        >
          <View
            style={{
              // min sizes, so three-digit numbers at large text sizes grow the box instead of clipping
              minWidth: space[10],
              minHeight: space[10],
              paddingHorizontal: space[1],
              borderRadius: radius.md,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: space[3],
            }}
          >
            <AppText variant="calloutStrong" tone="onPrimarySoft" numeric>
              {item.number}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
              <AppText variant="bodyStrong">{item.englishName}</AppText>
              {completed.has(item.number) && <Ionicons name="checkmark-circle" size={14} color={colors.primaryText} />}
            </View>
            <AppText variant="caption" tone="secondary">
              {item.numberOfAyahs} {t('quran.ayahs')}
            </AppText>
          </View>
          <AppText variant="arabicPreview" tone="brand">
            {item.name}
          </AppText>
        </Pressable>
      )}
    />
  );
}
