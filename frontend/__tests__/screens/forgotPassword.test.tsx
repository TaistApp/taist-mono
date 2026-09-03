import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import Forgot from '../../app/screens/common/forgot/index';
import { ForgotAPI, ResetPasswordAPI } from '../../app/services/api';
import { goBack } from '../../app/utils/navigation';
import { ShowErrorToast, ShowSuccessToast } from '../../app/utils/toast';

jest.mock('../../app/services/api', () => ({
  ForgotAPI: jest.fn(),
  ResetPasswordAPI: jest.fn(),
}));

jest.mock('../../app/utils/navigation', () => ({
  goBack: jest.fn(),
}));

jest.mock('../../app/utils/toast', () => ({
  ShowErrorToast: jest.fn(),
  ShowSuccessToast: jest.fn(),
}));

jest.mock('../../app/hooks/useRedux', () => ({
  useAppDispatch: () => jest.fn(),
}));

// Stubbed so the suite doesn't pull @reduxjs/toolkit (ESM immer) through the
// transform, which jest-expo's transformIgnorePatterns excludes.
jest.mock('../../app/reducers/loadingSlice', () => ({
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
}));

const EMAIL = 'chef@example.com';
const CODE = '539044';
const PASSWORD = 'NewPass123!';

/** Walk the screen from the email step to the code + password step. */
async function requestCode() {
  (ForgotAPI as jest.Mock).mockResolvedValue({ success: 1, data: CODE });
  fireEvent.changeText(screen.getByTestId('forgotPassword.emailInput'), EMAIL);
  fireEvent.press(screen.getByTestId('forgotPassword.submitButton'));
  await waitFor(() =>
    expect(screen.getByTestId('forgotPassword.codeInput')).toBeOnTheScreen(),
  );
}

/** Fill in a valid code + matching passwords. */
function fillResetForm(code = CODE, confirm = PASSWORD) {
  fireEvent.changeText(screen.getByTestId('forgotPassword.codeInput'), code);
  fireEvent.changeText(screen.getByTestId('forgotPassword.passwordInput'), PASSWORD);
  fireEvent.changeText(
    screen.getByTestId('forgotPassword.confirmPasswordInput'),
    confirm,
  );
}

