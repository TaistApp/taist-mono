module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Tests must live OUTSIDE app/ — expo-router's require.context treats every
  // file in app/ as a route and bundles it into the app (breaks EAS builds).
  testMatch: ['<rootDir>/__tests__/**/*.test.@(ts|tsx)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-toast-message|react-native-dropdown-select-list|react-native-star-rating-widget|react-native-actions-sheet|redux-persist))',
  ],
};
