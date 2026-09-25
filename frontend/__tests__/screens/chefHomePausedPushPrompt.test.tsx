import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: 'FontAwesomeIcon',
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require('react');
    useEffect(() => cb(), []);
  },
}));

// Container pulls in GoLiveToggle -> react-redux, which ships ESM that Jest
// does not transform. The layout is irrelevant to what these cover.
jest.mock('../../app/layout/Container', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <View>{children}</View> };
});

jest.mock('../../app/utils/navigation', () => ({
  navigate: { toChef: new Proxy({}, { get: () => jest.fn() }) },
}));

jest.mock('../../app/firebase', () => ({
  RequestPushPermission: jest.fn(async () => true),
  GetFCMToken: jest.fn(async () => 'fcm-token'),
}));

jest.mock('../../app/services/api', () =>
  new Proxy({}, { get: () => jest.fn(async () => ({ success: 0, data: [] })) }),
);

let mockCurrentUser: Record<string, unknown> = {};
jest.mock('../../app/hooks/useRedux', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      user: { user: mockCurrentUser },
      table: { users: [], menus: [] },
      chef: { profile: {}, paymentMehthod: {} },
      device: { notification_order_id: -1, notification_id: '' },
    }),
  useAppDispatch: () => jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import ChefHome from '../../app/screens/chef/home';

/**
 * A paused chef takes an early return that used to end before the modal was
 * rendered. The prompt was still scheduled, so showPushModal flipped, nothing
 * appeared, and no outcome was recorded — leaving the chef re-prompted on every
 * focus by a dialog they could never see or answer.
 */
describe('the push prompt on the paused-chef screen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockCurrentUser = { id: 811, user_type: 2, is_pending: 0, is_paused: 1 };
  });

  const settle = async () => {
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
  };

  it('renders the prompt on the reactivation screen too', async () => {
    jest.useFakeTimers();
    try {
      render(<ChefHome />);
      await settle();

      expect(screen.getByTestId('chefHome.reactivateButton')).toBeTruthy();
      expect(screen.getByTestId('pushPermission.title')).toHaveTextContent(
        'Turn on notifications',
      );
    } finally {
      jest.useRealTimers();
    }
  });

  // Control: an active chef still gets the prompt on the normal dashboard.
  it('still renders the prompt on the normal dashboard', async () => {
    jest.useFakeTimers();
    try {
      mockCurrentUser = { id: 903, user_type: 2, is_pending: 0, is_paused: 0 };
      render(<ChefHome />);
      await settle();

      expect(screen.queryByTestId('chefHome.reactivateButton')).toBeNull();
      expect(screen.getByTestId('pushPermission.title')).toHaveTextContent(
        'Turn on notifications',
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
