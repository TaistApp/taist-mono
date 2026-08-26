// Card entry via Stripe's native Payment Sheet.
//
// The app never sees card data: we ask the backend for a SetupIntent, hand its
// client secret to Stripe's sheet, and post the confirmed intent id back so the
// server can read the resulting PaymentMethod off Stripe and save it.
import { useStripe } from '@stripe/stripe-react-native';
import { useCallback } from 'react';

import { AppColors } from '../../constants/theme';
import { AddPaymentMethodAPI, CreateSetupIntentAPI } from '../services/api';
import { IPayment, IUser } from '../types';

export type AddCardResult =
  | { status: 'added'; paymentMethod?: IPayment }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

/**
 * The sheet is themed to the app rather than the OS: the rest of Taist is
 * light-only, so a system-dark sheet would look like a different app.
 */
const APPEARANCE = {
  colors: {
    primary: AppColors.primary,
    background: AppColors.background,
    componentBackground: AppColors.surfaceVariant,
    componentBorder: AppColors.border,
    componentDivider: AppColors.divider,
    primaryText: AppColors.text,
    secondaryText: AppColors.textSecondary,
    componentText: AppColors.text,
    placeholderText: AppColors.textTertiary,
    icon: AppColors.textSecondary,
    error: AppColors.error,
  },
  shapes: {
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryButton: {
    colors: {
      background: AppColors.primary,
      text: AppColors.textOnPrimary,
      border: AppColors.primary,
    },
    shapes: {
      borderRadius: 28,
    },
  },
} as const;

export const useAddCardSheet = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const presentAddCardSheet = useCallback(
    async (self?: IUser): Promise<AddCardResult> => {
      const intent = await CreateSetupIntentAPI();
      if (intent.success !== 1 || !intent.data?.client_secret) {
        return {
          status: 'failed',
          message: intent.error ?? intent.message ?? 'Could not start card setup',
        };
      }

      const fullName = [self?.first_name, self?.last_name].filter(Boolean).join(' ');
      const init = await initPaymentSheet({
        merchantDisplayName: 'Taist',
        setupIntentClientSecret: intent.data.client_secret,
        style: 'alwaysLight',
        returnURL: 'taistexpo://stripe-redirect',
        primaryButtonLabel: 'Save card',
        appearance: APPEARANCE,
        defaultBillingDetails: {
          name: fullName || undefined,
          email: self?.email || undefined,
          address: {
            country: 'US',
            postalCode: self?.zip ? String(self.zip) : undefined,
          },
        },
      });
      if (init.error) {
        return { status: 'failed', message: init.error.message };
      }

      const { error } = await presentPaymentSheet();
      if (error) {
        // Backing out of the sheet is a normal action, not a failure.
        if (error.code === 'Canceled') return { status: 'cancelled' };
        return { status: 'failed', message: error.message };
      }

      const saved = await AddPaymentMethodAPI({
        setup_intent_id: intent.data.setup_intent_id,
      });
      if (saved.success !== 1) {
        return {
          status: 'failed',
          message: saved.error ?? saved.message ?? 'Could not save that card',
        };
      }

      return {
        status: 'added',
        paymentMethod: saved.data?.find((x: IPayment) => x.active == 1),
      };
    },
    [initPaymentSheet, presentPaymentSheet],
  );

  return { presentAddCardSheet };
};
