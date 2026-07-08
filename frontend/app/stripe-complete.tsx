import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GetPaymentMethodAPI } from './services/api';
import { ShowSuccessToast, ShowErrorToast } from './utils/toast';
import { store } from './store';
import { updateChefPaymentMthod } from './reducers/chefSlice';
import { AppColors } from '../constants/theme';

/**
 * Route handler for Stripe return deep links
 * Catches taistexpo://stripe-complete?status=success URLs
 * and redirects to the appropriate screen after updating payment status
 */
export default function StripeCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleStripeReturn = async () => {
      const isSuccess = params.status === 'success';
      console.log('[StripeComplete] Handling return, status:', params.status);

      try {
        // Refresh payment status from backend
        const resp = await GetPaymentMethodAPI();

        if (resp.success === 1 && resp.data) {
          const activePayment = resp.data.find((x: any) => x.active == 1);

          if (activePayment) {
            store.dispatch(updateChefPaymentMthod(activePayment));

            // Show appropriate feedback based on verification status
            if (activePayment.verification_complete) {
              ShowSuccessToast('Stripe account verified!');
            } else if (isSuccess) {
              ShowSuccessToast('Stripe setup saved. Verification may take a few minutes.');
            } else {
              ShowErrorToast('Please complete your Stripe verification');
            }
          }
        }
      } catch (error) {
        console.error('[StripeComplete] Failed to refresh payment status:', error);
        ShowErrorToast('Failed to update payment status');
      }

      // Navigate to chef home tab (replace to clear this screen from stack)
      router.replace('/screens/chef/(tabs)/home' as any);
    };

    handleStripeReturn();
  }, [params.status, router]);

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
