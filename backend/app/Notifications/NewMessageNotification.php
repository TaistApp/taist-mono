<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Push + in-app alert for a new chat message on an order.
 *
 * Chat previously only sent a throttled SMS (ChatSmsService), so a customer
 * whose chef messaged them got nothing on their phone unless that SMS landed.
 */
class NewMessageNotification extends Notification
{
    use Queueable;

    public const TYPE = 'chat_message';

    protected $sender;
    protected $orderId;
    protected $message;

    public function __construct($sender, $orderId, $message)
    {
        $this->sender = $sender;
        $this->orderId = (int) $orderId;
        $this->message = (string) $message;
    }

    public function via($notifiable)
    {
        return [
            \App\Notifications\Channels\AppDatabaseChannel::class,
            \App\Notifications\Channels\FirebaseChannel::class,
        ];
    }

    /**
     * Recipients see the sender's first name and last initial, matching how
     * names are shown everywhere else in the customer-facing UI.
     */
    private function senderName(): string
    {
        $first = trim((string) ($this->sender->first_name ?? ''));
        $lastInitial = mb_substr(trim((string) ($this->sender->last_name ?? '')), 0, 1);

        if ($first === '' && $lastInitial === '') {
            return 'your chef';
        }

        return $lastInitial === '' ? $first : "{$first} {$lastInitial}.";
    }

    private function title(): string
    {
        return 'New message from ' . $this->senderName();
    }

    /**
     * Push previews stay short so the message body is not truncated mid-word
     * in the notification tray.
     */
    private function preview(): string
    {
        $body = trim($this->message);
        if ($body === '') {
            return 'Tap to open the conversation.';
        }

        return mb_strlen($body) > 120 ? mb_substr($body, 0, 117) . '...' : $body;
    }

    public function toDatabase($notifiable)
    {
        return [
            'title' => $this->title(),
            'body' => $this->preview(),
            'image' => $this->sender->photo ?? 'N/A',
            'fcm_token' => $notifiable->fcm_token,
            'user_id' => $notifiable->id,
            'navigation_id' => $this->orderId,
            'role' => ((int) ($notifiable->user_type ?? 1) === 2) ? 'chef' : 'user',
            'category' => self::TYPE,
        ];
    }

    public function toFirebase($notifiable)
    {
        return [
            'title' => $this->title(),
            'body' => $this->preview(),
            'data' => [
                'type' => self::TYPE,
                'order_id' => (string) $this->orderId,
                'sender_id' => (string) ($this->sender->id ?? ''),
                'sender_first_name' => (string) ($this->sender->first_name ?? ''),
                'sender_last_name' => (string) ($this->sender->last_name ?? ''),
                'sender_photo' => (string) ($this->sender->photo ?? ''),
                // Recipient's own role, so the app knows which side it is on.
                'role' => ((int) ($notifiable->user_type ?? 1) === 2) ? 'chef' : 'user',
                'body' => $this->preview(),
            ],
        ];
    }
}
