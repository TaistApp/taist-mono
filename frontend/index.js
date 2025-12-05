// Guard Firebase imports for Expo Go compatibility
// These modules only exist in development/production builds, not Expo Go
let messaging;

try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (e) {
  // Firebase modules not available (running in Expo Go)
  console.log('Firebase modules not available - running in Expo Go');
}

// Register background handler (only if messaging is available)
if (messaging) {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
  });
}

// Import expo-router entry point
import 'expo-router/entry';
