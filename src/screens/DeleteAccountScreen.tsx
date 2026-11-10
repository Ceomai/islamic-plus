import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useAuthErrorMessage } from '../hooks/useAuthErrorMessage';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppText } from '../ui';

export function DeleteAccountScreen() {
  const { deleteAccount, session, backend } = useAuth();
  const { colors, radius, space, type, component } = useTheme();
  const { t } = useTranslation();
  const errorMessage = useAuthErrorMessage();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      // On success the auth context drops the session and the sign-in screen replaces this one
      const result = await deleteAccount(password);
      if (!result.ok) setError(errorMessage(result.error ?? 'unknown'));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    if (!password) {
      setError(errorMessage('empty_password'));
      return;
    }
    Alert.alert(t('account.confirmTitle'), t('account.confirmBody'), [
      { text: t('account.cancel'), style: 'cancel' },
      { text: t('account.deleteForever'), style: 'destructive', onPress: () => void runDelete() },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: space[5], paddingBottom: space[10] }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.iconRow, { marginBottom: space[2] }]}>
        <Ionicons name="warning" size={40} color={colors.error} />
      </View>
      <AppText variant="title" align="center" style={{ marginBottom: space[2] }}>
        {t('account.deleteTitle')}
      </AppText>
      <AppText variant="callout" tone="secondary">
        {t('account.signedInAs', { name: session?.pseudonym ?? '—' })}
      </AppText>

      <Card>
        <AppText variant="bodyStrong" style={{ marginBottom: space[2] }}>
          {t('account.whatIsDeleted')}
        </AppText>
        <AppText variant="callout" tone="secondary">
          {backend === 'supabase' ? t('account.deletedCloud') : t('account.deletedLocal')}
        </AppText>
        <AppText variant="callout" tone="danger" style={{ marginTop: space[2] }}>
          {t('account.irreversible')}
        </AppText>
      </Card>

      <AppText variant="calloutStrong" style={{ marginTop: space[4], marginBottom: space[2] }}>
        {t('account.passwordPrompt')}
      </AppText>
      <TextInput
        style={[
          type.body,
          {
            borderWidth: component.textField.borderWidth,
            borderRadius: radius.md,
            padding: space[3],
            marginBottom: space[2],
            minHeight: component.textField.minHeight,
            borderColor: colors.inputBorder,
            color: colors.text,
            backgroundColor: colors.surface,
          },
        ]}
        placeholder={t('auth.password')}
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      {error ? (
        <AppText variant="callout" tone="danger" align="center" style={{ marginBottom: space[3] }}>
          {error}
        </AppText>
      ) : null}

      <Pressable
        style={[
          styles.deleteBtn,
          { backgroundColor: colors.error, borderRadius: radius.md, padding: space[4], marginTop: space[2], opacity: loading ? 0.7 : 1 },
        ]}
        onPress={confirmDelete}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.onError} />
        ) : (
          <AppText variant="bodyStrong" color={colors.onError}>
            {t('account.deleteForever')}
          </AppText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  iconRow: { alignItems: 'center' },
  deleteBtn: { alignItems: 'center', minHeight: 52, justifyContent: 'center' },
});
