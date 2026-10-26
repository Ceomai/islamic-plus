import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { HADITH_COLLECTIONS } from '../constants/defaults';
import { Card } from '../components/Card';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { addHadithBookmark, updateHadithLastRead } from '../services/readingProgress';

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
  const { colors } = useTheme();
  const { t } = useTranslation();
  const filtered = HADITH_COLLECTIONS.filter(
    (c) => settings.sectPreference === 'neutral' || !c.sect || c.sect === settings.sectPreference
  );
  const [selected, setSelected] = useState(filtered[0]?.id ?? 'bukhari');
  const hadiths = SAMPLE_HADITH[selected] ?? [];
  const collectionName = filtered.find((c) => c.id === selected)?.name ?? selected;

  useEffect(() => {
    void updateHadithLastRead(settings.activeFamilyMemberId, selected, collectionName, 0).then(() =>
      refreshReadingProgress()
    );
  }, [selected]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {hadithProgress.lastRead && (
        <Pressable
          style={[styles.resume, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}
          onPress={() => setSelected(hadithProgress.lastRead!.collectionId)}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('reading.continueHadith')}</Text>
          <Text style={{ color: colors.textSecondary }}>{hadithProgress.lastRead.collectionName}</Text>
        </Pressable>
      )}
      <FlatList
        horizontal
        data={filtered}
        keyExtractor={(i) => i.id}
        style={styles.tabs}
        renderItem={({ item }) => (
          <Text
            onPress={() => setSelected(item.id)}
            style={[
              styles.tab,
              {
                backgroundColor: selected === item.id ? colors.primary : colors.surface,
                color: selected === item.id ? '#fff' : colors.text,
              },
            ]}
          >
            {item.name}
          </Text>
        )}
      />
      <Text style={[styles.note, { color: colors.textSecondary }]}>{t('hadith.offlineNote')}</Text>
      {hadiths.map((h, i) => (
        <Card key={i}>
          <Pressable
            onPress={async () => {
              await updateHadithLastRead(settings.activeFamilyMemberId, selected, collectionName, i);
              await refreshReadingProgress();
            }}
          >
            <Text style={[styles.text, { color: colors.text }]}>{h.text}</Text>
            <Text style={[styles.narrator, { color: colors.textSecondary }]}>— {h.narrator}</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              await addHadithBookmark(settings.activeFamilyMemberId, selected, collectionName, i, h.text.slice(0, 40));
              await refreshReadingProgress();
            }}
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: colors.primary }}>{t('reading.bookmark')}</Text>
          </Pressable>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  resume: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  tabs: { maxHeight: 44, marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, overflow: 'hidden' },
  note: { fontSize: 12, marginBottom: 12 },
  text: { fontSize: 16, lineHeight: 26, fontStyle: 'italic' },
  narrator: { marginTop: 12, fontSize: 14 },
});
