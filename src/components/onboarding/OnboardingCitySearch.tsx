import React from 'react';
import { Pressable, View } from 'react-native';
import { searchCities, type City } from '../../data/cities';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { AppLanguage } from '../../types';
import { AppText, Button, TextField } from '../../ui';

interface Props {
  appLanguage: AppLanguage;
  /** Kept by the screen, so the list is still open when the user comes back to this step */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onPick: (city: City) => Promise<void>;
}

/** No GPS or no permission: pick the city from a list that works offline */
export function OnboardingCitySearch({ appLanguage, open, onOpenChange, query, onQueryChange, onPick }: Props) {
  const { colors, space } = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <Button label={t('city.choose')} icon="list" variant="ghost" onPress={() => onOpenChange(!open)} style={{ marginTop: space[3] }} />
      {open && (
        <View style={{ marginTop: space[2] }}>
          <TextField
            label={t('city.search')}
            value={query}
            onChangeText={onQueryChange}
            placeholder={t('city.searchPlaceholder')}
            autoCorrect={false}
            maxLength={40}
          />
          {searchCities(query).slice(0, 8).map((c) => (
            <Pressable
              key={c.id}
              onPress={async () => {
                await onPick(c);
                onOpenChange(false);
                onQueryChange('');
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({
                minHeight: 48,
                justifyContent: 'center',
                paddingHorizontal: space[3],
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
              })}
            >
              <AppText variant="body">{appLanguage === 'tr' ? c.tr : c.en}</AppText>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}
