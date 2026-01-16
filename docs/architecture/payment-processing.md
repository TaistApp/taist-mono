# Payment Processing Architecture

Complete documentation of Stripe integration for customer payments, chef payouts, refunds, and tips.

---

## Table of Contents

1. [Overview](#overview)
2. [Stripe Integration](#stripe-integration)
3. [Customer Payment Flow](#customer-payment-flow)
4. [Chef Payout Flow](#chef-payout-flow)
5. [Refund Processing](#refund-processing)
6. [Tip Processing](#tip-processing)
7. [Payment Methods Management](#payment-methods-management)
8. [Discount Code Integration](#discount-code-integration)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)

---

## Overview

Taist uses **Stripe** for all payment processing:

- **Stripe Payments** - Customer card payments
- **Stripe Connect** - Chef payout accounts
- **Stripe Elements** - Secure card input (React Native)

**Payment Flow Summary:**
1. Customer adds payment method (card)
2. Customer places order → PaymentIntent created (hold funds)
3. Chef accepts → Payment captured
4. Chef completes delivery → Funds transferred to chef's Connect account
5. If cancelled → Full refund issued

**Related Files:**
- Controller: `backend/app/Http/Controllers/MapiController.php`
- Frontend: `frontend/app/screens/customer/checkout/`
- Frontend: `frontend/app/screens/chef/setupStrip/`

---

## Stripe Integration

### Environment Configuration

```env
# .env file
STRIPE_KEY=sk_live_...           # Secret key
STRIPE_PUBLISHABLE_KEY=pk_live_... # Publishable key (frontend)
STRIPE_WEBHOOK_SECRET=whsec_...    # Webhook signing secret
```

### Initialization (Backend)

```php
// In MapiController
include $_SERVER['DOCUMENT_ROOT'] . '/include/config.php';
require_once('../stripe-php/init.php');

$stripe = new \Stripe\StripeClient($stripe_key);
```

### Frontend Setup (React Native)

```typescript
// Using @stripe/stripe-react-native
import { StripeProvider } from '@stripe/stripe-react-native';

<StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
  <App />
</StripeProvider>
```

---

## Customer Payment Flow

### Step 1: Add Payment Method

Customer saves a card for future use.

**Frontend:**
```typescript
// frontend/app/services/api.ts
export const AddPaymentMethodAPI = async (params: {
  stripe_token: string;
  user_id: number;
}) => {
  return await POST('/add_payment_method', params);
};
```

**Backend:**
```php
// MapiController@addPaymentMethod
public function addPaymentMethod(Request $request)
{
    $customer = Listener::find($request->user_id);

    // Create or get Stripe customer
    if (!$customer->stripe_customer_id) {
        $stripeCustomer = $stripe->customers->create([
            'email' => $customer->email,
            'name' => $customer->first_name . ' ' . $customer->last_name,
        ]);
        $customer->stripe_customer_id = $stripeCustomer->id;
        $customer->save();
    }

    // Attach payment method to customer
    $paymentMethod = $stripe->paymentMethods->attach(
        $request->stripe_token,
        ['customer' => $customer->stripe_customer_id]
    );

    // Set as default
    $stripe->customers->update($customer->stripe_customer_id, [
        'invoice_settings' => [
            'default_payment_method' => $paymentMethod->id,
        ],
    ]);

    return response()->json([
        'success' => true,
        'data' => $paymentMethod,
    ]);
}
```

### Step 2: Create Order with Payment Intent

When customer submits order, a PaymentIntent is created to authorize (hold) funds.

**Backend:**
```php
// MapiController@createPaymentIntent
public function createPaymentIntent(Request $request)
{
    $order = Orders::find($request->order_id);
    $customer = Listener::find($order->customer_user_id);
    $chef = Listener::find($order->chef_user_id);

    // Calculate amount in cents
    $amountCents = (int)($order->total_price * 100);

    // Calculate platform fee (e.g., 15%)
    $platformFee = (int)($amountCents * 0.15);

    // Create PaymentIntent with transfer to chef
    $paymentIntent = $stripe->paymentIntents->create([
        'amount' => $amountCents,
        'currency' => 'usd',
        'customer' => $customer->stripe_customer_id,
        'payment_method' => $request->payment_method_id,
        'confirmation_method' => 'manual',
        'confirm' => true,
        'capture_method' => 'manual', // Authorize only, capture later
        'transfer_data' => [
            'destination' => $chef->stripe_account_id,
        ],
        'application_fee_amount' => $platformFee,
        'metadata' => [
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'chef_id' => $chef->id,
        ],
    ]);

    // Store payment intent ID
    $order->payment_token = $paymentIntent->id;
    $order->save();

    return response()->json([
        'success' => true,
        'data' => [
            'client_secret' => $paymentIntent->client_secret,
            'payment_intent_id' => $paymentIntent->id,
            'status' => $paymentIntent->status,
        ],
    ]);
}
```

### Step 3: Capture Payment (Chef Accepts)

When chef accepts order, funds are captured.

**Backend:**
```php
// MapiController@completeOrderPayment
public function completeOrderPayment(Request $request)
{
    $order = Orders::find($request->order_id);

    // Capture the held funds
    $paymentIntent = $stripe->paymentIntents->capture(
        $order->payment_token
    );

    return response()->json([
        'success' => true,
        'data' => $paymentIntent,
    ]);
}
```

### Payment Flow Diagram

```
┌──────────┐     ┌─────────┐     ┌────────┐     ┌────────┐
│ Customer │     │  Taist  │     │ Stripe │     │  Chef  │
└────┬─────┘     └────┬────┘     └───┬────┘     └───┬────┘
     │                │              │              │
     │ Add Card       │              │              │
     │───────────────>│              │              │
     │                │ Create PM    │              │
     │                │─────────────>│              │
     │                │              │              │
     │ Place Order    │              │              │
     │───────────────>│              │              │
     │                │ PaymentIntent│              │
     │                │ (authorize)  │              │
     │                │─────────────>│              │
     │                │     Hold $   │              │
     │                │<─────────────│              │
     │                │              │              │
     │                │ Notify Chef  │              │
     │                │─────────────────────────────>
     │                │              │              │
     │                │              │  Accept      │
     │                │<─────────────────────────────
     │                │              │              │
     │                │ Capture $    │              │
     │                │─────────────>│              │
     │                │              │  Transfer   │
     │                │              │─────────────>│
     │                │              │              │
```

---

## Chef Payout Flow

### Stripe Connect Onboarding

Chefs must set up a Stripe Connect account to receive payouts.

**Frontend Screen:** `frontend/app/screens/chef/setupStrip/`

**Backend:**
```php
// MapiController@addStripeAccount
public function addStripeAccount(Request $request)
{
    $chef = Listener::find($request->user_id);

    // Create Connect account
    $account = $stripe->accounts->create([
        'type' => 'express',
        'country' => 'US',
        'email' => $chef->email,
        'capabilities' => [
            'card_payments' => ['requested' => true],
            'transfers' => ['requested' => true],
        ],
        'business_type' => 'individual',
        'individual' => [
            'first_name' => $chef->first_name,
            'last_name' => $chef->last_name,
            'email' => $chef->email,
            'phone' => $chef->phone,
        ],
    ]);

    // Save account ID
    $chef->stripe_account_id = $account->id;
    $chef->save();

    // Create onboarding link
    $accountLink = $stripe->accountLinks->create([
        'account' => $account->id,
        'refresh_url' => config('app.url') . '/chef/stripe/refresh',
        'return_url' => config('app.url') . '/chef/stripe/return',
        'type' => 'account_onboarding',
    ]);

    return response()->json([
        'success' => true,
        'data' => [
            'account_id' => $account->id,
            'onboarding_url' => $accountLink->url,
        ],
    ]);
}
```

### Payout Distribution

When payment is captured, Stripe automatically transfers to chef's account (minus platform fee).

**Calculation:**
```
Order Total:         $30.00
Platform Fee (15%):  -$4.50
Stripe Fee (~2.9%):  -$0.87
─────────────────────────────
Chef Receives:       $24.63
```

### Checking Payout Status

```php
// Get account balance
$balance = $stripe->balance->retrieve([], [
    'stripe_account' => $chef->stripe_account_id,
]);

// Get payout history
$payouts = $stripe->payouts->all([
    'limit' => 10,
], [
    'stripe_account' => $chef->stripe_account_id,
]);
```

---

## Refund Processing

### Full Refund (Cancellation)

```php
// MapiController@cancelOrderPayment
public function cancelOrderPayment(Request $request)
{
    $order = Orders::find($request->order_id);

    // Create refund
    $refund = $stripe->refunds->create([
        'payment_intent' => $order->payment_token,
        'amount' => $order->total_price * 100, // Full amount in cents
    ]);

    // Update order
    $order->update([
        'status' => 4, // Cancelled
        'refund_amount' => $order->total_price,
        'refund_percentage' => 100,
        'refund_processed_at' => now(),
        'refund_stripe_id' => $refund->id,
    ]);

    return response()->json([
        'success' => true,
        'data' => $refund,
    ]);
}
```

### Chef Rejection Refund

```php
// MapiController@rejectOrderPayment
public function rejectOrderPayment(Request $request)
{
    $order = Orders::find($request->order_id);

    // Cancel the PaymentIntent (releases hold)
    $paymentIntent = $stripe->paymentIntents->cancel(
        $order->payment_token
    );

    $order->update([
        'status' => 5, // Rejected
        'cancelled_by_role' => 'chef',
    ]);

    return response()->json([
        'success' => true,
    ]);
}
```

### Automatic Expiration Refund

See `ProcessExpiredOrders` command in [Order Management](./order-management.md).

---

## Tip Processing

Tips can be added after order completion.

**Backend:**
```php
// MapiController@tipOrderPayment
public function tipOrderPayment(Request $request)
{
    $order = Orders::find($request->order_id);
    $customer = Listener::find($order->customer_user_id);
    $chef = Listener::find($order->chef_user_id);

    $tipCents = (int)($request->tip_amount * 100);

    // Create separate charge for tip
    $tipPayment = $stripe->paymentIntents->create([
        'amount' => $tipCents,
        'currency' => 'usd',
        'customer' => $customer->stripe_customer_id,
        'payment_method' => $request->payment_method_id,
        'confirm' => true,
        'transfer_data' => [
            'destination' => $chef->stripe_account_id,
        ],
        'application_fee_amount' => 0, // No platform fee on tips
        'metadata' => [
            'type' => 'tip',
            'order_id' => $order->id,
        ],
    ]);

    // Update order with tip
    $order->tip_amount = $request->tip_amount;
    $order->save();

    return response()->json([
        'success' => true,
        'data' => $tipPayment,
    ]);
}
```

**Note:** Tips go 100% to chef (no platform fee).

---

## Payment Methods Management

### Get Saved Cards

```php
// MapiController@getPaymentMethods
public function getPaymentMethods(Request $request)
{
    $customer = Listener::find($request->user_id);

    $paymentMethods = $stripe->paymentMethods->all([
        'customer' => $customer->stripe_customer_id,
        'type' => 'card',
    ]);

    return response()->json([
        'success' => true,
        'data' => $paymentMethods->data,
    ]);
}
```

### Delete Card

```php
// MapiController@deletePaymentMethod
public function deletePaymentMethod(Request $request)
{
    $stripe->paymentMethods->detach($request->payment_method_id);

    return response()->json([
        'success' => true,
    ]);
}
```

---

## Discount Code Integration

Discounts are applied before PaymentIntent creation.

### Validation Flow

```php
// 1. Validate code
$discount = DiscountCodes::where('code', $code)->first();
$validation = $discount->canCustomerUse($customerId);

if (!$validation['valid']) {
    return error($validation['reason']);
}

// 2. Calculate discount
$calculation = $discount->calculateDiscount($subtotal);

// 3. Apply to order
$order->discount_code_id = $discount->id;
$order->discount_code = $code;
$order->discount_amount = $calculation['discount_amount'];
$order->subtotal_before_discount = $subtotal;
$order->total_price = $calculation['final_amount'];

// 4. PaymentIntent uses discounted total
$paymentIntent = $stripe->paymentIntents->create([
    'amount' => $order->total_price * 100, // Discounted amount
    // ...
]);
```

### Discount Types

| Type | Calculation |
|------|-------------|
| `fixed` | Subtract fixed amount ($5 off) |
| `percentage` | Subtract percentage (10% off) |

See [Discount Code System](../features/discount-codes.md) for full documentation.

---

## Error Handling

### Common Stripe Errors

| Error Code | Meaning | Handling |
|------------|---------|----------|
| `card_declined` | Card was declined | Show user-friendly message |
| `expired_card` | Card has expired | Prompt to update card |
| `incorrect_cvc` | CVC is wrong | Ask to re-enter |
| `processing_error` | Temporary issue | Retry after delay |
| `insufficient_funds` | Not enough balance | Different card needed |

### Error Response Example

```php
try {
    $paymentIntent = $stripe->paymentIntents->create([...]);
} catch (\Stripe\Exception\CardException $e) {
    return response()->json([
        'success' => false,
        'error' => $e->getError()->message,
        'code' => $e->getError()->code,
    ], 400);
} catch (\Stripe\Exception\ApiErrorException $e) {
    Log::error('Stripe API error', ['error' => $e->getMessage()]);
    return response()->json([
        'success' => false,
        'error' => 'Payment processing error. Please try again.',
    ], 500);
}
```

---

## Security Considerations

### PCI Compliance

- **Never store raw card numbers** - Use Stripe tokens only
- **Use Stripe Elements** - Card input handled by Stripe SDK
- **HTTPS only** - All payment endpoints require SSL

### Token Security

- Payment tokens are single-use
- PaymentIntent IDs stored, not card details
- Customer IDs map to Stripe customer objects

### Fraud Prevention

- Stripe Radar for fraud detection
- 3D Secure for high-risk transactions
- Address verification (AVS)

### Environment Separation

```env
# Development
STRIPE_KEY=sk_test_...

# Production
STRIPE_KEY=sk_live_...
```

---

## Testing

### Test Card Numbers

| Card Number | Scenario |
|-------------|----------|
| 4242424242424242 | Successful payment |
| 4000000000000002 | Card declined |
| 4000000000009995 | Insufficient funds |
| 4000002500003155 | 3D Secure required |

### Test Mode

Stripe test mode allows full payment flow testing without real charges.

```typescript
// Frontend uses test publishable key in development
const STRIPE_KEY = __DEV__
  ? 'pk_test_...'
  : 'pk_live_...';
```
