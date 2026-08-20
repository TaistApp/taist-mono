import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import Container from '../../app/layout/Container';
import { goBack } from '../../app/utils/navigation';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useSegments: () => ['screens', 'common', 'chat'],
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

jest.mock('../../app/hooks/useUnreadNotifications', () => ({
  useUnreadNotifications: () => ({ unreadCount: 0 }),
}));

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: 'FontAwesomeIcon',
}));

jest.mock('../../app/components/DrawerModal', () => 'DrawerModal');
jest.mock('../../app/components/cartIcon', () => 'CartIcon');
jest.mock('../../app/components/GoLiveToggle', () => 'GoLiveToggle');

describe('Container header in back mode', () => {
  beforeEach(() => jest.clearAllMocks());

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
