<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrderReadyNotification extends Notification
{
    use Queueable;

    protected $order;

    /**
     * Create a new notification instance.
     *
     * @param  mixed  $order
     */
    public function __construct($order)
    {
        $this->order = $order;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['database', \App\Notifications\Channels\FirebaseChannel::class];
    }

    /**
     * Get the database representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toDatabase($notifiable)
    {
        return [
            'title' => 'Order Ready',
            'body' => 'Your order is ready for pickup!',
            'image' => $notifiable->photo ?? 'N/A',
            'fcm_token' => $notifiable->fcm_token,
            'user_id' => $notifiable->id,
            'navigation_id' => $this->order->id,
            'role' => 'user',
        ];
    }

    /**
     * Get the Firebase representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toFirebase($notifiable)
    {
        return [
            'title' => 'Order Ready',
            'body' => 'Your order is ready for pickup!',
            'data' => [
                'order_id' => (string)$this->order->id,
                'role' => 'user',
                'body' => 'Your order is ready for pickup!',
            ],
        ];
    }
}
