import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { AppText } from '../ui/AppText';
import { IconBadge } from '../ui/IconBadge';

interface Props {
  title: string;
  subtitle?: string;
  /** Small line under the subtitle (e.g. which backend is active) */
  note?: string;
  children: React.ReactNode;
}

/** Shared frame for sign-in, sign-up and password reset. */
export function AuthLayout({ title, subtitle, note, children }: Props) {
  const { colors, space } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: space[6], paddingTop: space[10] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: space[8] }}>
            <IconBadge name="moon" size="lg" />
            <AppText variant="title" align="center" style={{ marginTop: space[4] }}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="callout" tone="secondary" align="center" style={{ marginTop: space[2], maxWidth: 320 }}>
                {subtitle}
              </AppText>
            ) : null}
            {note ? (
              <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space[2] }}>
                {note}
              </AppText>
            ) : null}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
