import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import Inbox from '../../app/screens/common/inbox';
import { GetConversationListAPI, GetNotifcationDataAPI } from '../../app/services/api';
import { navigate } from '../../app/utils/navigation';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(cb, []);
  },
}));

jest.mock('../../app/layout/Container', () => {
  const { View } = require('react-native');
  return ({ children }: any) => <View>{children}</View>;
});

jest.mock('../../app/services/api', () => ({
  GetConversationListAPI: jest.fn(),
  GetNotifcationDataAPI: jest.fn(),
}));

jest.mock('../../app/utils/navigation', () => ({
  navigate: { toCommon: { chat: jest.fn(), notification: jest.fn() } },
}));

jest.mock('../../app/hooks/useRedux', () => ({
  useAppSelector: (selector: any) =>
    selector({ user: { user: { id: 1, user_type: 1 } }, table: { users: [] } }),
  useAppDispatch: () => jest.fn(),
}));

let mockUnreadCount = 0;
jest.mock('../../app/hooks/useUnreadNotifications', () => ({
  useUnreadNotifications: () => ({ unreadCount: mockUnreadCount, refresh: jest.fn() }),
}));

/**
 * The bell icon is gone from the header, so notifications have to be
 * reachable as a Taist thread pinned to the top of the inbox.
 */
describe('Inbox Taist thread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnreadCount = 0;
    (GetConversationListAPI as jest.Mock).mockResolvedValue({ success: 1, data: [] });
    (GetNotifcationDataAPI as jest.Mock).mockResolvedValue({ success: 1, data: [] });
  });

  it('pins a Taist thread even with no chef conversations', async () => {
    render(<Inbox />);

    await waitFor(() => expect(screen.getByTestId('chatInbox.taistCard')).toBeTruthy());
    expect(screen.getByText('Taist')).toBeTruthy();
  });

  it('previews the newest Taist notification', async () => {
    (GetNotifcationDataAPI as jest.Mock).mockResolvedValue({
      success: 1,
      data: [{ id: 7, body: 'Your order was accepted', created_at: '2026-09-07 12:00:00' }],
    });

    render(<Inbox />);

    await waitFor(() =>
      expect(screen.getByText('Your order was accepted')).toBeTruthy(),
    );
  });

  it('opens the Taist updates screen when tapped', async () => {
    render(<Inbox />);

    await waitFor(() => expect(screen.getByTestId('chatInbox.taistCard')).toBeTruthy());
    fireEvent.press(screen.getByTestId('chatInbox.taistCard'));

    expect(navigate.toCommon.notification).toHaveBeenCalledTimes(1);
  });

  it('marks the thread unread when notifications are waiting', async () => {
    mockUnreadCount = 2;

    render(<Inbox />);

    await waitFor(() => expect(screen.getByTestId('chatInbox.taistUnread')).toBeTruthy());
  });

  // Control: nothing unread leaves the thread unmarked.
  it('leaves the thread unmarked when nothing is unread', async () => {
    render(<Inbox />);

    await waitFor(() => expect(screen.getByTestId('chatInbox.taistCard')).toBeTruthy());
    expect(screen.queryByTestId('chatInbox.taistUnread')).toBeNull();
  });
});
