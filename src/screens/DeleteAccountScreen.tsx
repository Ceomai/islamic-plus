import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useAuthErrorMessage } from '../hooks/useAuthErrorMessage';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

export function DeleteAccountScreen() {
  const { deleteAccount, session, backend } = useAuth();
  const { colors } = useTheme();
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
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.iconRow}>
        <Ionicons name="warning" size={40} color={colors.error} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{t('account.deleteTitle')}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {t('account.signedInAs', { name: session?.pseudonym ?? '—' })}
      </Text>

      <Card>
        <Text style={[styles.listTitle, { color: colors.text }]}>{t('account.whatIsDeleted')}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {backend === 'supabase' ? t('account.deletedCloud') : t('account.deletedLocal')}
        </Text>
        <Text style={[styles.body, { color: colors.error, marginTop: 8 }]}>{t('account.irreversible')}</Text>
      </Card>

      <Text style={[styles.label, { color: colors.text }]}>{t('account.passwordPrompt')}</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        placeholder={t('auth.password')}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <Pressable
        style={[styles.deleteBtn, { backgroundColor: colors.error, opacity: loading ? 0.7 : 1 }]}
        onPress={confirmDelete}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteText}>{t('account.deleteForever')}</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  iconRow: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 20 },
  listTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8, fontSize: 16 },
  error: { marginBottom: 12, textAlign: 'center', lineHeight: 20 },
  deleteBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, minHeight: 52, justifyContent: 'center' },
  deleteText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
