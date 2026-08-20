<?php

namespace App\Notifications;

use App\Models\DishPhoto;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrderRejectedNotification extends Notification
{
    use Queueable;

    /**
     * Softened customer-facing copy. The tap target is the Home tab (see the
     * `type` in the payloads below), so the body tells them what tapping does.
     */
    public const TITLE = 'Order Update';
    public const BODY = "We're sorry - this chef wasn't able to complete your request. Tap to order from similar chefs.";
    public const TYPE = 'order_rejected';

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
        return [\App\Notifications\Channels\AppDatabaseChannel::class, \App\Notifications\Channels\FirebaseChannel::class];
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
            'title' => self::TITLE,
            'body' => self::BODY,
            'image' => $notifiable->photo ?? 'N/A',
            'dish_image' => $dishFilename,
            'fcm_token' => $notifiable->fcm_token,
            'user_id' => $notifiable->id,
            'navigation_id' => $this->order->id,
            'role' => 'user',
            // Routes the tap to the customer Home tab instead of the dead-end
            // order detail screen, so they can order from similar chefs.
            'category' => self::TYPE,
        ];
    }

    public function toFirebase($notifiable)
    {
        return [
            'title' => self::TITLE,
            'body' => self::BODY,
            'image' => DishPhoto::getApprovedUrlForMenu($this->order->menu_id),
            'data' => [
                'order_id' => (string)$this->order->id,
                'role' => 'user',
                'type' => self::TYPE,
                'body' => self::BODY,
            ],
        ];
    }
}
