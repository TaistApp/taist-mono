module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/app/**/*.test.@(ts|tsx)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-toast-message|react-native-dropdown-select-list|react-native-star-rating-widget|react-native-actions-sheet|redux-persist))',
  ],
};
