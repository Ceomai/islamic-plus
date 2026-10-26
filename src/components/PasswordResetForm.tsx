import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuthErrorMessage } from '../hooks/useAuthErrorMessage';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppText, Button, Surface, TextField } from '../ui';
import { AuthLayout } from './AuthLayout';

interface Props {
  initialEmail: string;
  onBack: () => void;
}

/** Two-step recovery: e-mail a one-time code, then enter the code with a new password. */
export function PasswordResetForm({ initialEmail, onBack }: Props) {
  const { sendPasswordResetCode, resetPassword } = useAuth();
  const { colors, space } = useTheme();
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

  return (
    <AuthLayout
      title={t('auth.resetTitle')}
      subtitle={step === 'request' ? t('auth.resetRequestHint') : t('auth.resetConfirmHint')}
    >
      <TextField
        label={t('auth.email')}
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
          <TextField
            label={t('auth.resetCode')}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={10}
            value={code}
            onChangeText={setCode}
            editable={!loading}
          />
          <TextField
            label={t('auth.newPassword')}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!loading}
            hint={t('auth.passwordHint')}
          />
        </>
      )}

      {message ? (
        <Surface
          variant={message.info ? 'soft' : 'default'}
          padding={space[3]}
          style={{ marginBottom: space[4], borderColor: message.info ? undefined : colors.error }}
        >
          <AppText variant="callout" tone={message.info ? 'brand' : 'danger'}>
            {message.text}
          </AppText>
        </Surface>
      ) : null}

      <Button
        label={step === 'request' ? t('auth.resetSendCode') : t('auth.resetConfirm')}
        onPress={step === 'request' ? sendCode : confirm}
        loading={loading}
        size="lg"
        fullWidth
      />
      {step === 'confirm' && (
        <Button
          label={t('auth.resetResend')}
          onPress={sendCode}
          variant="ghost"
          disabled={loading}
          fullWidth
          style={{ marginTop: space[2] }}
        />
      )}
      <Button
        label={t('auth.backToSignIn')}
        onPress={onBack}
        variant="ghost"
        disabled={loading}
        fullWidth
        style={{ marginTop: space[2] }}
      />
    </AuthLayout>
  );
}
