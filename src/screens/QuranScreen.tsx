import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QURAN_EDITIONS } from '../constants/defaults';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { fetchSurahList, type SurahListItem } from '../services/quranApi';
import { startNewKhatm } from '../services/readingProgress';
import { AppText, Button, IconBadge, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Quran'>;

export function QuranScreen({ navigation }: Props) {
  const { settings, quranProgress, refreshReadingProgress } = useApp();
  const { colors, radius, space, type } = useTheme();
  const { t } = useTranslation();
  const [surahs, setSurahs] = useState<SurahListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const edition = settings.quranEditionId;
  const editionMeta = QURAN_EDITIONS.find((e) => e.id === edition);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    fetchSurahList(editionMeta?.language ?? 'en')
      .then((list) => {
        setSurahs(list);
        if (list.length === 0) setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [editionMeta?.language]);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter((s) => String(s.number) === q || s.englishName.toLowerCase().includes(q) || s.name.includes(q));
  }, [surahs, query]);

  const lastRead = quranProgress.lastRead;
  const completed = useMemo(() => new Set(quranProgress.completedSurahs ?? []), [quranProgress.completedSurahs]);
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
            <AppText variant="caption" tone="brand" style={{ fontWeight: '600' }}>
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
          <AppText variant="callout" tone="brand" style={{ fontWeight: '600' }}>
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

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: space[3],
          marginBottom: space[2],
        }}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('quran.search')}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          style={[type.body, { flex: 1, color: colors.text, paddingVertical: space[3], marginLeft: space[2] }]}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={t('quran.clearSearch')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <AppText variant="caption" tone="muted">
        {t('quran.edition')}: {editionMeta?.name ?? edition}
      </AppText>
    </View>
  );

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
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: space[3],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: space[3],
            }}
          >
            <AppText variant="callout" color={colors.onPrimarySoft} style={{ fontWeight: '700' }}>
              {item.number}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
              <AppText variant="bodyStrong">{item.englishName}</AppText>
              {completed.has(item.number) && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
            </View>
            <AppText variant="caption" tone="secondary">
              {item.numberOfAyahs} {t('quran.ayahs')}
            </AppText>
          </View>
          <AppText variant="heading" tone="brand" style={{ fontWeight: '400' }}>
            {item.name}
          </AppText>
        </Pressable>
      )}
    />
  );
}
