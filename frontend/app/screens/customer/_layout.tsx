import { Stack } from 'expo-router';
import React from 'react';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" options={{ title: 'Customer Tabs' }} />
      <Stack.Screen name="chefDetail" options={{ title: 'Chef Detail' }} />
      <Stack.Screen name="addToOrder" options={{ title: 'Add To Order' }} />
      <Stack.Screen name="cart" options={{ title: 'Cart' }} />
      <Stack.Screen name="orderDetail" options={{ title: 'Order Detail' }} />
      <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
      <Stack.Screen name="earnByCooking" options={{ title: 'Earn By Cooking' }} />
    </Stack>
  );
}
