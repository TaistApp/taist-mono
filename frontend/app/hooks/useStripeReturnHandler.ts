import { useEffect, useRef } from 'react';
import { Linking, AppState, AppStateStatus } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { GetPaymentMethodAPI } from '../services/api';
import { ShowSuccessToast, ShowErrorToast } from '../utils/toast';
import { useAppSelector } from './useRedux';
import { store } from '../store';
import { updateChefPaymentMthod } from '../reducers/chefSlice';

/**
 * Hook to handle Stripe account setup completion and return flow
 *
 * This hook manages two return scenarios:
 * 1. Deep Link Return (Primary): When Stripe redirects back via taistexpo:// URL
 * 2. App State Return (Fallback): When chef manually switches back to app
 *
 * The hook automatically refreshes payment status and navigates chef to Home tab
 * when Stripe verification is detected as complete.
 */
export const useStripeReturnHandler = () => {
  const router = useRouter();
  const segments = useSegments();
  const appState = useRef(AppState.currentState);
  const isHandlingDeepLink = useRef(false);

  // Get current payment method from Redux to check status
  const payment = useAppSelector((state) => state.chef.paymentMehthod);

  useEffect(() => {
    /**
     * Handler for deep link URLs (Primary return path)
     * Triggered when Stripe redirects back to app via taistexpo:// scheme
     */
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;

      // Check if this is a Stripe return URL
      if (url.includes('stripe-complete') || url.includes('stripe-refresh')) {
        if (isHandlingDeepLink.current) {
          // Prevent duplicate handling
          console.log('[StripeReturn] Already handling deep link, skipping...');
          return;
        }

        isHandlingDeepLink.current = true;
        const isSuccess = url.includes('stripe-complete');

        console.log('[StripeReturn] Deep link detected:', isSuccess ? 'success' : 'incomplete');

        try {
          // Refresh payment status from backend
          const resp = await GetPaymentMethodAPI();

          if (resp.success === 1 && resp.data) {
            // Find active payment method and update Redux
            const activePayment = resp.data.find((x: any) => x.active == 1);
            if (activePayment) {
              store.dispatch(updateChefPaymentMthod(activePayment));

              // Navigate to home tab (replace to clear stack)
              router.replace('/screens/chef/(tabs)/home' as any);

              // Show appropriate feedback based on verification status
              if (activePayment.verification_complete) {
                ShowSuccessToast('Stripe account verified!');
              } else if (isSuccess) {
                ShowSuccessToast('Stripe setup saved. Verification may take a few minutes.');
              } else {
                ShowErrorToast('Please complete your Stripe verification');
              }
            }
          } else {
            throw new Error('Failed to fetch payment methods');
          }
        } catch (error) {
          console.error('[StripeReturn] Failed to refresh payment status:', error);
          ShowErrorToast('Failed to update payment status');
        } finally {
          // Reset flag after a delay
          setTimeout(() => {
            isHandlingDeepLink.current = false;
          }, 2000);
        }
      }
    };

    /**
     * Handler for app state changes (Fallback return path)
     * Triggered when app comes to foreground (e.g., chef manually switches back)
     */
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const wasInBackground = appState.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      // App just came to foreground
      if (wasInBackground && isNowActive) {
        // Skip if we're already handling a deep link
        if (isHandlingDeepLink.current) {
          console.log('[StripeReturn] Deep link in progress, skipping app state handler');
          return;
        }

        // Check if we're on a screen related to Stripe setup. The dialog
        // launches from the chef Home tab, so any chef-home/tabs route counts.
        const isOnStripeFlow = segments.some(seg =>
          seg === 'home' || seg === '(tabs)'
        );

        if (isOnStripeFlow && payment?.stripe_account_id) {
          console.log('[StripeReturn] App resumed, checking payment status...');

          try {
            // Store previous verification status
            const wasVerified = payment?.verification_complete;

            // Small delay to allow Stripe to process (if they just completed)
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Refresh payment status
            const resp = await GetPaymentMethodAPI();

            if (resp.success === 1 && resp.data) {
              const activePayment = resp.data.find((x: any) => x.active == 1);

              if (activePayment) {
                store.dispatch(updateChefPaymentMthod(activePayment));

                // Check if verification status changed from incomplete to complete
                if (activePayment.verification_complete && !wasVerified) {
                  console.log('[StripeReturn] Verification just completed!');
                  router.replace('/screens/chef/(tabs)/home' as any);
                  ShowSuccessToast('Stripe account verified!');
                } else if (activePayment.verification_complete) {
                  console.log('[StripeReturn] Verification already complete');
                } else {
                  console.log('[StripeReturn] Stripe account pending verification');
                }
              }
            }
          } catch (error) {
            console.error('[StripeReturn] Failed to check payment status on app resume:', error);
            // Silent failure - don't interrupt user experience
          }
        }
      }

      appState.current = nextAppState;
    };

    // Subscribe to deep link events
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    // Subscribe to app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Check if app was opened via deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[StripeReturn] App opened with URL:', url);
        handleDeepLink({ url });
      }
    });

    // Cleanup subscriptions on unmount
    return () => {
      linkingSubscription.remove();
      appStateSubscription.remove();
    };
  }, [router, segments, payment?.stripe_account_id, payment?.verification_complete]);
};
