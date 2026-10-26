import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DUA_CATEGORIES, DUA_PURPOSES, DUAS, getDuaCategoryIcon, searchDuas, type Dua, type DuaCategory } from '../data/duas';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { AppText, Chip, IconBadge, Surface } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Duas'>;

export function DuasScreen({ navigation }: Props) {
  const { colors, radius, space, type } = useTheme();
  const { t, lang } = useTranslation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DuaCategory | 'all'>('all');

  const categoryLabel = (c: DuaCategory) => t(`duas.cat.${c}`);

  const results = useMemo(() => {
    const base = query.trim() ? searchDuas(query, lang, categoryLabel) : DUAS;
    return category === 'all' ? base : base.filter((d) => d.category === category);
  }, [query, category, lang, t]);

  const searching = query.trim().length > 0;

  const header = (
    <View style={{ paddingBottom: space[2] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: space[3],
        }}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('duas.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
          style={[type.body, { flex: 1, color: colors.text, paddingVertical: space[3], marginLeft: space[2] }]}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={t('quran.clearSearch')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {!searching && (
        <>
          <AppText variant="overline" tone="muted" style={{ marginTop: space[4], marginBottom: space[2] }}>
            {t('duas.byPurpose')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {DUA_PURPOSES.map((p) => (
              <Chip key={p.query} label={p[lang]} icon={p.icon} onPress={() => setQuery(p.query)} />
            ))}
          </View>
        </>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space[4], marginTop: space[4] }}
        contentContainerStyle={{ paddingHorizontal: space[4], gap: space[2] }}
      >
        <Chip label={t('duas.all')} selected={category === 'all'} onPress={() => setCategory('all')} />
        {DUA_CATEGORIES.map((c) => (
          <Chip key={c.id} label={categoryLabel(c.id)} selected={category === c.id} onPress={() => setCategory(c.id)} />
        ))}
      </ScrollView>

      <AppText variant="caption" tone="secondary" style={{ marginTop: space[3] }}>
        {searching ? t('duas.resultCount', { n: String(results.length) }) : t('duas.totalCount', { n: String(results.length) })}
      </AppText>
    </View>
  );

  const renderItem = ({ item }: { item: Dua }) => (
    <Surface
      onPress={() => navigation.navigate('DuaDetail', { duaId: item.id })}
      accessibilityLabel={item.title[lang]}
      style={{ marginBottom: space[3] }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <IconBadge name={getDuaCategoryIcon(item.category)} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{item.title[lang]}</AppText>
          <AppText variant="caption" tone="secondary">
            {categoryLabel(item.category)}
            {item.repeat && item.repeat > 1 ? ` · ${item.repeat}×` : ''}
            {item.audioUrl ? ` · ${t('duas.hasAudio')}` : ''}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
      <AppText tone="brand" numberOfLines={1} style={{ fontSize: 20, lineHeight: 34, textAlign: 'right', marginTop: space[2] }}>
        {item.arabic}
      </AppText>
    </Surface>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: space[4], paddingBottom: space[8] }}
      data={results}
      keyExtractor={(d) => d.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <Surface variant="muted" style={{ alignItems: 'center', marginTop: space[4] }}>
          <AppText variant="body" tone="secondary" align="center">
            {t('duas.noResults')}
          </AppText>
        </Surface>
      }
    />
  );
}
