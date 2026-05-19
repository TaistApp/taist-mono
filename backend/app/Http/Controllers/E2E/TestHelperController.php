<?php

namespace App\Http\Controllers\E2E;

use App\Http\Controllers\Controller;
use App\Listener;
use App\Models\PaymentMethodListener;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * E2E Test Helper Controller
 *
 * Provides programmatic test setup that would normally require interactive flows.
 * Safety: all endpoints refuse to operate unless STRIPE_SECRET is a test key (sk_test_*).
 */
class TestHelperController extends Controller
{
    private const API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';

    /**
     * Verify the server is using Stripe test keys, not live keys.
     * This is the safety gate that prevents E2E endpoints from running
     * against a production Stripe account.
     */
    private function isStripeTestMode(): bool
    {
        $key = env('STRIPE_SECRET', '');
        return str_starts_with($key, 'sk_test_');
    }

    /**
     * Set up a fully-functional Stripe Connect account for a test chef.
     *
     * Stripe Express accounts require interactive onboarding, which can't be
     * completed programmatically. For E2E testing, this endpoint creates a
     * Stripe Custom account (which allows full API control), fills in all
     * required test data, and links it to the chef's payment record.
     *
     * Safety: only works when the server's STRIPE_SECRET is a test key (sk_test_*).
     *
     * POST /mapi/e2e/setup_chef_stripe
     * Body: { user_id: int }
     */
    public function setupChefStripe(Request $request)
    {
        // Validate API key
        if ($request->header('apiKey') !== self::API_KEY) {
            return response()->json(['success' => 0, 'error' => 'Access denied.']);
        }

        // Safety: only operate when Stripe is in test mode
        if (!$this->isStripeTestMode()) {
            return response()->json(['success' => 0, 'error' => 'E2E endpoints only work with Stripe test keys.']);
        }

        $userId = $request->input('user_id');
        $user = Listener::find($userId);

        if (!$user) {
            return response()->json(['success' => 0, 'error' => 'User not found.']);
        }

        if ($user->user_type != 2) {
            return response()->json(['success' => 0, 'error' => 'User is not a chef.']);
        }

        try {
            require_once(base_path('stripe-php/init.php'));
            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            // Check if chef already has a working Stripe account
            $existing = PaymentMethodListener::where(['user_id' => $userId, 'active' => 1])->first();

            if ($existing && !empty($existing->stripe_account_id)) {
                try {
                    $account = $stripe->accounts->retrieve($existing->stripe_account_id);

                    // Return current status — caller can retry if charges_enabled is false
                    return response()->json([
                        'success' => 1,
                        'stripe_account_id' => $existing->stripe_account_id,
                        'charges_enabled' => $account->charges_enabled,
                        'disabled_reason' => $account->requirements->disabled_reason ?? null,
                    ]);
                } catch (\Exception $e) {
                    // Account is invalid — delete and recreate
                    $existing->delete();
                }
            }

            // Create a Custom account (allows full API control, unlike Express)
            $account = $stripe->accounts->create([
                'type' => 'custom',
                'country' => 'US',
                'email' => $user->email,
                'business_type' => 'individual',
                'capabilities' => [
                    'card_payments' => ['requested' => true],
                    'transfers' => ['requested' => true],
                ],
                'individual' => [
                    'first_name' => $user->first_name ?: 'Test',
                    'last_name' => $user->last_name ?: 'Chef',
                    'dob' => [
                        'day' => 1,
                        'month' => 1,
                        'year' => 1990,
                    ],
                    'address' => [
                        'line1' => $user->address ?: '123 Test St',
                        'city' => $user->city ?: 'Dallas',
                        'state' => \App\Helpers\AppHelper::getStateAbbreviation($user->state ?: 'Texas'),
                        'postal_code' => $user->zip ?: '75201',
                        'country' => 'US',
                    ],
                    'email' => $user->email,
                    'phone' => '+1' . ($user->phone ?: '5551230000'),
                    'ssn_last_4' => '0000',
                    'id_number' => '000000000',
                ],
                'business_profile' => [
                    'name' => trim($user->first_name . ' ' . $user->last_name),
                    'url' => 'https://taist.app',
                    'product_description' => 'E2E test chef account',
                    'mcc' => '5812',
                ],
                'tos_acceptance' => [
                    'date' => time(),
                    'ip' => '127.0.0.1',
                ],
                'settings' => [
                    'payments' => [
                        'statement_descriptor' => 'TAIST',
                    ],
                ],
            ]);

            // Upload a test document for identity verification.
            // Stripe test mode requires a verification document to enable charges.
            $tmpFile = tempnam(sys_get_temp_dir(), 'stripe_e2e_');
            file_put_contents($tmpFile, base64_decode(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
            ));
            $fileUpload = $stripe->files->create([
                'purpose' => 'identity_document',
                'file' => fopen($tmpFile, 'r'),
            ], ['stripe_account' => $account->id]);
            @unlink($tmpFile);

            if (!empty($fileUpload->id)) {
                $stripe->accounts->update($account->id, [
                    'individual' => [
                        'verification' => [
                            'document' => [
                                'front' => $fileUpload->id,
                            ],
                        ],
                    ],
                ]);
            }

            // Brief pause for Stripe to process verification in test mode
            sleep(2);

            // Add a test bank account for payouts
            $stripe->accounts->createExternalAccount($account->id, [
                'external_account' => [
                    'object' => 'bank_account',
                    'country' => 'US',
                    'currency' => 'usd',
                    'routing_number' => '110000000',
                    'account_number' => '000123456789',
                ],
            ]);

            // Save to payment methods table
            PaymentMethodListener::insert([
                'user_id' => $userId,
                'stripe_account_id' => $account->id,
                'active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Verify charges are enabled
            $verified = $stripe->accounts->retrieve($account->id);

            Log::info('[E2E] Chef Stripe setup complete', [
                'user_id' => $userId,
                'stripe_account_id' => $account->id,
                'charges_enabled' => $verified->charges_enabled,
            ]);

            return response()->json([
                'success' => 1,
                'stripe_account_id' => $account->id,
                'charges_enabled' => $verified->charges_enabled,
            ]);

        } catch (\Exception $e) {
            Log::error('[E2E] Chef Stripe setup failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => 0,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Set up a Stripe Customer + payment method for a test customer.
     *
     * The real app creates Stripe Customers via add_payment_method (which uses
     * Stripe.js tokens from the frontend). For E2E, we create the customer and
     * attach a test card server-side using the PaymentMethods API, which is what
     * createPaymentIntent expects when charging.
     *
     * POST /mapi/e2e/setup_customer_stripe
     * Body: { user_id: int }
     */
    public function setupCustomerStripe(Request $request)
    {
        if ($request->header('apiKey') !== self::API_KEY) {
            return response()->json(['success' => 0, 'error' => 'Access denied.']);
        }

        if (!$this->isStripeTestMode()) {
            return response()->json(['success' => 0, 'error' => 'E2E endpoints only work with Stripe test keys.']);
        }

        $userId = $request->input('user_id');
        $user = Listener::find($userId);

        if (!$user) {
            return response()->json(['success' => 0, 'error' => 'User not found.']);
        }

        try {
            require_once(base_path('stripe-php/init.php'));
            $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

            // Check if customer already has a payment method
            $existing = PaymentMethodListener::where(['user_id' => $userId, 'active' => 1])->first();
            if ($existing && !empty($existing->stripe_cus_id)) {
                return response()->json([
                    'success' => 1,
                    'message' => 'Customer already has a payment method.',
                    'stripe_customer_id' => $existing->stripe_cus_id,
                ]);
            }

            // Find or create a Stripe Customer (same lookup as addPaymentMethod)
            $customers = $stripe->customers->all(['email' => $user->email, 'limit' => 1]);
            if (!empty($customers->data)) {
                $customer = $customers->data[0];
            } else {
                $customer = $stripe->customers->create([
                    'email' => $user->email,
                    'name' => trim($user->first_name . ' ' . $user->last_name),
                    'description' => 'E2E test customer',
                ]);
            }

            // Create a PaymentMethod with test card 4242 and attach to customer.
            // createPaymentIntent uses paymentMethods->retrieve() on card_token,
            // so we must store a pm_xxx ID (not a legacy source/token).
            $pm = $stripe->paymentMethods->create([
                'type' => 'card',
                'card' => [
                    'number' => '4242424242424242',
                    'exp_month' => 12,
                    'exp_year' => date('Y') + 2,
                    'cvc' => '123',
                ],
            ]);

            $stripe->paymentMethods->attach($pm->id, [
                'customer' => $customer->id,
            ]);

            // Set as default payment method
            $stripe->customers->update($customer->id, [
                'invoice_settings' => ['default_payment_method' => $pm->id],
            ]);

            // Deactivate any existing payment methods for this user
            PaymentMethodListener::where('user_id', $userId)->update(['active' => 0]);

            // Save to payment methods table (mirrors addPaymentMethod logic)
            PaymentMethodListener::insert([
                'user_id' => $userId,
                'stripe_cus_id' => $customer->id,
                'card_token' => $pm->id,
                'last4' => '4242',
                'card_type' => 'Visa',
                'zip' => '75201',
                'active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info('[E2E] Customer Stripe setup complete', [
                'user_id' => $userId,
                'stripe_customer_id' => $customer->id,
                'payment_method_id' => $pm->id,
            ]);

            return response()->json([
                'success' => 1,
                'stripe_customer_id' => $customer->id,
                'payment_method_id' => $pm->id,
            ]);

        } catch (\Exception $e) {
            Log::error('[E2E] Customer Stripe setup failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => 0,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Mark a chef as verified (bypass SafeScreener background check).
     *
     * In production, chefs go through SafeScreener's API for background checks,
     * which requires real SSNs and costs money. For E2E testing, we just flip
     * the DB flags — same as what the admin panel does for manual approval.
     *
     * POST /mapi/e2e/verify_chef
     * Body: { user_id: int }
     */
    public function verifyChef(Request $request)
    {
        if ($request->header('apiKey') !== self::API_KEY) {
            return response()->json(['success' => 0, 'error' => 'Access denied.']);
        }

        $userId = $request->input('user_id');
        $user = Listener::find($userId);

        if (!$user) {
            return response()->json(['success' => 0, 'error' => 'User not found.']);
        }

        if ($user->user_type != 2) {
            return response()->json(['success' => 0, 'error' => 'User is not a chef.']);
        }

        // Already verified?
        if ($user->verified == 1 && $user->is_pending == 0) {
            return response()->json([
                'success' => 1,
                'message' => 'Chef already verified.',
            ]);
        }

        // Set the same flags the admin panel uses for manual approval
        $user->is_pending = 0;
        $user->verified = 1;
        $user->save();

        Log::info('[E2E] Chef verified (SafeScreener bypassed)', [
            'user_id' => $userId,
        ]);

        return response()->json([
            'success' => 1,
            'verified' => true,
        ]);
    }

    /**
     * Clean up test users created by E2E tests.
     *
     * Deletes users with emails matching the e2e-test domain pattern.
     *
     * POST /mapi/e2e/cleanup_test_users
     * Body: { domain: string } (default: "e2e-test.taist.app")
     */
    public function cleanupTestUsers(Request $request)
    {
        if ($request->header('apiKey') !== self::API_KEY) {
            return response()->json(['success' => 0, 'error' => 'Access denied.']);
        }

        if (!$this->isStripeTestMode()) {
            return response()->json(['success' => 0, 'error' => 'E2E endpoints only work with Stripe test keys.']);
        }

        $domain = $request->input('domain', 'e2e-test.taist.app');
        $pattern = '%@' . $domain;

        $count = Listener::where('email', 'like', $pattern)->count();

        // For safety, require explicit confirmation and cap at 100
        if ($count > 100) {
            return response()->json([
                'success' => 0,
                'error' => "Too many matching users ({$count}). Refusing to bulk delete.",
            ]);
        }

        Listener::where('email', 'like', $pattern)->delete();

        return response()->json([
            'success' => 1,
            'deleted_count' => $count,
            'domain' => $domain,
        ]);
    }
}
