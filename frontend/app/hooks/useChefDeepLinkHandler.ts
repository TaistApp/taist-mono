import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import moment from 'moment';
import { GetChefPublicProfileAPI } from '../services/api';
import { navigate } from '../utils/navigation';
import { ShowErrorToast } from '../utils/toast';
import { store } from '../store';

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
          navigate.toCommon.login();
          return;
        }

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
      } catch (error) {
        console.error('[ChefDeepLink] Error:', error);
        ShowErrorToast('Could not open chef profile');
      } finally {
        setTimeout(() => {
          isHandling.current = false;
        }, 2000);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
};
