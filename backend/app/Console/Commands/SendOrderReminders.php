<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Orders;
use App\Services\OrderSmsService;
use Illuminate\Support\Facades\Log;
use Exception;

class SendOrderReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orders:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send 24-hour reminder SMS to chefs and customers for upcoming orders';

    protected $orderSmsService;

    /**
     * Create a new command instance.
     *
     * @param OrderSmsService $orderSmsService
     * @return void
     */
    public function __construct(OrderSmsService $orderSmsService)
    {
        parent::__construct();
        $this->orderSmsService = $orderSmsService;
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Checking for orders needing 24-hour reminders...');

        $now = time();
        $windowStart = $now + (23 * 3600); // 23 hours from now
        $windowEnd = $now + (25 * 3600);   // 25 hours from now

        // Find orders in the reminder window that haven't been reminded.
        // Requested (status 1) orders are excluded so the customer isn't
        // reminded before the chef accepts; they keep reminder_sent_at null
        // and are picked up by a later run once accepted (status 2).
        $orders = Orders::whereIn('status', Orders::REMINDER_ELIGIBLE_STATUSES)
            ->whereNull('reminder_sent_at')
            ->where('order_date', '>=', (string)$windowStart)
            ->where('order_date', '<=', (string)$windowEnd)
            ->get();

        if ($orders->isEmpty()) {
            $this->info('No orders found needing reminders.');
            return 0;
        }

        $this->info("Found {$orders->count()} order(s) needing reminders.");

        $sentCount = 0;
        $failedCount = 0;

        foreach ($orders as $order) {
            try {
                // Send reminder to chef
                $chefResult = $this->orderSmsService->sendChefReminderNotification($order->id);

                // Send reminder to customer
                $customerResult = $this->orderSmsService->sendCustomerReminderNotification($order->id);

                // Mark as reminded even if one failed (to prevent spam retry)
                $order->update(['reminder_sent_at' => now()]);

                if ($chefResult['success'] && $customerResult['success']) {
                    $sentCount++;
                    $this->info("✓ Sent reminders for order #{$order->id}");
                } else {
                    $failedCount++;
                    $errors = [];
                    if (!$chefResult['success']) $errors[] = "Chef: {$chefResult['error']}";
                    if (!$customerResult['success']) $errors[] = "Customer: {$customerResult['error']}";
                    $this->warn("⚠ Partial success for order #{$order->id}: " . implode(', ', $errors));
                }
            } catch (Exception $e) {
                $failedCount++;
                $this->error("✗ Failed to send reminders for order #{$order->id}: " . $e->getMessage());
                Log::error("SendOrderReminders: Failed for order #{$order->id}", [
                    'error' => $e->getMessage(),
                    'order_id' => $order->id
                ]);

                // Still mark as reminded to prevent infinite retries
                try {
                    $order->update(['reminder_sent_at' => now()]);
                } catch (Exception $updateError) {
                    $this->error("✗ Failed to mark order #{$order->id} as reminded");
                }
            }
        }

        $this->info("Reminder sending complete. Sent: {$sentCount}, Failed/Partial: {$failedCount}");

        return 0;
    }
}
