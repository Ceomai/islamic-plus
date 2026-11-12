import React, { memo } from 'react';
import { View, type TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { ReaderAyah } from '../../services/quranApi';
import { AppText, IconButton } from '../../ui';

/** Width and height of the ayah number badge */
const BADGE_MIN_WIDTH = 32;
const BADGE_HEIGHT = 28;

interface Props {
  ayah: ReaderAyah;
  marked: boolean;
  isPlaying: boolean;
  arabicStyle: TextStyle;
  translationStyle: TextStyle;
  onTogglePlay: (numberInSurah: number) => void;
  onShare: (ayah: ReaderAyah) => void;
  onBookmark: (numberInSurah: number) => void;
}

/** One ayah in the reader: number, actions, Arabic, transliteration and translation. */
export const AyahRow = memo(function AyahRow({
  ayah: a,
  marked,
  isPlaying,
  arabicStyle,
  translationStyle,
  onTogglePlay,
  onShare,
  onBookmark,
}: Props) {
  const { colors, radius, space, motion } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={{
        paddingVertical: space[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: isPlaying ? colors.primarySoft : 'transparent',
        marginHorizontal: -space[4],
        paddingHorizontal: space[4],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space[1], gap: space[1] }}>
        <View
          style={{
            minWidth: BADGE_MIN_WIDTH,
            height: BADGE_HEIGHT,
            paddingHorizontal: space[2],
            borderRadius: radius.pill,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="captionStrong" tone="accent" numeric>
            {a.numberInSurah}
          </AppText>
        </View>
        <View style={{ flex: 1 }} />
        <IconButton
          name={isPlaying ? 'stop-circle' : 'play-circle-outline'}
          onPress={() => onTogglePlay(a.numberInSurah)}
          accessibilityLabel={`${isPlaying ? t('duas.stop') : t('duas.listen')} ${a.numberInSurah}`}
        />
        <IconButton
          name="share-outline"
          size={20}
          onPress={() => onShare(a)}
          accessibilityLabel={`${t('quran.share')} ${a.numberInSurah}`}
        />
        <IconButton
          name={marked ? 'bookmark' : 'bookmark-outline'}
          size={20}
          onPress={() => onBookmark(a.numberInSurah)}
          accessibilityLabel={`${marked ? t('reading.removeBookmark') : t('reading.bookmark')} ${a.numberInSurah}`}
          accessibilityState={{ selected: marked }}
          popWhen={marked}
          popFrom={motion.popFromSubtle}
        />
      </View>
      {a.arabic ? <AppText style={arabicStyle}>{a.arabic}</AppText> : null}
      {a.transliteration ? (
        <AppText tone="secondary" style={[translationStyle, { fontStyle: 'italic', marginTop: space[2] }]}>
          {a.transliteration}
        </AppText>
      ) : null}
      {a.translation ? <AppText style={[translationStyle, { marginTop: a.arabic ? space[2] : 0 }]}>{a.translation}</AppText> : null}
    </View>
  );
});
