import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import moment from 'moment';
import { GetChefPublicProfileAPI } from '../services/api';
import { navigate } from '../utils/navigation';
import { ShowErrorToast } from '../utils/toast';
import { store } from '../store';

// Chef ID from a deep link that arrived while the user was logged out.
// Held until authentication completes (login or signup), then consumed.
let pendingChefId: number | null = null;

const openChefDetail = async (chefId: number) => {
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

export const useChefDeepLinkHandler = () => {
  const isHandling = useRef(false);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      const match = url.match(/taistexpo:\/\/chef\/(\d+)/);
      if (!match) return;

      if (isHandling.current) return;
      isHandling.current = true;

      const chefId = parseInt(match[1], 10);

      try {
        const state = store.getState();
        const isAuthenticated = !!state.user?.user?.id;

        if (!isAuthenticated) {
          // Remember the target so we can finish the navigation after auth.
          pendingChefId = chefId;
          navigate.toCommon.login();
          return;
        }

        await openChefDetail(chefId);
      } catch (error) {
        console.error('[ChefDeepLink] Error:', error);
        ShowErrorToast('Could not open chef profile');
      } finally {
        setTimeout(() => {
          isHandling.current = false;
        }, 2000);
      }
    };

    // Resume a pending deep link once login/signup sets the user in the store.
    const unsubscribe = store.subscribe(() => {
      if (pendingChefId === null) return;

      const isAuthenticated = !!store.getState().user?.user?.id;
      if (!isAuthenticated) return;

      const chefId = pendingChefId;
      pendingChefId = null;

      // The auth screen replaces the navigation stack right after setting the
      // user — wait for that to settle before pushing the chef screen on top.
      setTimeout(() => {
        openChefDetail(chefId).catch((error) => {
          console.error('[ChefDeepLink] Error:', error);
          ShowErrorToast('Could not open chef profile');
        });
      }, 500);
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, []);
};
