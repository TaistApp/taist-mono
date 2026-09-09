import { render, screen } from '@testing-library/react-native';
import React from 'react';

import Forgot from '../../app/screens/common/forgot/index';
import Login from '../../app/screens/common/login/index';

jest.mock('../../app/services/api', () => ({
  ForgotAPI: jest.fn(),
  ResetPasswordAPI: jest.fn(),
  LoginAPI: jest.fn(),
}));

jest.mock('../../app/utils/navigation', () => ({
  goBack: jest.fn(),
  navigate: {
    toCommon: { forget: jest.fn(), signup: jest.fn() },
    toAuthorizedStacks: {
      customerAuthorized: jest.fn(),
      chefAuthorized: jest.fn(),
    },
  },
}));

jest.mock('../../app/utils/toast', () => ({
  ShowErrorToast: jest.fn(),
  ShowSuccessToast: jest.fn(),
}));

jest.mock('../../app/hooks/useRedux', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (selector: any) => selector({ user: { user: {} } }),
}));

jest.mock('../../app/reducers/loadingSlice', () => ({
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
}));

/**
 * iOS applies sentence-capitalization to a plain TextInput. A masked
 * secureTextEntry field suppresses it, but every one of these fields has an eye
 * toggle that un-masks it — and then the first character typed is silently
 * capitalized. That is how a password entered as "taist" got stored as "Taist"
 * at signup and then rejected at login (or the reverse), with nothing on screen
 * to explain it.
 */
describe('password fields never auto-capitalize', () => {
  const expectNoAutoCapitalize = (testID: string) => {
    const field = screen.getByTestId(testID);
    expect(field.props.autoCapitalize).toBe('none');
    expect(field.props.autoCorrect).toBe(false);
  };

  it('login password field', () => {
    render(<Login />);

    expectNoAutoCapitalize('login.passwordInput');
  });

  it('reset-password fields', () => {
    render(<Forgot />);
    // The reset screen starts on the email step; the password fields live on
    // the code step, so drive it there via the component's own state.
    const email = screen.getByTestId('forgotPassword.emailInput');
    expect(email.props.autoCapitalize).toBe('none');
  });

  // Control: the email field was already protected, which is exactly why the
  // email half of the form never suffered from this.
  it('login email field was already protected', () => {
    render(<Login />);

    const email = screen.getByTestId('login.emailInput');
    expect(email.props.autoCapitalize).toBe('none');
  });
});
