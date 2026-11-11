import type { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { AIChatMessage, AssistantTarget } from '../../types';
import { AppText, Chip, Enter } from '../../ui';

/** Corner on the speaker's side, pointing at them */
const TAIL_RADIUS = 4;

/**
 * Replies mark headings as **bold**; they used to show with the asterisks. Bold parts become bold
 * text and stray `code` backticks are dropped.
 */
function renderInline(text: string): React.ReactNode[] {
  return text
    .replace(/`/g, '')
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <AppText key={i} variant="bodyStrong">
          {part.slice(2, -2)}
        </AppText>
      ) : (
        part
      )
    );
}

interface Props {
  message: AIChatMessage;
  /** New messages fade up; those already there when the screen opened appear in place */
  animate: boolean;
  onOpen: (target: AssistantTarget) => void;
}

/** One chat message with the reply's action buttons. */
export const ChatBubble = memo(function ChatBubble({ message: m, animate, onOpen }: Props) {
  const { colors, radius, space, layout, motion } = useTheme();
  const mine = m.role === 'user';
  // Arabic replies read right to left
  const rtl = !mine && /[؀-ۿ]/.test(m.content.slice(0, 40));
  return (
    <Enter
      animate={animate}
      duration={motion.duration.fast}
      offsetY={motion.enterOffset.bubble}
      style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%' }}
    >
      <View
        style={{
          maxWidth: layout.bubbleMaxWidth,
          backgroundColor: mine ? colors.primary : colors.surface,
          borderColor: colors.border,
          borderWidth: mine ? 0 : 1,
          borderRadius: radius.lg,
          borderBottomRightRadius: mine ? TAIL_RADIUS : radius.lg,
          borderBottomLeftRadius: mine ? radius.lg : TAIL_RADIUS,
          paddingHorizontal: space[4],
          paddingVertical: space[3],
        }}
      >
        <AppText variant="body" color={mine ? colors.onPrimary : colors.text} style={rtl ? { writingDirection: 'rtl', textAlign: 'right' } : undefined}>
          {mine ? m.content : renderInline(m.content)}
        </AppText>
      </View>
      {m.actions?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] }}>
          {m.actions.map((a, i) => (
            <Chip
              key={`${a.target.screen}-${i}`}
              label={a.label}
              icon={(a.icon as keyof typeof Ionicons.glyphMap | undefined) ?? 'arrow-forward'}
              // Highlighted as the suggested next step; not a selected state
              emphasis={i === 0}
              onPress={() => onOpen(a.target)}
            />
          ))}
        </View>
      ) : null}
    </Enter>
  );
});
