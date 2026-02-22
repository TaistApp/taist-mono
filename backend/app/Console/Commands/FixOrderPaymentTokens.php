<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Orders;
use App\Models\PaymentMethodListener;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FixOrderPaymentTokens extends Command
{
    protected $signature = 'orders:fix-payment-tokens {order_ids : Comma-separated order IDs}';
    protected $description = 'Create payment intents for orders missing payment_token';

    public function handle()
    {
        $orderIds = explode(',', $this->argument('order_ids'));

        require_once(base_path('../stripe-php/init.php'));
        $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

        foreach ($orderIds as $orderId) {
            $orderId = trim($orderId);
            $this->info("Processing order {$orderId}...");

            $order = Orders::find($orderId);
            if (!$order) {
                $this->error("Order {$orderId} not found.");
                continue;
            }

            if (!empty($order->payment_token)) {
                $this->warn("Order {$orderId} already has payment_token: {$order->payment_token}. Skipping.");
                continue;
            }

            // Get customer email
            $customer_user = DB::table('tbl_users')->where('id', $order->customer_user_id)->first();
            if (!$customer_user) {
                $this->error("Customer user {$order->customer_user_id} not found for order {$orderId}.");
                continue;
            }

            // Get Stripe customer
            $customers = $stripe->customers->all(['email' => $customer_user->email]);
            $stripeCustomer = $customers['data'][0] ?? null;
            if (!$stripeCustomer) {
                $this->error("No Stripe customer found for {$customer_user->email}.");
                continue;
            }

            // Get payment methods
            $pdata = PaymentMethodListener::where(['user_id' => $order->customer_user_id, 'active' => 1])->first();
            $chefData = PaymentMethodListener::where(['user_id' => $order->chef_user_id])->first();

            if (!$pdata || !$pdata->card_token) {
                $this->error("No active payment method for customer {$order->customer_user_id}.");
                continue;
            }
            if (!$chefData || !$chefData->stripe_account_id) {
                $this->error("No Stripe account for chef {$order->chef_user_id}.");
                continue;
            }

            try {
                // Attach payment method if needed
                $paymentMethod = $stripe->paymentMethods->retrieve($pdata->card_token);
                if (!$paymentMethod->customer) {
                    $stripe->paymentMethods->attach($pdata->card_token, ['customer' => $stripeCustomer['id']]);
                }

                // Create payment intent
                $piToken = $stripe->paymentIntents->create([
                    'amount' => intval($order->total_price * 100),
                    'currency' => 'usd',
                    'payment_method_types' => ['card'],
                    'description' => 'Order ' . $order->id . ' (backfill)',
                    'confirm' => true,
                    'customer' => $stripeCustomer['id'],
                    'payment_method' => $pdata->card_token,
                    'application_fee_amount' => intval(round(($order->total_price * 0.30) * 100)),
                    'transfer_data' => [
                        'destination' => $chefData->stripe_account_id,
                    ],
                ]);

                // Save to order
                $order->payment_token = $piToken['id'];
                $order->save();

                $this->info("Order {$orderId}: payment intent created ({$piToken['id']}), payment_token saved.");
            } catch (\Exception $e) {
                $this->error("Order {$orderId} failed: {$e->getMessage()}");
            }
        }

        $this->info('Done.');
    }
}
