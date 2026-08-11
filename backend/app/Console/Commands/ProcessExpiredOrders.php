<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Orders;
use App\Listener;
use Illuminate\Support\Facades\Log;
use Exception;

class ProcessExpiredOrders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orders:process-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process orders that have exceeded the 30-minute chef acceptance deadline and issue automatic refunds';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Checking for expired orders...');

        $currentTimestamp = time();

        // Find orders with status = 1 (Requested) that have passed their acceptance deadline
        $expiredOrders = Orders::where('status', 1)
            ->whereNotNull('acceptance_deadline')
            ->where('acceptance_deadline', '<', (string)$currentTimestamp)
            ->get();

        if ($expiredOrders->isEmpty()) {
            $this->info('No expired orders found.');
            return 0;
        }

        $this->info('Found ' . $expiredOrders->count() . ' expired order(s). Processing refunds...');

        $processedCount = 0;
        $failedCount = 0;

        foreach ($expiredOrders as $order) {
            try {
                $this->processExpiredOrder($order);
                $processedCount++;
                $this->info("Order #{$order->id} processed successfully");
            } catch (Exception $e) {
                $failedCount++;
                $this->error("Failed to process order #{$order->id}: " . $e->getMessage());
                Log::error("ProcessExpiredOrders: Failed to process order #{$order->id}", [
                    'error' => $e->getMessage(),
                    'order_id' => $order->id
                ]);
            }
        }

        $this->info("Processing complete. Success: {$processedCount}, Failed: {$failedCount}");

        return 0;
    }

    /**
     * Process a single expired order
     *
     * @param Orders $order
     * @return void
     * @throws Exception
     */
    private function processExpiredOrder(Orders $order)
    {
        // Skip if order doesn't have a payment token
        if (empty($order->payment_token)) {
            Log::warning("Order #{$order->id} has no payment token, skipping refund");

            // Still update the order status
            $order->update([
                'status' => 4, // Cancelled
                'cancelled_by_role' => 'system',
                'cancellation_reason' => 'Chef did not accept order within 30 minutes',
                'cancellation_type' => 'system_timeout',
                'cancelled_at' => now(),
                'updated_at' => (string)time(),
            ]);

            return;
        }

        // Initialize Stripe
        include $_SERVER['DOCUMENT_ROOT'] . '/include/config.php';
        require_once('../stripe-php/init.php');
        $stripe = new \Stripe\StripeClient($stripe_key);

        // Process full refund (100%)
        $refund = $stripe->refunds->create([
            'payment_intent' => $order->payment_token,
            'amount' => $order->total_price * 100, // Convert to cents
        ]);

        $refundStripeId = $refund->id;

        // Update order with cancellation and refund metadata
        $order->update([
            'status' => 4, // Cancelled
            'cancelled_by_role' => 'system',
            'cancellation_reason' => 'Chef did not accept order within 30 minutes',
            'cancellation_type' => 'system_timeout',
            'cancelled_at' => now(),
            'refund_amount' => $order->total_price,
            'refund_percentage' => 100,
            'refund_processed_at' => now(),
            'refund_stripe_id' => $refundStripeId,
            'updated_at' => (string)time(),
        ]);

        // Send notification to customer
        $this->notifyCustomer($order);

        Log::info("Order #{$order->id} expired and refunded successfully", [
            'order_id' => $order->id,
            'refund_amount' => $order->total_price,
            'refund_stripe_id' => $refundStripeId
        ]);
    }

    /**
     * Send notification to customer about expired order
     *
     * @param Orders $order
     * @return void
     */
    private function notifyCustomer(Orders $order)
    {
        try {
            $customer = Listener::find($order->customer_user_id);

            if (!$customer || empty($customer->fcm_token)) {
                Log::warning("Customer #{$order->customer_user_id} has no FCM token, skipping notification");
                return;
            }

            $chef = Listener::find($order->chef_user_id);
            $chefName = $chef && trim($chef->first_name) !== '' ? trim($chef->first_name) : 'The chef';

            $title = "Order Not Accepted";
            $body = "{$chefName} is busy right now. try ordering from similar chefs.";

            // Send Firebase notification — tapping it opens the app on the
            // customer home screen so they can order from similar chefs
            // (type 'order_expired' is routed there by the app).
            $messaging = app('firebase.messaging');

            $message = \Kreait\Firebase\Messaging\CloudMessage::withTarget('token', $customer->fcm_token)
                ->withNotification(\Kreait\Firebase\Messaging\Notification::create($title, $body))
                ->withData([
                    'type' => 'order_expired',
                    'order_id' => (string)$order->id,
                    'chef_id' => (string)$order->chef_user_id,
                    'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                ]);

            $messaging->send($message);

            // Persist to the in-app notification inbox
            \App\Notification::create([
                'title' => $title,
                'body' => $body,
                'image' => $chef->photo ?? 'N/A',
                'fcm_token' => $customer->fcm_token,
                'user_id' => $customer->id,
                'navigation_id' => $order->id,
                'role' => 'customer',
            ]);

            Log::info("Notification sent to customer #{$customer->id} for expired order #{$order->id}");

        } catch (Exception $e) {
            Log::error("Failed to send notification for expired order #{$order->id}", [
                'error' => $e->getMessage()
            ]);
            // Don't throw - notification failure shouldn't stop the refund
        }
    }
}
