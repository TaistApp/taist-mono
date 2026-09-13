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
    protected $description = 'Cancel and refund orders whose chef acceptance deadline has passed';

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
            } catch (\Throwable $e) {
                // \Throwable, not Exception: the Stripe include above used to
                // fatal under artisan, and a fatal is an Error rather than an
                // Exception — so it escaped this catch, killed the whole sweep,
                // and went to /dev/null. One bad order must never take the run
                // down silently again.
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
                'cancellation_reason' => 'Chef did not accept the order in time',
                'cancellation_type' => 'system_timeout',
                'cancelled_at' => now(),
                'updated_at' => (string)time(),
            ]);

            $this->notifyCustomer($order);
            $this->notifyChef($order);

            return;
        }

        // Initialize Stripe. This previously used the web-request pattern —
        // include $_SERVER['DOCUMENT_ROOT'].'/include/config.php' plus a
        // relative '../stripe-php/init.php'. Under artisan there is no
        // DOCUMENT_ROOT and the relative path resolves against the CLI working
        // directory, so require_once fatalled and the command died before ever
        // updating the order. Only orders WITHOUT a payment token (which
        // return early above) were being cancelled, which is why this looked
        // like it worked. Matches FixOrderPaymentTokens, the sibling command.
        require_once(base_path('stripe-php/init.php'));
        $stripe = new \Stripe\StripeClient(env('STRIPE_SECRET'));

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
            'cancellation_reason' => 'Chef did not accept the order in time',
            'cancellation_type' => 'system_timeout',
            'cancelled_at' => now(),
            'refund_amount' => $order->total_price,
            'refund_percentage' => 100,
            'refund_processed_at' => now(),
            'refund_stripe_id' => $refundStripeId,
            'updated_at' => (string)time(),
        ]);

        // Tell both sides. The chef used to be told nothing at all: their
        // order simply vanished from a dashboard that has no tab for it.
        $this->notifyCustomer($order);
        $this->notifyChef($order);

        Log::info("Order #{$order->id} expired and refunded successfully", [
            'order_id' => $order->id,
            'refund_amount' => $order->total_price,
            'refund_stripe_id' => $refundStripeId
        ]);
    }

    /**
     * Tell the chef their order was auto-cancelled.
     *
     * Chef home only has REQUESTED and ACCEPTED tabs, so a cancelled order
     * leaves the dashboard entirely. Without this the chef has no way to learn
     * an order ever existed, let alone that it lapsed — which is exactly how a
     * real order went unnoticed on staging.
     *
     * Failures are logged and swallowed: the refund has already happened and
     * must not be undone by a push problem.
     */
    private function notifyChef(Orders $order)
    {
        $chef = Listener::find($order->chef_user_id);
        if (!$chef) {
            Log::warning("Chef #{$order->chef_user_id} not found for expired order #{$order->id}");
            return;
        }

        $customer = Listener::find($order->customer_user_id);
        $customerName = $customer && trim((string)$customer->first_name) !== ''
            ? trim($customer->first_name)
            : 'A customer';

        $when = $order->order_time ? " at {$order->order_time}" : '';
        $title = "Order cancelled — not accepted in time";
        $body = "{$customerName}'s order{$when} expired before you accepted it, and has been refunded.";

        // The in-app record is written FIRST and independently of the push.
        // Push is the unreliable half here (a chef may have no token, or have
        // never granted permission), and it is the inbox entry that guarantees
        // the chef can still find out what happened. navigation_id + role
        // 'chef' is what opens the order when they tap it.
        try {
            \App\Notification::create([
                'title' => $title,
                'body' => $body,
                'image' => $customer->photo ?? 'N/A',
                'fcm_token' => $chef->fcm_token,
                'user_id' => $chef->id,
                'navigation_id' => $order->id,
                'role' => 'chef',
                'category' => 'order_expired',
            ]);
        } catch (\Throwable $e) {
            Log::error("Failed to record expiry notification for chef #{$chef->id}", [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }

        if (empty($chef->fcm_token)) {
            Log::warning("Chef #{$chef->id} has no FCM token; expiry recorded in-app only");
            return;
        }

        try {
            $messaging = app('firebase.messaging');
            $message = \Kreait\Firebase\Messaging\CloudMessage::withTarget('token', $chef->fcm_token)
                ->withNotification(\Kreait\Firebase\Messaging\Notification::create($title, $body))
                ->withData([
                    'type' => 'order_expired',
                    'role' => 'chef',
                    'order_id' => (string)$order->id,
                    'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                ]);
            $messaging->send($message);

            Log::info("Expiry notification sent to chef #{$chef->id} for order #{$order->id}");
        } catch (\Throwable $e) {
            // The refund already happened; a push problem must not undo it.
            Log::error("Failed to push expiry notification to chef #{$chef->id}", [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
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
