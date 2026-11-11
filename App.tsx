import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AppProvider, useApp } from './src/context/AppContext';
import { useTranslation } from './src/hooks/useTranslation';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { flushPendingErrors, installGlobalErrorHandler } from './src/services/errorLog';
import { definePrayerActionTask } from './src/services/prayerAction';
import { defineWidgetTask } from './src/services/widgetBackground';

function Root() {
  const { darkMode, loading, settings } = useApp();
  const { session } = useAuth();
  const { t } = useTranslation();

  let content: React.ReactNode = <AuthScreen />;
  if (session) {
    // Wait for stored settings so returning users never see the introduction flash by
    if (loading) {
      content = (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" accessibilityLabel={t('common.loading')} />
        </View>
      );
    } else {
      content = settings.onboardingDone ? <AppNavigator /> : <OnboardingScreen />;
    }
  }

  return (
    <>
      {/* darkMode is the resolved appearance (themeMode applied to the system scheme) */}
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      {content}
    </>
  );
}

/** Remount all app state when the account changes so one user's data never leaks into another's. */
function SessionScopedApp() {
  const { session, authReady } = useAuth();

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AppProvider key={session?.userId ?? 'signed-out'}>
      <Root />
    </AppProvider>
  );
}

installGlobalErrorHandler();
void flushPendingErrors().catch(() => undefined);
// Background tasks must be defined when the JS bundle loads, before any screen renders
defineWidgetTask();
definePrayerActionTask();

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <SessionScopedApp />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
