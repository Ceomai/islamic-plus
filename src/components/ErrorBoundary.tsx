import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { logError } from '../services/errorLog';

/** The boundary sits above the theme and language providers, so it carries its own colours and words. */
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
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F6F4EE' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1B2A24', textAlign: 'center' }}>{t.title}</Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: '#4A5A53', textAlign: 'center', marginTop: 12 }}>{t.body}</Text>
        <Pressable
          onPress={() => this.setState({ error: null })}
          accessibilityRole="button"
          style={({ pressed }) => ({
            marginTop: 24,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: pressed ? '#0B4A3B' : '#0F5C4A',
          })}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>{t.retry}</Text>
        </Pressable>
      </View>
    );
  }
}
