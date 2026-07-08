import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { GetPaymentMethodAPI } from './services/api';
import { ShowErrorToast } from './utils/toast';
import { store } from './store';
import { updateChefPaymentMthod } from './reducers/chefSlice';
import { AppColors } from '../constants/theme';

/**
 * Route handler for Stripe refresh deep links
 * Catches taistexpo://stripe-refresh URLs (when user needs to retry setup)
 * and redirects to the appropriate screen
 */
export default function StripeRefreshScreen() {
  const router = useRouter();

  useEffect(() => {
    const handleStripeRefresh = async () => {
      console.log('[StripeRefresh] Handling refresh return');

      try {
        // Refresh payment status from backend
        const resp = await GetPaymentMethodAPI();

        if (resp.success === 1 && resp.data) {
          const activePayment = resp.data.find((x: any) => x.active == 1);
          if (activePayment) {
            store.dispatch(updateChefPaymentMthod(activePayment));
          }
        }
      } catch (error) {
        console.error('[StripeRefresh] Failed to refresh payment status:', error);
      }

      ShowErrorToast('Please complete your Stripe verification');

      // Navigate to chef home tab (replace to clear this screen from stack)
      router.replace('/screens/chef/(tabs)/home' as any);
    };

    handleStripeRefresh();
  }, [router]);

  // Show loading indicator while processing
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
