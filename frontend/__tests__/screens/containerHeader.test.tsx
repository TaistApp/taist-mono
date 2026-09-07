import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import Container from '../../app/layout/Container';
import { goBack, navigate } from '../../app/utils/navigation';

let mockSegments = ['screens', 'common', 'chat'];

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useSegments: () => mockSegments,
  usePathname: () => '/screens/common/chat',
  useLocalSearchParams: () => ({}),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({}),
}));

jest.mock('../../app/utils/navigation', () => ({
  goBack: jest.fn(),
  navigate: {
    toCommon: { inbox: jest.fn(), notification: jest.fn(), reportIssue: jest.fn() },
  },
}));

jest.mock('../../app/hooks/useRedux', () => ({
  useAppSelector: (selector: any) => selector({ user: { user: { id: 1, user_type: 1 } } }),
  useAppDispatch: () => jest.fn(),
}));

let mockUnreadCount = 0;

jest.mock('../../app/hooks/useUnreadNotifications', () => ({
  useUnreadNotifications: () => ({ unreadCount: mockUnreadCount }),
}));

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: 'FontAwesomeIcon',
}));

jest.mock('../../app/components/DrawerModal', () => 'DrawerModal');
jest.mock('../../app/components/cartIcon', () => 'CartIcon');
jest.mock('../../app/components/GoLiveToggle', () => 'GoLiveToggle');

describe('Container header in back mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSegments = ['screens', 'common', 'chat'];
    mockUnreadCount = 0;
  });

  it('renders the title so the chat screen can show the chef name', () => {
    render(
      <Container backMode title="Chikondi M.">
        <Text>body</Text>
      </Container>,
    );

    expect(screen.getByTestId('header.title')).toHaveTextContent('Chikondi M.');
  });

  // Control: the title overlay spans the whole header, so it must not swallow
  // taps meant for the back button underneath it.
  it('keeps the back button tappable underneath the centred title', () => {
    render(
      <Container backMode title="Chikondi M.">
        <Text>body</Text>
      </Container>,
    );

    fireEvent.press(screen.getByTestId('header.backButton'));

    expect(goBack).toHaveBeenCalledTimes(1);
  });
});

/**
 * The bell and the message icon were two separate buttons, which (with the
 * cart) made the action row wide enough to sit on top of the centred logo.
 * Notifications now live in the inbox as a thread from Taist, so the header
 * carries a single message button.
 */
describe('Container header actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSegments = ['screens', 'customer', '(tabs)'];
    mockUnreadCount = 0;
  });

  it('shows one message button and no separate bell', () => {
    render(
      <Container>
        <Text>body</Text>
      </Container>,
    );

    expect(screen.getByTestId('header.chatButton')).toBeTruthy();
    expect(screen.queryByTestId('header.notificationsButton')).toBeNull();
  });

  it('sends the message button to the inbox', () => {
    render(
      <Container>
        <Text>body</Text>
      </Container>,
    );

    fireEvent.press(screen.getByTestId('header.chatButton'));

    expect(navigate.toCommon.inbox).toHaveBeenCalledTimes(1);
  });

  it('moves the unread dot onto the message button', () => {
    mockUnreadCount = 3;

    render(
      <Container>
        <Text>body</Text>
      </Container>,
    );

    expect(screen.getByTestId('header.unreadDot')).toBeTruthy();
  });

  // Control: no unread notifications means no dot.
  it('shows no dot when nothing is unread', () => {
    render(
      <Container>
        <Text>body</Text>
      </Container>,
    );

    expect(screen.queryByTestId('header.unreadDot')).toBeNull();
  });

  it('reserves gutters for the action row so the logo cannot sit under it', () => {
    render(
      <Container>
        <Text>body</Text>
      </Container>,
    );

    // The action row reports its own width; the overlay must grow to match.
    fireEvent(screen.getByTestId('header.actions'), 'layout', {
      nativeEvent: { layout: { width: 140, height: 40 } },
    });

    const overlay = screen.getByTestId('header.logoContainer');
    const style = Object.assign({}, ...[overlay.props.style].flat().filter(Boolean));
    expect(style.paddingHorizontal).toBeGreaterThanOrEqual(140);
  });
});
