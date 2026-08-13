<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Orders;
use App\Models\Menus;
use App\Listener;
use App\Notification;
use Illuminate\Support\Facades\Log;
use Exception;

class SendProgressionReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orders:send-progression-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Nudge chefs through active orders: 30 min before arrival ("On My Way") and once the estimated cook time has elapsed ("mark complete + dish photo")';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $now = time();
        $sent = 0;

        // "On My Way" nudges: accepted orders arriving within the lead window
        // (bounded query; the model predicate applies the exact window).
        $accepted = Orders::where('status', 2)
            ->whereNull('omw_reminder_sent_at')
            ->whereBetween('order_date', [
                $now - Orders::PROGRESSION_REMINDER_GRACE_SECONDS,
                $now + Orders::OMW_REMINDER_LEAD_SECONDS,
            ])
            ->get();

        foreach ($accepted as $order) {
            if (!$order->shouldSendOnMyWayReminder($now)) {
                continue;
            }
            $customerName = $this->customerFirstName($order);
            $minutes = max(1, (int) ceil(((int) $order->order_date - $now) / 60));
            $body = $now < (int) $order->order_date
                ? "{$customerName}'s order arrives in {$minutes} min. Tap \"On My Way\" to let them know you're heading out."
                : "{$customerName} is expecting you — tap \"On My Way\" so they know you're heading out.";

            $sent += $this->pushToChef($order, 'omw_reminder', 'Time to head out 🚗', $body, 'omw_reminder_sent_at', $now);
        }

        // Completion nudges: on-my-way orders whose estimated cook time has
        // elapsed since arrival.
        $onMyWay = Orders::where('status', 7)
            ->whereNull('completion_reminder_sent_at')
            ->whereNotNull('order_date')
            ->get();

        foreach ($onMyWay as $order) {
            $estimated = (int) (Menus::where('id', $order->menu_id)->value('estimated_time') ?? 60);
            if (!$order->shouldSendCompletionReminder($estimated, $now)) {
                continue;
            }
            $customerName = $this->customerFirstName($order);
            $body = "All done cooking for {$customerName}? Mark the order complete — and snap a photo of the dish before you leave!";

            $sent += $this->pushToChef($order, 'completion_reminder', 'Wrap up your order 📸', $body, 'completion_reminder_sent_at', $now);
        }

        $this->info("Progression reminders sent: {$sent}.");

        return 0;
    }

    private function customerFirstName(Orders $order)
    {
        $customer = Listener::find($order->customer_user_id);
        return $customer && trim((string) $customer->first_name) !== ''
            ? trim($customer->first_name)
            : 'Your customer';
    }

    /**
     * Send one nudge push to the order's chef and stamp the sent-at column.
     *
     * @return int 1 if sent, 0 otherwise
     */
    private function pushToChef(Orders $order, $type, $title, $body, $sentAtColumn, $now)
    {
        try {
            $chef = Listener::find($order->chef_user_id);
            if (!$chef || empty($chef->fcm_token)) {
                // Stamp anyway so token-less chefs aren't re-scanned every run
                $order->update([$sentAtColumn => (string) $now, 'updated_at' => (string) time()]);
                return 0;
            }

            $messaging = app('firebase.messaging');

            // role 'chef' + order_id deep-links a tap to the order detail
            // screen, where the next-step button lives.
            $message = \Kreait\Firebase\Messaging\CloudMessage::withTarget('token', $chef->fcm_token)
                ->withNotification(\Kreait\Firebase\Messaging\Notification::create($title, $body))
                ->withData([
                    'type' => $type,
                    'role' => 'chef',
                    'order_id' => (string) $order->id,
                    'body' => $body,
                    'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                ]);

            $messaging->send($message);

            Notification::create([
                'title' => $title,
                'body' => $body,
                'image' => 'N/A',
                'fcm_token' => $chef->fcm_token,
                'user_id' => $chef->id,
                'navigation_id' => $order->id,
                'role' => 'chef',
            ]);

            $order->update([$sentAtColumn => (string) $now, 'updated_at' => (string) time()]);

            Log::info("Progression reminder ({$type}) sent to chef #{$chef->id} for order #{$order->id}");

            return 1;
        } catch (Exception $e) {
            Log::error("SendProgressionReminders: failed for order #{$order->id}", [
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
            return 0;
        }
    }
}
