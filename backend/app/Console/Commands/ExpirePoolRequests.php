<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PoolRequests;
use App\Listener;
use App\Notification;
use Illuminate\Support\Facades\Log;
use Exception;

class ExpirePoolRequests extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pool:expire-requests';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Expire unclaimed dish pool requests and notify the customer';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $now = time();

        $stale = PoolRequests::where('status', 'open')
            ->where('expires_at', '<=', $now)
            ->get();

        foreach ($stale as $pool) {
            PoolRequests::where('id', $pool->id)
                ->where('status', 'open')
                ->update(['status' => 'expired', 'updated_at' => $now]);

            try {
                $customer = Listener::find($pool->customer_user_id);
                if ($customer && !empty($customer->fcm_token)) {
                    $title = 'No chef this time 😔';
                    $body = "No chef was able to take your dish request. Browse chefs directly to find someone for that day.";
                    $messaging = app('firebase.messaging');
                    $message = \Kreait\Firebase\Messaging\CloudMessage::withTarget('token', $customer->fcm_token)
                        ->withNotification(\Kreait\Firebase\Messaging\Notification::create($title, $body))
                        ->withData([
                            'type' => 'pool_request_expired',
                            'role' => 'user',
                            'pool_request_id' => (string) $pool->id,
                            'body' => $body,
                            'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                        ]);
                    $messaging->send($message);
                    Notification::create([
                        'title' => $title,
                        'body' => $body,
                        'image' => 'N/A',
                        'fcm_token' => $customer->fcm_token,
                        'user_id' => $customer->id,
                        'navigation_id' => $pool->id,
                        'role' => 'user',
                    ]);
                }
            } catch (Exception $e) {
                Log::warning('Pool expiry push failed', ['pool_id' => $pool->id, 'error' => $e->getMessage()]);
            }
        }

        $this->info("Expired {$stale->count()} pool request(s).");

        return 0;
    }
}
