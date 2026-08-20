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

            // Throttle per recipient, not per conversation pair: a shared key
            // meant a reply within the window silenced the alert for the other
            // person, who had not been texted at all yet.
            $conversationKey = sprintf('chat_sms_alert:%d:%d', $orderId, $toUserId);

            // A cache backend failure must not swallow the alert — before this,
            // any Cache exception fell through to the outer catch and no SMS
            // was ever sent.
            try {
                if (Cache::has($conversationKey)) {
                    Log::info('Chat SMS skipped due to throttle window', [
                        'from_user_id' => $fromUserId,
                        'to_user_id' => $toUserId,
                        'order_id' => $orderId,
                        'throttle_minutes' => $throttleMinutes,
                    ]);
                    return;
                }
            } catch (\Throwable $e) {
                Log::warning('Chat SMS throttle lookup failed, sending anyway', [
                    'order_id' => $orderId,
                    'error' => $e->getMessage(),
                ]);
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
                try {
                    // Use explicit seconds TTL for compatibility across cache drivers.
                    Cache::put($conversationKey, time(), $throttleMinutes * 60);
                } catch (\Throwable $e) {
                    Log::warning('Chat SMS throttle write failed', [
                        'order_id' => $orderId,
                        'error' => $e->getMessage(),
                    ]);
                }
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
