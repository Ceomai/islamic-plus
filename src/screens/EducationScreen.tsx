import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LEARN_CATEGORIES, LEARN_ENTRIES, searchLearn, type LearnEntry } from '../data/learn';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { loadEducationProgress, markEducationTopicRead } from '../services/educationProgress';
import { AppText, Chip, Screen, Surface } from '../ui';
import { LearnTopicBody } from './EducationDetailScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Education'>;

export function EducationScreen({ navigation }: Props) {
  const { colors, radius, space, type } = useTheme();
  const { t, lang } = useTranslation();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [subId, setSubId] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Refresh read markers whenever the list comes back into view
  useEffect(() => {
    const load = () => loadEducationProgress().then((p) => setReadIds(new Set(p.map((e) => e.topicId))));
    void load();
    return navigation.addListener('focus', load);
  }, [navigation]);

  const category = LEARN_CATEGORIES.find((c) => c.id === categoryId);

  const results = useMemo(() => {
    const filtered = LEARN_ENTRIES.filter(
      (e) => (categoryId === 'all' || e.category.id === categoryId) && (subId === 'all' || e.subcategory.id === subId)
    );
    return searchLearn(filtered, query, lang);
  }, [categoryId, subId, query, lang]);

  // Group by category → subcategory, keeping result order inside each group
  const groups = useMemo(() => {
    const map = new Map<string, { entry: LearnEntry; items: LearnEntry[] }>();
    for (const e of results) {
      const key = `${e.category.id}/${e.subcategory.id}`;
      const g = map.get(key);
      if (g) g.items.push(e);
      else map.set(key, { entry: e, items: [e] });
    }
    return [...map.values()];
  }, [results]);

  const selectCategory = (id: string) => {
    setCategoryId(id);
    setSubId('all');
  };

  const toggle = (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next && !readIds.has(next)) {
      void markEducationTopicRead(next);
      setReadIds(new Set(readIds).add(next));
    }
  };

  const searching = query.trim().length > 0;
  const readCount = LEARN_ENTRIES.filter((e) => readIds.has(e.topic.id)).length;

  return (
    <Screen>
      <AppText variant="callout" tone="secondary" style={{ marginBottom: space[1] }}>
        {t('education.intro')}
      </AppText>
      <AppText variant="caption" tone="muted" style={{ marginBottom: space[3] }}>
        {t('education.progress', { read: String(readCount), total: String(LEARN_ENTRIES.length) })}
      </AppText>

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
          placeholder={t('education.searchPlaceholder')}
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

      <AppText variant="overline" tone="muted" style={{ marginTop: space[4], marginBottom: space[2] }}>
        {t('education.category')}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space[4] }}
        contentContainerStyle={{ paddingHorizontal: space[4], gap: space[2] }}
      >
        <Chip label={t('education.all')} selected={categoryId === 'all'} onPress={() => selectCategory('all')} />
        {LEARN_CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.title[lang]} icon={c.icon} selected={categoryId === c.id} onPress={() => selectCategory(c.id)} />
        ))}
      </ScrollView>

      {category && category.subcategories.length > 1 && (
        <>
          <AppText variant="overline" tone="muted" style={{ marginTop: space[3], marginBottom: space[2] }}>
            {t('education.subcategory')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            <Chip label={t('education.all')} selected={subId === 'all'} onPress={() => setSubId('all')} />
            {category.subcategories.map((s) => (
              <Chip key={s.id} label={s.title[lang]} selected={subId === s.id} onPress={() => setSubId(s.id)} />
            ))}
          </View>
        </>
      )}

      <AppText variant="caption" tone="secondary" style={{ marginTop: space[3], marginBottom: space[1] }}>
        {t(searching ? 'education.resultCount' : 'education.topicCount', { n: String(results.length) })}
      </AppText>

      {groups.length === 0 && (
        <Surface variant="muted" style={{ marginTop: space[3] }}>
          <AppText variant="callout" tone="secondary" align="center">
            {t('education.noResults')}
          </AppText>
        </Surface>
      )}

      {groups.map(({ entry, items }) => (
        <View key={`${entry.category.id}/${entry.subcategory.id}`} style={{ marginTop: space[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], marginBottom: space[2] }}>
            <Ionicons name={entry.category.icon} size={14} color={colors.textMuted} />
            <AppText variant="overline" tone="muted">
              {entry.category.title[lang]} · {entry.subcategory.title[lang]}
            </AppText>
          </View>
          {items.map(({ topic }) => {
            const open = openId === topic.id;
            const read = readIds.has(topic.id);
            return (
              <Surface key={topic.id} padding={0} style={{ marginBottom: space[2], overflow: 'hidden' }}>
                <Pressable
                  onPress={() => toggle(topic.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={topic.title[lang]}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: space[3],
                    padding: space[4],
                    backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
                  })}
                >
                  <Ionicons
                    name={read ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={read ? colors.primary : colors.textMuted}
                    style={{ marginTop: 1 }}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{topic.title[lang]}</AppText>
                    {!open && (
                      <AppText variant="caption" tone="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
                        {topic.summary[lang]}
                      </AppText>
                    )}
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </Pressable>
                {open && (
                  <View style={{ paddingHorizontal: space[4], paddingBottom: space[4] }}>
                    <LearnTopicBody topic={topic} />
                  </View>
                )}
              </Surface>
            );
          })}
        </View>
      ))}

      <AppText variant="caption" tone="muted" style={{ marginTop: space[4] }}>
        {t('education.disclaimer')}
      </AppText>
    </Screen>
  );
}
