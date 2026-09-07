import { router } from 'expo-router';

import { performLogout } from '../../app/utils/logout';
import { store } from '../../app/store';
import { showLoading } from '../../app/reducers/loadingSlice';
import { ClearStorage } from '../../app/utils/storage';

jest.mock('../../app/utils/storage', () => ({
  ClearStorage: jest.fn(() => Promise.resolve()),
}));

/**
 * Logging out from a screen with a request in flight used to leave the global
 * progress overlay up over the splash screen, so the tester could never sign
 * in as their other account.
 */
describe('performLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears a loading overlay that was up when the user signed out', async () => {
    store.dispatch(showLoading());
    expect(store.getState().loading.value).toBe(true);

    await performLogout();

    expect(store.getState().loading.value).toBe(false);
  });

  it('drops the signed-in stack and clears stored credentials', async () => {
    await performLogout();

    expect(router.dismissAll).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/screens/common/splash');
    expect(ClearStorage).toHaveBeenCalledTimes(1);
  });

  it('resets the signed-in user', async () => {
    await performLogout();

    expect(store.getState().user.user).toEqual({});
  });

  // Control: nothing about a normal signed-in session leaves the overlay up,
  // so a logout with no load in flight is still a no-op for the flag.
  it('leaves the overlay hidden when nothing was loading', async () => {
    await performLogout();

    expect(store.getState().loading.value).toBe(false);
  });
});
