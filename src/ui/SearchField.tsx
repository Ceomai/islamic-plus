import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, TextInput, View, type ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Spoken name of the field; defaults to the placeholder */
  accessibilityLabel?: string;
  returnKeyType?: 'search' | 'done';
  style?: ViewStyle;
}

/** Search box with a magnifier and a clear button (Quran, duas, education). */
export function SearchField({ value, onChangeText, placeholder, accessibilityLabel, returnKeyType, style }: Props) {
  const { colors, radius, space, type, layout } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: layout.minTouch,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingLeft: space[3],
        },
        style,
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        returnKeyType={returnKeyType}
        accessibilityRole="search"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={[type.body, { flex: 1, color: colors.text, paddingVertical: space[3], marginLeft: space[2] }]}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={t('quran.clearSearch')}
          style={{ minWidth: layout.minTouch, minHeight: layout.minTouch, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : (
        <View style={{ width: space[3] }} />
      )}
    </View>
  );
}
