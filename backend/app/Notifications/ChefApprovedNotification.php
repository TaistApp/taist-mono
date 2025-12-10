<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ChefApprovedNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct()
    {
        //
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
            'title' => 'Chef Account Activated',
            'body' => 'Congratulations! Your chef account has been approved and activated.',
            'image' => $notifiable->photo ?? 'N/A',
            'fcm_token' => $notifiable->fcm_token,
            'user_id' => $notifiable->id,
            'navigation_id' => $notifiable->id,
            'role' => 'chef',
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
            'title' => 'Chef Account Activated',
            'body' => 'Congratulations! Your chef account has been approved and activated.',
            'data' => [
                'order_id' => (string)$notifiable->id,
                'role' => 'chef',
                'body' => 'Congratulations! Your chef account has been approved and activated.',
            ],
        ];
    }
}
