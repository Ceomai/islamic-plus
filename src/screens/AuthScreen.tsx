import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GradientHero } from '../components/GradientHero';
import { PasswordResetForm } from '../components/PasswordResetForm';
import { useAuth } from '../context/AuthContext';
import { useAuthErrorMessage } from '../hooks/useAuthErrorMessage';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

const INFO_ERRORS = new Set(['email_confirmation_sent']);

export function AuthScreen() {
  const { register, login, guest, backend } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errorMessage = useAuthErrorMessage();

  if (mode === 'reset') {
    return <PasswordResetForm initialEmail={email} onBack={() => setMode('login')} />;
  }

  const submit = async () => {
    setError(null); setErrorCode(null);
    setErrorCode(null);
    setLoading(true);
    try {
      const fn = mode === 'login' ? login : register;
      const result = await fn(email, password);
      if (!result.ok) {
        const code = result.error ?? 'unknown';
        setErrorCode(code);
        setError(errorMessage(code));
      }
    } finally {
      setLoading(false);
    }
  };

  const showAsInfo = Boolean(errorCode && INFO_ERRORS.has(errorCode));

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GradientHero>
          <Text style={styles.heroTitle}>{t('auth.welcome')}</Text>
          <Text style={styles.heroSub}>{t('auth.subtitle')}</Text>
          {backend === 'local' && (
            <Text style={styles.backendNote}>{t('auth.localBackend')}</Text>
          )}
          {backend === 'supabase' && (
            <Text style={styles.backendNoteOk}>{t('auth.cloudBackend')}</Text>
          )}
        </GradientHero>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => { setMode('login'); setError(null); setErrorCode(null); }}
            style={[styles.tab, mode === 'login' && { borderBottomColor: colors.primary }]}
          >
            <Text style={{ color: mode === 'login' ? colors.primary : colors.textSecondary, fontWeight: '700' }}>
              {t('auth.signIn')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setMode('register'); setError(null); setErrorCode(null); }}
            style={[styles.tab, mode === 'register' && { borderBottomColor: colors.primary }]}
          >
            <Text style={{ color: mode === 'register' ? colors.primary : colors.textSecondary, fontWeight: '700' }}>
              {t('auth.signUp')}
            </Text>
          </Pressable>
        </View>

        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          placeholder={t('auth.password')}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          textContentType={mode === 'login' ? 'password' : 'newPassword'}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {mode === 'register' ? (
          <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>{t('auth.passwordHint')}</Text>
        ) : backend === 'supabase' ? (
          <Pressable onPress={() => { setMode('reset'); setError(null); setErrorCode(null); }} style={styles.forgotBtn}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('auth.forgotPassword')}</Text>
          </Pressable>
        ) : null}

        {error ? (
          <Text style={[styles.error, { color: showAsInfo ? colors.primary : colors.error }]}>{error}</Text>
        ) : null}

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>{mode === 'login' ? t('auth.signIn') : t('auth.signUp')}</Text>
          )}
        </Pressable>

        {mode === 'login' && (
          <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
            {t('auth.noAccountHint')}{' '}
            <Text
              style={{ color: colors.primary, fontWeight: '600' }}
              onPress={() => { setMode('register'); setError(null); setErrorCode(null); setErrorCode(null); }}
            >
              {t('auth.signUp')}
            </Text>
          </Text>
        )}

        {mode === 'register' && (
          <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
            {t('auth.hasAccountHint')}{' '}
            <Text
              style={{ color: colors.primary, fontWeight: '600' }}
              onPress={() => { setMode('login'); setError(null); setErrorCode(null); setErrorCode(null); }}
            >
              {t('auth.signIn')}
            </Text>
          </Text>
        )}

        <Pressable onPress={guest} style={styles.guestBtn} disabled={loading}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('auth.guest')}</Text>
        </Pressable>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('auth.guestBanner')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  backendNote: { color: '#E8C547', fontSize: 11, textAlign: 'center', marginTop: 10 },
  backendNoteOk: { color: '#A8E6CF', fontSize: 11, textAlign: 'center', marginTop: 10 },
  tabs: { flexDirection: 'row', marginBottom: 20, marginTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8, fontSize: 16 },
  fieldHint: { fontSize: 12, marginBottom: 12, lineHeight: 17 },
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 6, marginBottom: 8 },
  error: { marginBottom: 12, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 4, minHeight: 52, justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  switchHint: { textAlign: 'center', marginTop: 14, fontSize: 13, lineHeight: 20 },
  guestBtn: { alignItems: 'center', padding: 16, marginTop: 8 },
  hint: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16 },
});
