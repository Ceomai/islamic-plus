import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { CITIES, searchCities, type City } from '../data/cities';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppText, TextField } from '../ui';

interface Props {
  onSelect: (city: City) => void;
  /** Id of the city currently in use, marked with a check */
  selectedId?: string;
  /** Rendered above the search field inside the scrolling list */
  header?: React.ReactElement;
}

/** Searchable list of Türkiye's 81 provinces and cities abroad; works without GPS or internet. */
export function CityPicker({ onSelect, selectedId, header }: Props) {
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const [query, setQuery] = useState('');
  const results = useMemo(() => (query.trim() ? searchCities(query) : CITIES), [query]);
  const name = (c: City) => (lang === 'tr' ? c.tr : c.en);

  return (
    <FlatList
      data={results}
      keyExtractor={(c) => c.id}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={20}
      contentContainerStyle={{ padding: space[4], paddingBottom: space[8] }}
      ListHeaderComponent={
        <View>
          {header}
          <TextField
            label={t('city.search')}
            value={query}
            onChangeText={setQuery}
            placeholder={t('city.searchPlaceholder')}
            autoCorrect={false}
            maxLength={40}
          />
        </View>
      }
      ListEmptyComponent={
        <AppText tone="secondary" align="center" style={{ marginTop: space[4] }}>
          {t('city.noResults')}
        </AppText>
      }
      renderItem={({ item, index }) => {
        const prev = results[index - 1];
        const showGroup = index === 0 || (prev && (prev.country === 'TR') !== (item.country === 'TR'));
        return (
          <View>
            {showGroup && (
              <AppText variant="overline" tone="muted" style={{ marginTop: space[3], marginBottom: space[1] }}>
                {item.country === 'TR' ? t('city.turkey') : t('city.abroad')}
              </AppText>
            )}
            <Pressable
              onPress={() => onSelect(item)}
              accessibilityRole="button"
              accessibilityLabel={name(item)}
              accessibilityState={{ selected: item.id === selectedId }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: 48,
                paddingHorizontal: space[3],
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
              })}
            >
              <AppText variant="body" style={{ flex: 1 }}>
                {name(item)}
              </AppText>
              {item.id === selectedId && <Ionicons name="checkmark" size={20} color={colors.primaryText} />}
            </Pressable>
          </View>
        );
      }}
    />
  );
}
