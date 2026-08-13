/* Shared mocks for native modules that have no Jest implementation. */

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
