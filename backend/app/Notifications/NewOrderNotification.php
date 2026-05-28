<?php

namespace App\Notifications;

use App\Models\DishPhoto;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewOrderNotification extends Notification
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
        $dishFilename = $this->order->menu_id
            ? DishPhoto::where('menu_id', $this->order->menu_id)->where('status', 'approved')->value('filename')
            : null;

        return [
            'title' => 'New Order Received',
            'body' => 'You have received a new order!',
            'image' => $notifiable->photo ?? 'N/A',
            'dish_image' => $dishFilename,
            'fcm_token' => $notifiable->fcm_token,
            'user_id' => $notifiable->id,
            'navigation_id' => $this->order->id,
            'role' => 'chef',
        ];
    }

    public function toFirebase($notifiable)
    {
        return [
            'title' => 'New Order Received',
            'body' => 'You have received a new order!',
            'image' => DishPhoto::getApprovedUrlForMenu($this->order->menu_id),
            'data' => [
                'order_id' => (string)$this->order->id,
                'role' => 'chef',
                'body' => 'You have received a new order!',
            ],
        ];
    }
}
