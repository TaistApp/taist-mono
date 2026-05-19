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
                // Check if charges are already enabled
                try {
                    $account = $stripe->accounts->retrieve($existing->stripe_account_id);
                    if ($account->charges_enabled) {
                        return response()->json([
                            'success' => 1,
                            'message' => 'Chef already has active Stripe account.',
                            'stripe_account_id' => $existing->stripe_account_id,
                            'charges_enabled' => true,
                        ]);
                    }

                    // Delete the incomplete Express account reference —
                    // we'll replace it with a Custom account
                    $existing->delete();
                } catch (\Exception $e) {
                    // Account might be invalid, proceed to create new one
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
