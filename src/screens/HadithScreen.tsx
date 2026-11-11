import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { HadithSectionContent } from '../components/HadithSectionContent';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { HADITH_LIBRARY, hadithCollectionName, hadithSectionName, sectionOfHadith } from '../services/hadithApi';
import { AppText, Chip, IconBadge, Screen, SearchField, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Hadith'>;

const fold = (s: string) => s.toLocaleLowerCase('tr').replace(/ı/g, 'i');

export function HadithScreen({ navigation }: Props) {
  const { settings, hadithProgress } = useApp();
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const lastRead = hadithProgress.lastRead;

  const [collectionId, setCollectionId] = useState(
    lastRead && HADITH_LIBRARY.some((c) => c.id === lastRead.collectionId) ? lastRead.collectionId : HADITH_LIBRARY[0].id
  );
  const collection = HADITH_LIBRARY.find((c) => c.id === collectionId) ?? HADITH_LIBRARY[0];
  const [query, setQuery] = useState('');
  // Single-chapter collections (the forty-hadith books) open straight into their text
  const singleSection = collection.sections.length === 1 ? collection.sections[0] : null;

  const sections = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return collection.sections;
    // Both the Turkish and the original English title are searchable
    return collection.sections.filter((s) => fold(`${s.n} ${s.name} ${hadithSectionName(s, lang)}`).includes(q) || String(s.first) === q);
  }, [collection, query, lang]);

  const chooseCollection = (id: string) => {
    setCollectionId(id);
    setQuery('');
  };

  // A chapter is its own stack screen, so the system back gesture / button returns to this list
  const openChapter = (collectionKey: string, sectionN: number) =>
    navigation.navigate('HadithSection', { collectionId: collectionKey, sectionN });

  const resume = () => {
    if (!lastRead) return;
    const c = HADITH_LIBRARY.find((x) => x.id === lastRead.collectionId);
    if (!c) return;
    setCollectionId(c.id);
    if (c.sections.length === 1) return;
    const s = sectionOfHadith(c, lastRead.itemIndex);
    if (s) openChapter(c.id, s.n);
  };

  // Hidden while the last-read single-chapter collection is already open below
  const showResume = !!lastRead && !(singleSection && lastRead.collectionId === collection.id);

  const header = (
    <>
      {settings.sectPreference === 'shia' && (
        <Surface variant="muted" padding={space[3]} style={{ flexDirection: 'row', gap: space[2], marginBottom: space[3] }}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
            {t('hadith.shiaNote')}
          </AppText>
        </Surface>
      )}

      {showResume && lastRead && (
        <Surface variant="soft" onPress={resume} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[4] }}>
          <IconBadge name="bookmark" />
          <View style={{ flex: 1 }}>
            <AppText variant="captionStrong" tone="onPrimarySoft">
              {t('reading.continueHadith')}
            </AppText>
            <AppText variant="bodyStrong">
              {lastRead.collectionName} · {lastRead.itemIndex}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.onPrimarySoft} />
        </Surface>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space[4], marginBottom: space[3] }}
        contentContainerStyle={{ paddingHorizontal: space[4], gap: space[2] }}
      >
        {HADITH_LIBRARY.map((c) => (
          <Chip key={c.id} label={hadithCollectionName(c, lang)} selected={collection.id === c.id} onPress={() => chooseCollection(c.id)} />
        ))}
      </ScrollView>
    </>
  );

  if (singleSection) {
    return (
      <Screen>
        {header}
        <HadithSectionContent key={collection.id} collection={collection} section={singleSection} />
      </Screen>
    );
  }

  // ─── Chapter list ───
  return (
    <Screen>
      {header}
      <AppText variant="caption" tone="secondary" style={{ marginBottom: space[2] }}>
        {t('hadith.collectionInfo', { n: collection.total.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'), s: String(collection.sections.length) })}
        {lang === 'tr' && !collection.tr ? ` · ${t('hadith.englishOnly')}` : ''}
      </AppText>
      <SearchField value={query} onChangeText={setQuery} placeholder={t('hadith.searchChapters')} style={{ marginBottom: space[3] }} />
      <Surface padding={0} style={{ paddingHorizontal: space[4] }}>
        {sections.map((s, i) => (
          <Pressable
            key={s.n}
            onPress={() => openChapter(collection.id, s.n)}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[3],
              paddingVertical: space[3],
              borderBottomWidth: i < sections.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <AppText variant="caption" tone="muted" style={{ minWidth: space[8] }}>
              {s.n}
            </AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="body">{hadithSectionName(s, lang)}</AppText>
              <AppText variant="caption" tone="muted">
                {t('hadith.range', { a: String(s.first), b: String(s.last) })}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </Surface>
      <AppText variant="caption" tone="muted" style={{ marginTop: space[3] }}>
        {t('hadith.source')}
      </AppText>
    </Screen>
  );
}
