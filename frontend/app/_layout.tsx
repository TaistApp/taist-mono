import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import KeyboardManager from 'react-native-keyboard-manager';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { PaperProvider } from 'react-native-paper';

import { useColorScheme } from 'react-native';
import ProgressProvider from './services/ProgressProvider';
import { persistor, store } from './store';
import { StripPublishableKey } from './utils/constance';
import { initializeNavigation } from './utils/navigation';
import { toastConfig } from './utils/toast';
import AppTheme from '../constants/theme';
import { initializeCrashlytics } from './services/crashlytics';
import { ErrorBoundary } from './components/ErrorBoundary';

// Storybook conditional loading
const STORYBOOK_ENABLED = Constants.expoConfig?.extra?.storybookEnabled;

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Conditionally load Storybook
let StorybookUI: React.ComponentType | null = null;
if (STORYBOOK_ENABLED) {
  StorybookUI = require('../storybook').default;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Skip normal app initialization if Storybook is enabled
    if (STORYBOOK_ENABLED) {
      SplashScreen.hideAsync();
      return;
    }

    // Initialize Crashlytics early
    initializeCrashlytics().catch(error => {
      console.error('Failed to initialize Crashlytics:', error);
    });

    if (Platform.OS === 'ios') {
      KeyboardManager.setEnable(true);
    }

    // Initialize navigation
    initializeNavigation();

    // Don't hide splash screen here - let the Splash component handle it
    // This ensures seamless transition from native to React splash
  }, []);

  // Render Storybook if enabled
  if (STORYBOOK_ENABLED && StorybookUI) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={AppTheme}>
          <StorybookUI />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <PaperProvider theme={AppTheme}>
              <ProgressProvider>
                <StripeProvider publishableKey={StripPublishableKey}>
                  <SafeAreaProvider>
                    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" options={{ headerShown: false }} />
                        <Stack.Screen name="screens" options={{ headerShown: false }} />
                        <Stack.Screen name="stripe-complete" options={{ headerShown: false }} />
                        <Stack.Screen name="stripe-refresh" options={{ headerShown: false }} />
                        <Stack.Screen name="(not-found)" options={{ title: 'Not Found' }} />
                      </Stack>
                      <StatusBar style="auto" />
                    </ThemeProvider>
                  </SafeAreaProvider>
                </StripeProvider>
                <Toast config={toastConfig} />
              </ProgressProvider>
            </PaperProvider>
          </PersistGate>
        </Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
