import { Stack } from 'expo-router';
import React from 'react';

export default function ChefLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {/* Tab navigation - this will be the initial screen for chefs */}
      <Stack.Screen name="(tabs)" options={{ title: 'Chef Tabs' }} />
      
      {/* Individual chef screens outside of tabs */}
      <Stack.Screen name="chefWelcome" options={{ title: 'Welcome', animation: 'slide_from_right' }} />
      <Stack.Screen name="safetyQuiz" options={{ title: 'Safety Quiz', animation: 'slide_from_right' }} />
      <Stack.Screen name="addMenuItem" options={{ title: 'Add Menu Item', animation: 'slide_from_right' }} />
      <Stack.Screen name="addOnCustomization" options={{ title: 'Add Add-on', animation: 'slide_from_right' }} />
      <Stack.Screen name="orderDetail" options={{ title: 'Order Detail', animation: 'slide_from_right' }} />
      <Stack.Screen name="backgroundCheck" options={{ title: 'Background Check', animation: 'slide_from_right' }} />
      <Stack.Screen name="onboarding" options={{ title: 'Chef Onboarding', animation: 'slide_from_right' }} />
      <Stack.Screen name="setupStrip" options={{ title: 'Setup Stripe', animation: 'slide_from_right' }} />
      <Stack.Screen name="howToDo" options={{ title: 'How To Do', animation: 'slide_from_right' }} />
      <Stack.Screen name="feedback" options={{ title: 'Feedback', animation: 'slide_from_right' }} />
      <Stack.Screen name="cancelApplication" options={{ title: 'Cancel Application', animation: 'slide_from_right' }} />
    </Stack>
  );
}
