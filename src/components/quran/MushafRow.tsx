import React, { memo } from 'react';
import type { TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { ReaderAyah } from '../../services/quranApi';
import { AppText } from '../../ui';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);

interface Props {
  ayahs: ReaderAyah[];
  /** The ayah being recited when it is in this block, otherwise null */
  playing: number | null;
  arabicStyle: TextStyle;
}

/** A block of ayahs as continuous text with ayah-end marks, for the mushaf view. */
export const MushafRow = memo(function MushafRow({ ayahs, playing, arabicStyle }: Props) {
  const { colors, space } = useTheme();
  return (
    <AppText style={[arabicStyle, { textAlign: 'justify', paddingVertical: space[2] }]}>
      {ayahs.map((a) => (
        <AppText key={a.numberInSurah} style={arabicStyle} color={playing === a.numberInSurah ? colors.primaryText : undefined}>
          {a.arabic}{' '}
          <AppText style={[arabicStyle, { color: colors.accentText }]}>﴿{toArabicDigits(a.numberInSurah)}﴾ </AppText>
        </AppText>
      ))}
    </AppText>
  );
});
