/* Shared mocks for native modules that have no Jest implementation. */

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    dismissAll: jest.fn(),
  },
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-toast-message', () => {
  const mockToast = () => null;
  mockToast.show = jest.fn();
  mockToast.hide = jest.fn();
  return { __esModule: true, default: mockToast };
});

// utils/functions.ts imports services/api.ts (for Photo_URL), which drags in
// native modules that have no Jest implementation. Mocking them here keeps any
// test that touches a util from having to know about that coupling.
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
  setRNConfiguration: jest.fn(),
  requestAuthorization: jest.fn(),
}));
