import React from 'react';
import { Appearance, Pressable, Text, View } from 'react-native';
import { APP_THEMES, DEFAULT_THEME_ID } from '../constants/themes';
import { logError } from '../services/errorLog';
import { buildThemeColors } from '../theme/colors';
import { radius, space, type } from '../theme/tokens';

/**
 * The boundary sits above the theme and language providers, so it reads the tokens directly (default
 * theme, system light/dark) and carries its own words.
 */
const TEXT = {
  tr: {
    title: 'Bir şeyler ters gitti',
    body: 'Bu ekranda beklenmedik bir hata oluştu. Hata kaydedildi; Ayarlar › Hata raporunu paylaş ile bize iletebilirsiniz.',
    retry: 'Tekrar dene',
  },
  en: {
    title: 'Something went wrong',
    body: 'An unexpected error occurred on this screen. It has been recorded; you can send it from Settings › Share error report.',
    retry: 'Try again',
  },
};

function deviceLang(): 'tr' | 'en' {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const withStack = new Error(error.message);
    withStack.stack = `${error.stack ?? ''}\n${info.componentStack ?? ''}`;
    void logError(withStack, 'render');
  }

  render() {
    if (!this.state.error) return this.props.children;
    const t = TEXT[deviceLang()];
    const colors = buildThemeColors(APP_THEMES[DEFAULT_THEME_ID], Appearance.getColorScheme() === 'dark');
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[8], backgroundColor: colors.background }}>
        <Text style={[type.title, { color: colors.text, textAlign: 'center' }]}>{t.title}</Text>
        <Text style={[type.callout, { color: colors.textSecondary, textAlign: 'center', marginTop: space[3] }]}>{t.body}</Text>
        <Pressable
          onPress={() => this.setState({ error: null })}
          accessibilityRole="button"
          style={({ pressed }) => ({
            marginTop: space[6],
            paddingHorizontal: space[6],
            paddingVertical: space[3],
            borderRadius: radius.md,
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
          })}
        >
          <Text style={[type.bodyStrong, { color: colors.onPrimary }]}>{t.retry}</Text>
        </Pressable>
      </View>
    );
  }
}
