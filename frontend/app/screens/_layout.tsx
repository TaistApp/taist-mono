import { Stack } from 'expo-router';
import React from 'react';
import { useChefDeepLinkHandler } from '../hooks/useChefDeepLinkHandler';

export default function ScreensLayout() {
  useChefDeepLinkHandler();

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      {/* Customer screens */}
      <Stack.Screen name="customer" options={{ title: 'Customer' }} />

      {/* Chef screens */}
      <Stack.Screen name="chef" options={{ title: 'Chef' }} />

      {/* Common screens - let Expo Router auto-discover them */}
      <Stack.Screen name="common" options={{ title: 'Common' }} />
    </Stack>
  );
}
