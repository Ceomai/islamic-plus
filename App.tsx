import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AppProvider, useApp } from './src/context/AppContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { installGlobalErrorHandler } from './src/services/errorLog';

function Root() {
  const { darkMode, loading, settings } = useApp();
  const { session } = useAuth();

  let content: React.ReactNode = <AuthScreen />;
  if (session) {
    // Wait for stored settings so returning users never see the introduction flash by
    if (loading) {
      content = (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      );
    } else {
      content = settings.onboardingDone ? <AppNavigator /> : <OnboardingScreen />;
    }
  }

  return (
    <>
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
