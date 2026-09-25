import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: 'FontAwesomeIcon',
}));

jest.mock('../../app/utils/navigation', () => ({
  navigate: { toChef: { safetyQuiz: jest.fn() } },
}));

const mockRequestPermission = jest.fn(async () => true);
const mockRegisterToken = jest.fn(async () => 'fcm-token');
jest.mock('../../app/firebase', () => ({
  RequestPushPermission: () => mockRequestPermission(),
  GetFCMToken: () => mockRegisterToken(),
}));

const mockOptIn = jest.fn(async (_id: number) => ({ success: true }));
jest.mock('../../app/services/api', () => ({
  OptInPushNotificationsAPI: (id: number) => mockOptIn(id),
}));

let mockCurrentUser: Record<string, unknown> = {};
jest.mock('../../app/hooks/useRedux', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({ user: { user: mockCurrentUser } }),
  useAppDispatch: () => jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import ChefWelcome from '../../app/screens/chef/chefWelcome';
import { PUSH_PROMPT_KEYS } from '../../app/utils/pushPrompt';

/**
 * The chef prompt lived only on the chef home screen, which suppresses it while
 * a redirect is pending — and a chef who has not finished the safety quiz is
 * redirected off that screen the moment it mounts. In production that was 133
 * of 174 chefs, 77 of whom already had an FCM token stored, so Firebase
 * reported every send as delivered and the device dropped it silently.
 */
describe('asking a pending chef for notification permission', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockCurrentUser = { id: 903, user_type: 2, is_pending: 1, quiz_completed: 0 };
  });

  const settle = async () => {
    // Let the storage read resolve, then run out the anti-flash delay.
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
  };

  it('prompts the chef who never reaches the home screen', async () => {
    jest.useFakeTimers();
    try {
      render(<ChefWelcome />);
      await settle();

      expect(screen.getByTestId('pushPermission.title')).toHaveTextContent(
        'Turn on notifications',
      );
    } finally {
      jest.useRealTimers();
    }
  });

  // Control: the prompt must not fire before the screen knows who the chef is,
  // or it opts in nobody and burns the one ask.
  it('stays quiet until the user has loaded', async () => {
    jest.useFakeTimers();
    try {
      mockCurrentUser = {};
      render(<ChefWelcome />);
      await settle();

      expect(screen.queryByTestId('pushPermission.title')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  // Control: the home screen and this screen share one record, so a chef who
  // already accepted there is not asked again here.
  it('does not re-ask a chef who already accepted', async () => {
    jest.useFakeTimers();
    try {
      await AsyncStorage.setItem(
        PUSH_PROMPT_KEYS.chef,
        JSON.stringify({ accepted: true, declineCount: 0, lastPromptedAt: 1 }),
      );

      render(<ChefWelcome />);
      await settle();

      expect(screen.queryByTestId('pushPermission.title')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('registers the token and records the opt-in when the chef accepts', async () => {
    jest.useFakeTimers();
    let accept: () => void;
    try {
      render(<ChefWelcome />);
      await settle();
      accept = () => fireEvent.press(screen.getByTestId('pushPermission.accept'));
      await act(async () => {
        accept();
      });
    } finally {
      jest.useRealTimers();
    }

    await waitFor(() => expect(mockOptIn).toHaveBeenCalledWith(903));
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockRegisterToken).toHaveBeenCalledTimes(1);
  });
});
