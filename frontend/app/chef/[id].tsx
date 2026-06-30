import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import moment from 'moment';
import { GetChefPublicProfileAPI } from '../services/api';
import { ShowErrorToast } from '../utils/toast';
import { store } from '../store';
import { AppColors } from '../../constants/theme';

/**
 * Deep-link handler for taistexpo://chef/{id}.
 *
 * The shareable "Order from my menu on Taist!" link points at the web landing
 * page (/chef/{id}), which bounces into the app via this scheme. Without a route
 * here Expo Router renders its "Unmatched Route" screen, so we resolve the chef
 * by id and forward to the customer chef-detail screen.
 *
 * Only a signed-in customer can open chef detail (it lives in the customer tab
 * stack). Anyone else — logged out, a chef account, or a cold start before
 * auto-login has populated Redux — is sent to the entry screen instead of a
 * dead end.
 */
export default function ChefDeepLinkScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    const handleChefLink = async () => {
      const raw = Array.isArray(id) ? id[0] : id;
      const chefId = parseInt(raw ?? '', 10);

      if (!chefId || Number.isNaN(chefId)) {
        router.replace('/' as any);
        return;
      }

      const user = store.getState().user.user;
      const isCustomer = user?.user_type === 1;

      if (!isCustomer) {
        // Not a signed-in customer — land on the entry screen rather than a
        // customer-only tab route that would mount without context.
        router.replace('/' as any);
        return;
      }

      const resp = await GetChefPublicProfileAPI(chefId);
      if (resp?.success === 1 && resp.data) {
        const chef = resp.data;
        const today = moment();
        router.replace({
          pathname: '/screens/customer/(tabs)/(home)/chefDetail',
          params: {
            chefInfo: JSON.stringify(chef),
            reviews: JSON.stringify(chef.reviews ?? []),
            menus: JSON.stringify(chef.menus ?? []),
            weekDay: today.weekday().toString(),
            selectedDate: today.format('YYYY-MM-DD'),
          },
        } as any);
      } else {
        ShowErrorToast(resp?.error ?? 'Could not open this chef.');
        router.replace('/screens/customer/(tabs)/(home)' as any);
      }
    };

    handleChefLink();
  }, [id]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={AppColors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
});
