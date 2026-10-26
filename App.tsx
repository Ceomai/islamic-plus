import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/AuthScreen';

function Root() {
  const { darkMode } = useApp();
  const { session } = useAuth();

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      {session ? <AppNavigator /> : <AuthScreen />}
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

export default function App() {
  return (
    <AuthProvider>
      <SessionScopedApp />
    </AuthProvider>
  );
}
