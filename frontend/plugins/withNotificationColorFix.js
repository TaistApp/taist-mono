const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Fixes Android manifest merger conflict between expo-notifications and
 * @react-native-firebase/messaging — both define default_notification_color.
 *
 * Adds tools:replace="android:resource" to our notification color meta-data
 * so our value wins over Firebase's default (@color/white).
 */
module.exports = function withNotificationColorFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure xmlns:tools is declared on the <manifest> element
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const mainApplication = manifest.application?.[0];
    if (!mainApplication) return config;

    const metaData = mainApplication['meta-data'] || [];

    for (const item of metaData) {
      if (
        item.$?.['android:name'] ===
        'com.google.firebase.messaging.default_notification_color'
      ) {
        item.$['tools:replace'] = 'android:resource';
      }
    }

    return config;
  });
};
