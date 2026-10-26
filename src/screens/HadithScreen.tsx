import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { HADITH_COLLECTIONS } from '../constants/defaults';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { addHadithBookmark, updateHadithLastRead } from '../services/readingProgress';
import { AppText, Chip, IconBadge, Screen, Surface } from '../ui';

const SAMPLE_HADITH: Record<string, { text: string; narrator: string }[]> = {
  bukhari: [
    { text: 'Actions are judged by intentions, and every person will get what they intended.', narrator: 'Umar ibn al-Khattab' },
    { text: 'The believer is not one who eats his fill while his neighbor goes hungry.', narrator: 'Ibn Abbas' },
  ],
  muslim: [
    { text: 'None of you truly believes until he loves for his brother what he loves for himself.', narrator: 'Anas ibn Malik' },
  ],
  abudawud: [
    { text: 'The best of you are those who learn the Quran and teach it.', narrator: 'Uthman ibn Affan' },
  ],
  tirmidhi: [
    { text: 'Whoever does not show mercy to people, Allah will not show mercy to him.', narrator: 'Abdullah ibn Amr' },
  ],
  nahj: [
    { text: 'People are asleep; when they die, they awaken.', narrator: 'Ali ibn Abi Talib' },
  ],
};

export function HadithScreen() {
  const { settings, hadithProgress, refreshReadingProgress } = useApp();
  const { colors, space } = useTheme();
  const { t } = useTranslation();
  const collections = HADITH_COLLECTIONS.filter(
    (c) => settings.sectPreference === 'neutral' || !c.sect || c.sect === settings.sectPreference
  );
  const lastRead = hadithProgress.lastRead;
  const [selected, setSelected] = useState(
    lastRead && collections.some((c) => c.id === lastRead.collectionId) ? lastRead.collectionId : collections[0]?.id ?? 'bukhari'
  );
  const hadiths = SAMPLE_HADITH[selected] ?? [];
  const collectionName = collections.find((c) => c.id === selected)?.name ?? selected;
  const memberId = settings.activeFamilyMemberId;

  const bookmarked = useMemo(
    () => new Set(hadithProgress.bookmarks.filter((b) => b.collectionId === selected).map((b) => b.itemIndex)),
    [hadithProgress.bookmarks, selected]
  );

  // Progress is recorded only when the reader actually opens or bookmarks a hadith
  const markRead = async (index: number) => {
    await updateHadithLastRead(memberId, selected, collectionName, index);
    await refreshReadingProgress();
  };

  const bookmark = async (index: number, text: string) => {
    await addHadithBookmark(memberId, selected, collectionName, index, text.slice(0, 40));
    await refreshReadingProgress();
  };

  return (
    <Screen>
      {lastRead && lastRead.collectionId !== selected && (
        <Surface
          variant="soft"
          onPress={() => setSelected(lastRead.collectionId)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[4] }}
        >
          <IconBadge name="bookmark" />
          <View style={{ flex: 1 }}>
            <AppText variant="caption" tone="brand" style={{ fontWeight: '600' }}>
              {t('reading.continueHadith')}
            </AppText>
            <AppText variant="bodyStrong">{lastRead.collectionName}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.onPrimarySoft} />
        </Surface>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space[4], marginBottom: space[4] }}
        contentContainerStyle={{ paddingHorizontal: space[4], gap: space[2] }}
      >
        {collections.map((c) => (
          <Chip key={c.id} label={c.name} selected={selected === c.id} onPress={() => setSelected(c.id)} />
        ))}
      </ScrollView>

      <Surface variant="muted" padding={space[3]} style={{ flexDirection: 'row', gap: space[2], marginBottom: space[4] }}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
        <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
          {t('hadith.offlineNote')}
        </AppText>
      </Surface>

      {hadiths.map((h, i) => {
        const marked = bookmarked.has(i);
        const isLast = lastRead?.collectionId === selected && lastRead.itemIndex === i;
        return (
          <Surface key={i} onPress={() => markRead(i)} style={{ marginBottom: space[3], borderColor: isLast ? colors.primary : colors.border }}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.accent} />
            <AppText variant="body" style={{ fontSize: 17, lineHeight: 27, marginTop: space[2] }}>
              {h.text}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[3] }}>
              <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                {h.narrator} · {collectionName}
              </AppText>
              <Pressable
                onPress={() => bookmark(i, h.text)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('reading.bookmark')}
                accessibilityState={{ selected: marked }}
              >
                <Ionicons name={marked ? 'bookmark' : 'bookmark-outline'} size={20} color={colors.primary} />
              </Pressable>
            </View>
          </Surface>
        );
      })}
    </Screen>
  );
}
