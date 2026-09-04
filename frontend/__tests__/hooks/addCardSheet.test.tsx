import { renderHook } from '@testing-library/react-native';

import { useAddCardSheet } from '../../app/hooks/useAddCardSheet';
import { AddPaymentMethodAPI, CreateSetupIntentAPI } from '../../app/services/api';

const mockInitPaymentSheet = jest.fn();
const mockPresentPaymentSheet = jest.fn();

jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    initPaymentSheet: mockInitPaymentSheet,
    presentPaymentSheet: mockPresentPaymentSheet,
  }),
}));

jest.mock('../../app/services/api', () => ({
  CreateSetupIntentAPI: jest.fn(),
  AddPaymentMethodAPI: jest.fn(),
}));

const mockCreateSetupIntent = CreateSetupIntentAPI as jest.Mock;
const mockAddPaymentMethod = AddPaymentMethodAPI as jest.Mock;

const SELF: any = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@taist.app',
  zip: '46038',
};

const present = () => renderHook(() => useAddCardSheet()).result.current.presentAddCardSheet;

beforeEach(() => {
  jest.clearAllMocks();
  mockInitPaymentSheet.mockResolvedValue({});
  mockPresentPaymentSheet.mockResolvedValue({});
  mockCreateSetupIntent.mockResolvedValue({
    success: 1,
    data: { client_secret: 'seti_1_secret_abc', setup_intent_id: 'seti_1' },
  });
  mockAddPaymentMethod.mockResolvedValue({
    success: 1,
    data: [
      { id: 4, active: 0, last4: '1111' },
      { id: 5, active: 1, last4: '4242', card_type: 'Visa' },
    ],
  });
});

describe('useAddCardSheet', () => {
  it('opens the native sheet with the SetupIntent and saves the confirmed card', async () => {
    const result = await present()(SELF);

    expect(mockInitPaymentSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantDisplayName: 'Taist',
        setupIntentClientSecret: 'seti_1_secret_abc',
      }),
    );
    // The card itself never reaches us — only the intent id goes back.
    expect(mockAddPaymentMethod).toHaveBeenCalledWith({ setup_intent_id: 'seti_1' });
    expect(result).toEqual({
      status: 'added',
      paymentMethod: { id: 5, active: 1, last4: '4242', card_type: 'Visa' },
    });
  });

  it('prefills billing details from the signed-in customer', async () => {
    await present()(SELF);

    expect(mockInitPaymentSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultBillingDetails: {
          name: 'Ada Lovelace',
          email: 'ada@taist.app',
          address: { country: 'US', postalCode: '46038' },
        },
      }),
    );
  });

  it('treats dismissing the sheet as a cancel, not an error', async () => {
    mockPresentPaymentSheet.mockResolvedValue({ error: { code: 'Canceled', message: 'dismissed' } });

    expect(await present()(SELF)).toEqual({ status: 'cancelled' });
    expect(mockAddPaymentMethod).not.toHaveBeenCalled();
  });

  it('reports a real sheet failure', async () => {
    mockPresentPaymentSheet.mockResolvedValue({ error: { code: 'Failed', message: 'Card declined' } });

    expect(await present()(SELF)).toEqual({ status: 'failed', message: 'Card declined' });
    expect(mockAddPaymentMethod).not.toHaveBeenCalled();
  });

  it('never opens the sheet when the SetupIntent cannot be created', async () => {
    mockCreateSetupIntent.mockResolvedValue({ success: 0, error: 'Stripe is down' });

    expect(await present()(SELF)).toEqual({ status: 'failed', message: 'Stripe is down' });
    expect(mockInitPaymentSheet).not.toHaveBeenCalled();
  });

  it('surfaces a save failure after the card was confirmed', async () => {
    mockAddPaymentMethod.mockResolvedValue({ success: 0, error: 'Could not save that card' });

    expect(await present()(SELF)).toEqual({
      status: 'failed',
      message: 'Could not save that card',
    });
  });
});