describe('Forgot password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Password visibility toggles (Jared: "get eyeball in reset password section")

  it('hides both password fields until the eye is tapped', async () => {
    render(<Forgot />);
    await requestCode();

    expect(screen.getByTestId('forgotPassword.passwordInput').props.secureTextEntry).toBe(true);
    expect(
      screen.getByTestId('forgotPassword.confirmPasswordInput').props.secureTextEntry,
    ).toBe(true);

    fireEvent.press(screen.getByTestId('forgotPassword.togglePassword'));
    fireEvent.press(screen.getByTestId('forgotPassword.toggleConfirmPassword'));

    expect(screen.getByTestId('forgotPassword.passwordInput').props.secureTextEntry).toBe(false);
    expect(
      screen.getByTestId('forgotPassword.confirmPasswordInput').props.secureTextEntry,
    ).toBe(false);
  });

  it('toggles each password field independently', async () => {
    render(<Forgot />);
    await requestCode();

    fireEvent.press(screen.getByTestId('forgotPassword.togglePassword'));

    // Control: revealing one field must not reveal the other.
    expect(screen.getByTestId('forgotPassword.passwordInput').props.secureTextEntry).toBe(false);
    expect(
      screen.getByTestId('forgotPassword.confirmPasswordInput').props.secureTextEntry,
    ).toBe(true);
  });

  it('re-hides the password when the eye is tapped twice', async () => {
    render(<Forgot />);
    await requestCode();

    fireEvent.press(screen.getByTestId('forgotPassword.togglePassword'));
    fireEvent.press(screen.getByTestId('forgotPassword.togglePassword'));

    expect(screen.getByTestId('forgotPassword.passwordInput').props.secureTextEntry).toBe(true);
  });

  // ── Reset submission

  it('sends the trimmed code and new password, confirms, then returns to login', async () => {
    (ResetPasswordAPI as jest.Mock).mockResolvedValue({ success: 1, data: '' });
    render(<Forgot />);
    await requestCode();
    fillResetForm();

    fireEvent.press(screen.getByTestId('forgotPassword.submitButton'));

    await waitFor(() =>
      expect(ResetPasswordAPI).toHaveBeenCalledWith({
        email: EMAIL,
        code: CODE,
        password: PASSWORD,
      }),
    );
    expect(ShowSuccessToast).toHaveBeenCalledWith(
      'Password updated. Log in with your new password.',
    );
    expect(goBack).toHaveBeenCalled();
  });

  it('surfaces the server error and stays put when the code is rejected', async () => {
    // Control for the success case above: a failed reset must not navigate away.
    (ResetPasswordAPI as jest.Mock).mockResolvedValue({
      success: 0,
      error: 'Verification code expired. Please request a new code.',
    });
    render(<Forgot />);
    await requestCode();
    fillResetForm();

    fireEvent.press(screen.getByTestId('forgotPassword.submitButton'));

    await waitFor(() =>
      expect(ShowErrorToast).toHaveBeenCalledWith(
        'Verification code expired. Please request a new code.',
      ),
    );
    expect(goBack).not.toHaveBeenCalled();
    expect(ShowSuccessToast).not.toHaveBeenCalledWith(
      expect.stringContaining('Password updated'),
    );
  });

  it('blocks submission when the passwords do not match', async () => {
    render(<Forgot />);
    await requestCode();
    fillResetForm(CODE, 'SomethingElse1!');

    fireEvent.press(screen.getByTestId('forgotPassword.submitButton'));

    await waitFor(() =>
      expect(ShowErrorToast).toHaveBeenCalledWith('Passwords do not match'),
    );
    expect(ResetPasswordAPI).not.toHaveBeenCalled();
  });

  it('asks for the code before anything else when it is missing', async () => {
    render(<Forgot />);
    await requestCode();
    fireEvent.changeText(screen.getByTestId('forgotPassword.passwordInput'), PASSWORD);
    fireEvent.changeText(
      screen.getByTestId('forgotPassword.confirmPasswordInput'),
      PASSWORD,
    );

    fireEvent.press(screen.getByTestId('forgotPassword.submitButton'));

    await waitFor(() =>
      expect(ShowErrorToast).toHaveBeenCalledWith('Please enter the code from your email'),
    );
    expect(ResetPasswordAPI).not.toHaveBeenCalled();
  });

  it('strips non-digits so a pasted code still matches', async () => {
    (ResetPasswordAPI as jest.Mock).mockResolvedValue({ success: 1, data: '' });
    render(<Forgot />);
    await requestCode();
    fillResetForm(` ${CODE} `);

    fireEvent.press(screen.getByTestId('forgotPassword.submitButton'));

    await waitFor(() =>
      expect(ResetPasswordAPI).toHaveBeenCalledWith(
        expect.objectContaining({ code: CODE }),
      ),
    );
  });

  // ── Resend (codes expire after 10 minutes)

  it('offers resend only once a code has been requested', async () => {
    render(<Forgot />);

    expect(screen.queryByTestId('forgotPassword.resendButton')).toBeNull();

    await requestCode();

    expect(screen.getByTestId('forgotPassword.resendButton')).toBeOnTheScreen();
  });

  it('requests a fresh code and clears the stale one on resend', async () => {
    render(<Forgot />);
    await requestCode();
    fireEvent.changeText(screen.getByTestId('forgotPassword.codeInput'), '111111');

    fireEvent.press(screen.getByTestId('forgotPassword.resendButton'));

    await waitFor(() => expect(ForgotAPI).toHaveBeenCalledTimes(2));
    expect(ForgotAPI).toHaveBeenLastCalledWith(EMAIL);
    // The old code is invalid server-side, so leaving it in the box would
    // guarantee a confusing "incorrect code" on the next attempt.
    expect(screen.getByTestId('forgotPassword.codeInput').props.value).toBe('');
  });

  it('tells the user where the code went', async () => {
    render(<Forgot />);
    await requestCode();

    expect(screen.getByTestId('forgotPassword.codeSentNotice')).toHaveTextContent(
      `We sent a 6-digit code to ${EMAIL}. It expires in 10 minutes.`,
    );
  });

  // ── The ambiguous secondary button Jared asked about

  it('labels the secondary button "Back to Login" and goes back', () => {
    render(<Forgot />);

    fireEvent.press(screen.getByTestId('forgotPassword.backButton'));

    expect(screen.getByText('Back to Login')).toBeOnTheScreen();
    expect(goBack).toHaveBeenCalled();
  });
});
