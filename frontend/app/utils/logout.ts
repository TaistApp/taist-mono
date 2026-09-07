import { router } from 'expo-router';

import { hideLoading as hideHomeLoading } from '../reducers/home_loading_slice';
import { hideLoading } from '../reducers/loadingSlice';
import { store } from '../store';
import { ClearStorage } from './storage';

/**
 * The one way out of a signed-in session.
 *
 * Every caller used to do its own subset of this, and the drawer's version
 * left the global progress overlay up: whatever screen you logged out from
 * could have a showLoading() in flight, and the splash screen it lands on
 * never clears it — so the app looked permanently busy and you couldn't sign
 * in as anyone else. Clearing both loading flags first, then resetting the
 * store, then dismissing the whole stack keeps the next sign-in interactive.
 */
export const performLogout = async () => {
  store.dispatch(hideLoading());
  store.dispatch(hideHomeLoading());
  store.dispatch({ type: 'USER_LOGOUT' });

  // Drop the signed-in stack rather than replacing only its top card, so no
  // authorised screen stays mounted behind the splash re-fetching as the
  // old user.
  try {
    router.dismissAll();
  } catch {
    // dismissAll throws when there is nothing to dismiss; replace still runs.
  }
  router.replace('/screens/common/splash' as any);

  await ClearStorage();
};
