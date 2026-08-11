<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Orders;
use App\Listener;
use App\Notification;
use Illuminate\Support\Facades\Log;
use Exception;

class SendAcceptanceReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orders:send-acceptance-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Push a reminder to chefs every 5 minutes while an order request awaits acceptance within its 30-minute window';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $now = time();

        // Orders still awaiting chef acceptance inside their 30-minute window
        $pendingOrders = Orders::where('status', 1)
            ->whereNotNull('acceptance_deadline')
            ->where('acceptance_deadline', '>', (string)$now)
            ->get();

        if ($pendingOrders->isEmpty()) {
            $this->info('No pending order requests found.');
            return 0;
        }

        $sentCount = 0;

        foreach ($pendingOrders as $order) {
            if (!$order->shouldSendAcceptanceReminder($now)) {
                continue;
            }

            try {
                if ($this->remindChef($order)) {
                    $order->update([
                        'acceptance_reminder_sent_at' => (string)$now,
                        'updated_at' => (string)time(),
                    ]);
                    $sentCount++;
                }
            } catch (Exception $e) {
                Log::error("SendAcceptanceReminders: Failed for order #{$order->id}", [
                    'error' => $e->getMessage(),
                    'order_id' => $order->id,
                ]);
            }
        }

        $this->info("Acceptance reminders sent: {$sentCount} of {$pendingOrders->count()} pending order(s).");

        return 0;
    }

    /**
     * Send the reminder push to the chef for one pending order request.
     *
     * @param Orders $order
     * @return bool True if a push was sent
     */
    private function remindChef(Orders $order)
    {
        $chef = Listener::find($order->chef_user_id);

        if (!$chef || empty($chef->fcm_token)) {
            Log::warning("SendAcceptanceReminders: Chef #{$order->chef_user_id} has no FCM token, skipping order #{$order->id}");
            return false;
        }

        $minutesLeft = max(1, (int)ceil($order->getTimeRemaining() / 60));

        $customer = Listener::find($order->customer_user_id);
        $customerName = $customer && trim($customer->first_name) !== ''
            ? trim($customer->first_name)
            : 'A customer';

        $title = 'Order Request Waiting';
        $body = "{$customerName}'s order request expires in {$minutesLeft} min. Accept or decline now.";

        $messaging = app('firebase.messaging');

        // role 'chef' + order_id makes a tap deep-link to the chef's order
        // detail screen, same as the initial new-order push.
        $message = \Kreait\Firebase\Messaging\CloudMessage::withTarget('token', $chef->fcm_token)
            ->withNotification(\Kreait\Firebase\Messaging\Notification::create($title, $body))
            ->withData([
                'type' => 'acceptance_reminder',
                'role' => 'chef',
                'order_id' => (string)$order->id,
                'body' => $body,
                'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
            ]);

        $messaging->send($message);

        // Persist to the in-app notification inbox
        Notification::create([
            'title' => $title,
            'body' => $body,
            'image' => $customer->photo ?? 'N/A',
            'fcm_token' => $chef->fcm_token,
            'user_id' => $chef->id,
            'navigation_id' => $order->id,
            'role' => 'chef',
        ]);

        Log::info("Acceptance reminder sent to chef #{$chef->id} for order #{$order->id} ({$minutesLeft} min left)");

        return true;
    }
}
