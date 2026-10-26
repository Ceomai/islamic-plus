import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Share, Switch, TextInput, View } from 'react-native';
import { getSupabase } from '../config/supabase';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { appVersion, formatErrorReport, getErrorLog, platformLabel } from '../services/errorLog';
import { AppText, Button, Chip, Screen, Surface } from '../ui';

type Category = 'bug' | 'idea' | 'content' | 'other';
const CATEGORIES: Category[] = ['bug', 'idea', 'content', 'other'];

/** Tester feedback, stored in the write-only app_feedback table (migration 008). */
export function FeedbackScreen() {
  const { colors, radius, space, type } = useTheme();
  const { t, lang } = useTranslation();
  const [category, setCategory] = useState<Category>('bug');
  const [message, setMessage] = useState('');
  const [attachErrors, setAttachErrors] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  useEffect(() => {
    void getErrorLog().then((log) => {
      setErrorCount(log.length);
      setAttachErrors(log.length > 0);
    });
  }, []);

  const valid = message.trim().length >= 3;

  const send = async () => {
    if (!valid) return;
    setStatus('sending');
    const errorReport = attachErrors ? await formatErrorReport() : null;
    const supabase = getSupabase();
    const { error } = supabase
      ? await supabase.from('app_feedback').insert({
          category,
          message: message.trim().slice(0, 4000),
          app_version: appVersion(),
          platform: platformLabel(),
          language: lang,
          error_report: errorReport?.slice(0, 20000) ?? null,
        })
      : { error: new Error('not configured') };
    setStatus(error ? 'failed' : 'sent');
    if (!error) setMessage('');
  };

  // Fallback when the server can't be reached: hand the text to any messaging app
  const shareInstead = async () => {
    const report = attachErrors ? `\n\n${await formatErrorReport()}` : '';
    await Share.share({ message: `[Islamic+ ${t(`feedback.cat.${category}`)}] ${message.trim()}${report}` });
  };

  if (status === 'sent') {
    return (
      <Screen>
        <Surface variant="soft" style={{ alignItems: 'center', gap: space[3], marginTop: space[6] }}>
          <Ionicons name="checkmark-circle" size={40} color={colors.onPrimarySoft} />
          <AppText variant="heading" color={colors.onPrimarySoft} align="center">
            {t('feedback.thanks')}
          </AppText>
          <AppText variant="callout" color={colors.onPrimarySoft} align="center">
            {t('feedback.thanksBody')}
          </AppText>
          <Button label={t('feedback.another')} variant="secondary" onPress={() => setStatus('idle')} />
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="callout" tone="secondary">
        {t('feedback.intro')}
      </AppText>

      <AppText variant="overline" tone="muted" style={{ marginTop: space[5], marginBottom: space[2] }}>
        {t('feedback.category')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={t(`feedback.cat.${c}`)} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder={t(`feedback.placeholder.${category}`)}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={4000}
        textAlignVertical="top"
        style={[
          type.body,
          {
            minHeight: 160,
            marginTop: space[4],
            padding: space[3],
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
          },
        ]}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[4] }}>
        <View style={{ flex: 1 }}>
          <AppText variant="callout">{t('feedback.attach')}</AppText>
          <AppText variant="caption" tone="muted">
            {t('feedback.attachHint', { n: String(errorCount) })}
          </AppText>
        </View>
        <Switch value={attachErrors} onValueChange={setAttachErrors} trackColor={{ true: colors.primary, false: colors.borderStrong }} />
      </View>

      <Button
        label={t('feedback.send')}
        icon="send"
        onPress={send}
        disabled={!valid}
        loading={status === 'sending'}
        style={{ marginTop: space[5] }}
      />
      {status === 'failed' && (
        <Surface variant="muted" style={{ marginTop: space[4], gap: space[3] }}>
          <AppText variant="callout" tone="secondary">
            {t('feedback.failed')}
          </AppText>
          <Button label={t('feedback.shareInstead')} icon="share-outline" variant="secondary" onPress={shareInstead} />
        </Surface>
      )}
      <AppText variant="caption" tone="muted" style={{ marginTop: space[4] }}>
        {t('feedback.privacy')}
      </AppText>
    </Screen>
  );
}
