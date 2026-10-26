import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { getEducationTopics } from '../data/education';
import { useApp } from '../context/AppContext';
import { markEducationTopicRead } from '../services/educationProgress';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EducationDetail'>;

export function EducationDetailScreen({ route }: Props) {
  const { settings } = useApp();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const topic = getEducationTopics(settings.appLanguage).find((x) => x.id === route.params.topicId);

  useEffect(() => {
    if (topic) void markEducationTopicRead(topic.id);
  }, [topic?.id]);

  if (!topic) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{t('education.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{topic.title}</Text>
      <Text style={[styles.summary, { color: colors.textSecondary }]}>{topic.summary}</Text>
      <Text style={[styles.section, { color: colors.text }]}>{t('education.perspectivesTitle')}</Text>
      {topic.perspectives.map((p, i) => (
        <Card key={i}>
          <Text style={[styles.sect, { color: colors.primary }]}>{p.sect}</Text>
          <Text style={[styles.approach, { color: colors.text }]}>{p.approach}</Text>
        </Card>
      ))}
      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>{t('education.disclaimer')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700' },
  summary: { marginTop: 12, lineHeight: 24, fontSize: 16 },
  section: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  sect: { fontWeight: '600', marginBottom: 8 },
  approach: { lineHeight: 24 },
  disclaimer: { marginTop: 24, fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
});
