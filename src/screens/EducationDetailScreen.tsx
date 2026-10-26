import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { findLearnTopic, type LearnTopic } from '../data/learn';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { RootStackParamList } from '../navigation/types';
import { markEducationTopicRead } from '../services/educationProgress';
import { AppText, Screen, Surface } from '../ui';

/** Sections of a topic: optional heading, paragraph and bullet list. Shared with the inline list view. */
export function LearnTopicBody({ topic }: { topic: LearnTopic }) {
  const { colors, space } = useTheme();
  const { lang } = useTranslation();
  return (
    <View style={{ gap: space[3] }}>
      <AppText variant="callout" tone="secondary">
        {topic.summary[lang]}
      </AppText>
      {topic.sections.map((s, i) => (
        <View key={i}>
          {s.heading ? (
            <AppText variant="overline" tone="brand" style={{ marginBottom: space[1] }}>
              {s.heading[lang]}
            </AppText>
          ) : null}
          {s.text ? <AppText variant="body">{s.text[lang]}</AppText> : null}
          {s.bullets?.[lang].map((b, j) => (
            <View key={j} style={{ flexDirection: 'row', gap: space[2], marginTop: j === 0 && s.text ? space[2] : space[1] }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 9 }} />
              <AppText variant="body" style={{ flex: 1 }}>
                {b}
              </AppText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, 'EducationDetail'>;

export function EducationDetailScreen({ route }: Props) {
  const { colors, space } = useTheme();
  const { t, lang } = useTranslation();
  const entry = findLearnTopic(route.params.topicId);

  useEffect(() => {
    if (entry) void markEducationTopicRead(entry.topic.id);
  }, [entry?.topic.id]);

  if (!entry) {
    return (
      <Screen>
        <AppText tone="secondary" align="center">
          {t('education.notFound')}
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="overline" tone="muted">
        {entry.category.title[lang]} · {entry.subcategory.title[lang]}
      </AppText>
      <AppText variant="title" style={{ marginTop: space[1], marginBottom: space[3] }}>
        {entry.topic.title[lang]}
      </AppText>
      <LearnTopicBody topic={entry.topic} />

      <Surface variant="muted" padding={space[3]} style={{ flexDirection: 'row', gap: space[2], marginTop: space[5] }}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
        <View style={{ flex: 1 }}>
          <AppText variant="caption" tone="secondary">
            {t('education.disclaimer')}
          </AppText>
        </View>
      </Surface>
    </Screen>
  );
}
