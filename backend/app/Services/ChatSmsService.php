<?php

namespace App\Services;

use App\Listener;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ChatSmsService
{
    protected $twilioService;

    public function __construct(TwilioService $twilioService)
    {
        $this->twilioService = $twilioService;
    }

    /**
     * Send throttled, alert-only SMS for new chat messages.
     */
    public function sendNewMessageAlert(int $fromUserId, int $toUserId, int $orderId): void
    {
        try {
            $rawEnabled = env('CHAT_SMS_ENABLED');
            $smsEnabled = ($rawEnabled === null || $rawEnabled === '')
                ? true
                : filter_var($rawEnabled, FILTER_VALIDATE_BOOLEAN);
            if (!$smsEnabled || $fromUserId <= 0 || $toUserId <= 0 || $fromUserId === $toUserId) {
                return;
            }

            $throttleMinutes = (int) env('CHAT_SMS_THROTTLE_MINUTES', 5);
            if ($throttleMinutes < 1) {
                $throttleMinutes = 5;
            }

            $orderedUsers = [$fromUserId, $toUserId];
            sort($orderedUsers);
            $conversationKey = sprintf(
                'chat_sms_alert:%d:%d:%d',
                $orderId,
                $orderedUsers[0],
                $orderedUsers[1]
            );

            if (Cache::has($conversationKey)) {
                Log::info('Chat SMS skipped due to throttle window', [
                    'from_user_id' => $fromUserId,
                    'to_user_id' => $toUserId,
                    'order_id' => $orderId,
                    'throttle_minutes' => $throttleMinutes,
                ]);
                return;
            }

            $sender = app(Listener::class)->find($fromUserId);
            $recipient = app(Listener::class)->find($toUserId);
            if (!$sender || !$recipient || empty($recipient->phone)) {
                return;
            }

            $senderRole = ((int) $sender->user_type === 2) ? 'chef' : 'customer';
            $inboxUrl = rtrim((string) env('APP_URL', 'https://taist.app'), '/') . '/open/inbox';

            $message = "Taist: New message from your {$senderRole}. Open inbox: {$inboxUrl}. Reply in the app only - this SMS inbox is not monitored.";

            $result = $this->twilioService->sendSMS($recipient->phone, $message, [
                'type' => 'chat_message_alert',
                'from_user_id' => $fromUserId,
                'to_user_id' => $toUserId,
                'order_id' => $orderId,
            ]);

            if (!empty($result['success'])) {
                // Use explicit seconds TTL for compatibility across cache drivers.
                Cache::put($conversationKey, time(), $throttleMinutes * 60);
            }
        } catch (\Throwable $e) {
            Log::error('Failed to send chat SMS alert', [
                'from_user_id' => $fromUserId,
                'to_user_id' => $toUserId,
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
