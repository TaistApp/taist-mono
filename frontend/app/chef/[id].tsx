import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { store } from '../store';
import { isAuthorizedStackReady } from '../utils/navigation';
import { setPendingChefId, openChefDeepLink } from '../hooks/useChefDeepLinkHandler';
import { ShowErrorToast } from '../utils/toast';
import { AppColors } from '../../constants/theme';

/**
 * Capture screen for taistexpo://chef/{id} (the "Open in Taist" deep link from
 * the shareable web menu preview). Expo Router routes both cold-start and warm
 * deep links here.
 *
 * Previously this screen tried to push the customer chef-detail tab route
 * directly. On a cold start the customer stack isn't mounted yet and auto-login
 * hasn't run, so that push went nowhere and the native (orange) splash never
 * hid — leaving the user staring at a blank orange screen.
 *
 * Now it:
 *   1. hides the native splash immediately, so we never sit on orange, and
 *   2. opens chef detail directly when the customer stack is already up (warm
 *      link), otherwise stashes the chef id and bounces to the entry screen so
 *      the normal splash/auto-login flow can mount the stack and then resume
 *      into chef detail (handled by useChefDeepLinkHandler).
 */
export default function ChefDeepLinkScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    // Kill the native splash so a blocked navigation never strands the user on
    // a blank orange screen.
    SplashScreen.hideAsync().catch(() => {});

    const raw = Array.isArray(id) ? id[0] : id;
    const chefId = parseInt(raw ?? '', 10);

    if (!chefId || Number.isNaN(chefId)) {
      router.replace('/' as any);
      return;
    }

    const user = store.getState().user?.user;
    const isCustomer = user?.user_type === 1;

    // A chef tapping a shared chef link used to land silently back on their own
    // dashboard: the id was stashed for later, but resumePendingChef only fires
    // for customers, so it was never consumed and auto-login simply restored
    // the chef session. Say so instead of appearing to ignore the link.
    if (user?.id && !isCustomer) {
      ShowErrorToast(
        'Chef profiles open in a customer account. Log in as a customer to view this chef.',
      );
      router.replace('/' as any);
      return;
    }

    if (isAuthorizedStackReady() && isCustomer) {
      // Warm link: the customer tab stack is already mounted, open directly.
      openChefDeepLink(chefId).catch(() => {
        setPendingChefId(chefId);
        router.replace('/' as any);
      });
      return;
    }

    // Cold start or logged out: defer to the splash + auto-login flow, which
    // resumes into chef detail once the authorized stack exists.
    setPendingChefId(chefId);
    router.replace('/' as any);
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
