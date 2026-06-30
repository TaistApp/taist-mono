import { useEffect } from 'react';
import moment from 'moment';
import { GetChefPublicProfileAPI } from '../services/api';
import { navigate } from '../utils/navigation';
import { ShowErrorToast } from '../utils/toast';
import { store } from '../store';

// Chef ID captured from a taistexpo://chef/{id} deep link before the customer
// stack exists (cold start, or while logged out). Held until auto-login/login
// populates the user, then consumed by the resume subscription below.
let pendingChefId: number | null = null;

/**
 * Record a chef id to open once the customer is authenticated and the
 * authorized navigation stack is mounted. Called by the app/chef/[id].tsx route
 * (the single capture point for the deep link), which then bounces to the
 * splash/auth flow. Resolving the chef here — rather than from the route — means
 * we always navigate from inside the mounted customer stack, avoiding the blank
 * native-splash dead end that came from pushing a tab route too early.
 */
export const setPendingChefId = (chefId: number) => {
  pendingChefId = chefId;
};

export const openChefDeepLink = async (chefId: number) => {
  const resp = await GetChefPublicProfileAPI(chefId);
  if (resp.success !== 1 || !resp.data) {
    ShowErrorToast('Chef not found');
    return;
  }

  const chef = resp.data;
  navigate.toCustomer.chefDetail({
    chefInfo: chef,
    reviews: chef.reviews || [],
    menus: chef.menus || [],
    weekDay: moment().weekday(),
    selectedDate: moment().format('YYYY-MM-DD'),
  });
};

const resumePendingChef = () => {
  if (pendingChefId === null) return;

  const user = store.getState().user?.user;
  if (!user?.id || user.user_type !== 1) return;

  const chefId = pendingChefId;
  pendingChefId = null;

  // The auth flow replaces the navigation stack right after setting the user —
  // wait for that to settle before pushing the chef screen on top.
  setTimeout(() => {
    openChefDeepLink(chefId).catch((error) => {
      console.error('[ChefDeepLink] Error:', error);
      ShowErrorToast('Could not open chef profile');
    });
  }, 500);
};

export const useChefDeepLinkHandler = () => {
  useEffect(() => {
    // Cover the case where auth is already settled by the time this mounts
    // (e.g. a persisted customer auto-logging in before subscribe attaches).
    resumePendingChef();

    // Resume a pending chef deep link once login/auto-login sets the user in
    // the store (which also means the customer authorized stack is mounting).
    const unsubscribe = store.subscribe(resumePendingChef);

    return () => {
      unsubscribe();
    };
  }, []);
};
