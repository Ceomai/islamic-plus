import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordResetForm } from '../components/PasswordResetForm';
import { useAuth } from '../context/AuthContext';
import { useAuthErrorMessage } from '../hooks/useAuthErrorMessage';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { AppText, Button, SegmentedControl, Surface, TextField } from '../ui';

const INFO_ERRORS = new Set(['email_confirmation_sent']);

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { register, login, guest, backend } = useAuth();
  const { colors, space } = useTheme();
  const { t } = useTranslation();
  const errorMessage = useAuthErrorMessage();
  const [mode, setMode] = useState<Mode | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (mode === 'reset') {
    return <PasswordResetForm initialEmail={email} onBack={() => setMode('login')} />;
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorCode(null);
  };

  const submit = async () => {
    setErrorCode(null);
    setLoading(true);
    try {
      const fn = mode === 'login' ? login : register;
      const result = await fn(email, password);
      if (!result.ok) setErrorCode(result.error ?? 'unknown');
    } finally {
      setLoading(false);
    }
  };

  const isInfo = Boolean(errorCode && INFO_ERRORS.has(errorCode));

  return (
    <AuthLayout
      title={t('auth.welcome')}
      subtitle={t('auth.subtitle')}
      note={backend === 'local' ? t('auth.localBackend') : undefined}
    >
      <SegmentedControl
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'login', label: t('auth.signIn') },
          { value: 'register', label: t('auth.signUp') },
        ]}
      />

      <View style={{ marginTop: space[5] }}>
        <TextField
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        <TextField
          label={t('auth.password')}
          secureTextEntry
          textContentType={mode === 'login' ? 'password' : 'newPassword'}
          autoComplete={mode === 'login' ? 'password' : 'new-password'}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          hint={mode === 'register' ? t('auth.passwordHint') : undefined}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        {mode === 'login' && backend === 'supabase' && (
          <Pressable
            onPress={() => setMode('reset')}
            hitSlop={8}
            accessibilityRole="button"
            style={{ alignSelf: 'flex-end', marginTop: -space[1], marginBottom: space[3] }}
          >
            <AppText variant="callout" tone="brand" style={{ fontWeight: '600' }}>
              {t('auth.forgotPassword')}
            </AppText>
          </Pressable>
        )}
      </View>

      {errorCode ? (
        <Surface variant={isInfo ? 'soft' : 'default'} padding={space[3]} style={{ marginBottom: space[4], borderColor: isInfo ? undefined : colors.error }}>
          <AppText variant="callout" tone={isInfo ? 'brand' : 'danger'}>
            {errorMessage(errorCode)}
          </AppText>
        </Surface>
      ) : null}

      <Button
        label={mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
        onPress={submit}
        loading={loading}
        size="lg"
        fullWidth
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: space[6] }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <AppText variant="caption" tone="muted" style={{ marginHorizontal: space[3] }}>
          {t('auth.or')}
        </AppText>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      <Button label={t('auth.guest')} onPress={guest} variant="secondary" size="lg" fullWidth disabled={loading} />
      <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[3] }}>
        {t('auth.guestBanner')}
      </AppText>
    </AuthLayout>
  );
}
