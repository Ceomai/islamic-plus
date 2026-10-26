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
} from 'react-native';
import { GradientHero } from './GradientHero';
import { useAuth } from '../context/AuthContext';
import { useAuthErrorMessage } from '../hooks/useAuthErrorMessage';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

interface Props {
  initialEmail: string;
  onBack: () => void;
}

/** Two-step recovery: e-mail a one-time code, then enter the code with a new password. */
export function PasswordResetForm({ initialEmail, onBack }: Props) {
  const { sendPasswordResetCode, resetPassword } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const errorMessage = useAuthErrorMessage();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; info: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const result = await sendPasswordResetCode(email);
      if (result.ok) {
        setStep('confirm');
        setMessage({ text: t('auth.resetCodeSent'), info: true });
      } else {
        setMessage({ text: errorMessage(result.error ?? 'unknown'), info: false });
      }
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setMessage(null);
    setLoading(true);
    try {
      // On success the auth context switches to the signed-in app
      const result = await resetPassword(email, code, newPassword);
      if (!result.ok) setMessage({ text: errorMessage(result.error ?? 'unknown'), info: false });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }];

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GradientHero>
          <Text style={styles.heroTitle}>{t('auth.resetTitle')}</Text>
          <Text style={styles.heroSub}>
            {step === 'request' ? t('auth.resetRequestHint') : t('auth.resetConfirmHint')}
          </Text>
        </GradientHero>

        <TextInput
          style={inputStyle}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          editable={!loading && step === 'request'}
        />

        {step === 'confirm' && (
          <>
            <TextInput
              style={inputStyle}
              placeholder={t('auth.resetCode')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={10}
              value={code}
              onChangeText={setCode}
              editable={!loading}
            />
            <TextInput
              style={inputStyle}
              placeholder={t('auth.newPassword')}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              textContentType="newPassword"
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!loading}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>{t('auth.passwordHint')}</Text>
          </>
        )}

        {message ? (
          <Text style={[styles.message, { color: message.info ? colors.primary : colors.error }]}>{message.text}</Text>
        ) : null}

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={step === 'request' ? sendCode : confirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {step === 'request' ? t('auth.resetSendCode') : t('auth.resetConfirm')}
            </Text>
          )}
        </Pressable>

        {step === 'confirm' && (
          <Pressable onPress={sendCode} disabled={loading} style={styles.linkBtn}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('auth.resetResend')}</Text>
          </Pressable>
        )}

        <Pressable onPress={onBack} disabled={loading} style={styles.linkBtn}>
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('auth.backToSignIn')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8, fontSize: 16 },
  fieldHint: { fontSize: 12, marginBottom: 12, lineHeight: 17 },
  message: { marginBottom: 12, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 4, minHeight: 52, justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkBtn: { alignItems: 'center', padding: 14 },
});
