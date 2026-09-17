import { render } from '@testing-library/react-native';
import React from 'react';

import ChefDeepLinkScreen from '../../app/chef/[id]';
import {
  openChefDeepLink,
  setPendingChefId,
} from '../../app/hooks/useChefDeepLinkHandler';
import { isAuthorizedStackReady } from '../../app/utils/navigation';
import { store } from '../../app/store';
import { ShowErrorToast } from '../../app/utils/toast';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ id: '42' }),
}));

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(() => Promise.resolve()) }));

jest.mock('../../app/hooks/useChefDeepLinkHandler', () => ({
  openChefDeepLink: jest.fn(() => Promise.resolve()),
  setPendingChefId: jest.fn(),
}));

jest.mock('../../app/utils/navigation', () => ({
  isAuthorizedStackReady: jest.fn(() => true),
}));

jest.mock('../../app/utils/toast', () => ({ ShowErrorToast: jest.fn() }));

jest.mock('../../app/store', () => ({
  store: { getState: jest.fn() },
}));

const signedInAs = (user: any) =>
  (store.getState as jest.Mock).mockReturnValue({ user: { user } });

/**
 * Tapping a shared chef link while signed in as a chef dropped the user back on
 * their own dashboard with no explanation: the id was stashed for later, but
 * resumePendingChef only consumes it for customers, so auto-login simply
 * restored the chef session and the link appeared to be ignored.
 */
describe('chef deep link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isAuthorizedStackReady as jest.Mock).mockReturnValue(true);
  });

  it('tells a signed-in chef why the link will not open', () => {
    signedInAs({ id: 7, user_type: 2 });

    render(<ChefDeepLinkScreen />);

    expect(ShowErrorToast).toHaveBeenCalledWith(
      expect.stringContaining('customer account'),
    );
    expect(openChefDeepLink).not.toHaveBeenCalled();
  });

  it('does not stash an id a chef session can never consume', () => {
    signedInAs({ id: 7, user_type: 2 });

    render(<ChefDeepLinkScreen />);

    expect(setPendingChefId).not.toHaveBeenCalled();
  });

  // Control: a signed-in customer with the stack up opens chef detail directly.
  it('opens chef detail for a customer', () => {
    signedInAs({ id: 9, user_type: 1 });

    render(<ChefDeepLinkScreen />);

    expect(openChefDeepLink).toHaveBeenCalledWith(42);
    expect(ShowErrorToast).not.toHaveBeenCalled();
  });

  // Control: logged out still defers to the splash/auto-login flow.
  it('defers to auto-login when logged out', () => {
    signedInAs(undefined);

    render(<ChefDeepLinkScreen />);

    expect(setPendingChefId).toHaveBeenCalledWith(42);
    expect(ShowErrorToast).not.toHaveBeenCalled();
  });
});
