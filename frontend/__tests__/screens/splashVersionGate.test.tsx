import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import Splash from '../../app/screens/common/splash/index';
import { GETVERSIONAPICALL, ResumeSessionAPI, LoginAPI } from '../../app/services/api';
import { ReadLoginData } from '../../app/utils/storage';

/**
 * The version gate used to be a bare `return`.
 *
 * When the installed build fell below MIN_VERSION it logged a line and
 * returned — never setting `isOutdated`, never clearing `splash`. The 35s
 * fallback timer that would otherwise have dropped the user onto the login
 * screen is cleared by autoLogin()'s own `.finally()`, so nothing reset the
 * screen at all: the app sat on the branded orange splash indefinitely, with
 * no message, no Update button, and no way forward. The entire "Update
 * Required" block below the gate was unreachable dead code.
 *
 * That is not a cosmetic bug. Raising MIN_VERSION silently bricked every user
 * still on an older build — a chef could not get into the app to accept a live
 * order, which then expired on the 30-minute timer and auto-refunded the
 * customer.
 */

jest.mock('../../app/services/api', () => ({
  GETVERSIONAPICALL: jest.fn(),
  LoginAPI: jest.fn(),
  ResumeSessionAPI: jest.fn(),
  SocialLoginAPI: jest.fn(),
}));

jest.mock('../../app/utils/storage', () => ({
  ReadLoginData: jest.fn(),
  ClearStorage: jest.fn(),
}));

jest.mock('../../app/utils/navigation', () => ({
  navigate: {
    toCommon: { login: jest.fn(), completeLocation: jest.fn() },
    toChef: { home: jest.fn() },
    toCustomer: { home: jest.fn() },
    toAuthorizedStacks: {
      customerAuthorized: jest.fn(),
      chefAuthorized: jest.fn(),
    },
  },
}));

jest.mock('../../app/utils/pendingDeepLink', () => ({
  runPendingDeepLink: jest.fn(),
}));

jest.mock('../../app/hooks/useRedux', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (selector: any) => selector({ user: { user: {} } }),
}));

jest.mock('../../app/services/socialAuth', () => ({
  SocialAuthCancelled: class SocialAuthCancelled extends Error {},
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { CONTINUE: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 0 },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    nativeAppVersion: '32.4.4',
    expoConfig: { version: '32.4.4', extra: { APP_ENV: 'production' } },
  },
}));

const mockedGetVersion = GETVERSIONAPICALL as jest.Mock;
const mockedReadLoginData = ReadLoginData as jest.Mock;
const mockedResumeSession = ResumeSessionAPI as jest.Mock;
const mockedLogin = LoginAPI as jest.Mock;

const versionResponse = (version: string) => ({
  success: 1,
  data: [{ version }],
});

beforeEach(() => {
  jest.clearAllMocks();
  // A signed-in returning user, so autoLogin actually runs.
  mockedReadLoginData.mockResolvedValue({
    email: 'josesalvador66@gmail.com',
    password: 'hunter2',
  });
  mockedLogin.mockResolvedValue({ success: 1, data: { user: { user_type: 2 } } });
  mockedResumeSession.mockResolvedValue({ success: 1, data: { user: { user_type: 2 } } });
});

describe('splash version gate', () => {
  it('shows the update screen when the build is below MIN_VERSION', async () => {
    // The regression: installed 32.4.4, MIN_VERSION raised to 32.4.7.
    mockedGetVersion.mockResolvedValue(versionResponse('32.4.7'));

    render(<Splash />);

    await waitFor(
      () => {
        expect(
          screen.getByText(/Update required/i),
        ).toBeTruthy();
      },
      { timeout: 5000 },
    );

    // And it must offer a way out, not just a message.
    expect(screen.getByText('Update Now')).toBeTruthy();
    expect(screen.getByText('I Already Updated')).toBeTruthy();
  });

  it('does not strand the user on the splash screen when outdated', async () => {
    mockedGetVersion.mockResolvedValue(versionResponse('32.4.7'));

    render(<Splash />);

    await waitFor(
      () => {
        expect(screen.getByText('Update Now')).toBeTruthy();
      },
      { timeout: 5000 },
    );

    // Never auto-login an outdated build.
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  /** Control: an up-to-date build must pass through and log in as normal. */
  it('logs in normally when the build meets MIN_VERSION', async () => {
    mockedGetVersion.mockResolvedValue(versionResponse('32.4.4'));

    render(<Splash />);

    await waitFor(
      () => {
        expect(mockedLogin).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );

    expect(screen.queryByText('Update Now')).toBeNull();
  });

  /** Control: a build NEWER than MIN_VERSION must not be blocked. */
  it('does not block a build newer than MIN_VERSION', async () => {
    mockedGetVersion.mockResolvedValue(versionResponse('32.0.0'));

    render(<Splash />);

    await waitFor(
      () => {
        expect(mockedLogin).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );

    expect(screen.queryByText('Update Now')).toBeNull();
  });
});
