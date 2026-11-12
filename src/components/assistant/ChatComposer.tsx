import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { IconButton } from '../../ui';

const MAX_LENGTH = 500;
const MAX_INPUT_HEIGHT = 120;

interface Props {
  busy: boolean;
  /** Returns false when the question was not taken (empty, or another one is on its way) */
  onSend: (text: string) => boolean;
  onClear: () => void;
}

/** Message field with clear and send buttons. Owns the typed text, so typing re-renders only this bar. */
export function ChatComposer({ busy, onSend, onClear }: Props) {
  const { colors, radius, space, type, layout } = useTheme();
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const canSend = input.trim().length > 0 && !busy;
  const submit = () => {
    if (onSend(input)) setInput('');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: space[2],
        padding: space[3],
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <IconButton name="trash-outline" size={20} color={colors.textMuted} onPress={onClear} accessibilityLabel={t('ai.clear')} />
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder={t('ai.placeholder')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={t('ai.inputLabel')}
        multiline
        maxLength={MAX_LENGTH}
        blurOnSubmit
        onSubmitEditing={submit}
        returnKeyType="send"
        style={[
          type.body,
          {
            flex: 1,
            maxHeight: MAX_INPUT_HEIGHT,
            color: colors.text,
            backgroundColor: colors.background,
            borderRadius: radius.md,
            paddingHorizontal: space[3],
            paddingVertical: space[2],
          },
        ]}
      />
      <Pressable
        onPress={submit}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel={t('ai.send')}
        accessibilityState={{ disabled: !canSend }}
        style={({ pressed }) => ({
          width: layout.minTouch,
          height: layout.minTouch,
          borderRadius: layout.minTouch / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
          opacity: canSend ? 1 : 0.5,
        })}
      >
        <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}
