<?php

namespace App\Notifications;

use App\Models\DishPhoto;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewMenuItemNotification extends Notification
{
    use Queueable;

    protected $menu;
    protected $chef;

    public function __construct($menu, $chef)
    {
        $this->menu = $menu;
        $this->chef = $chef;
    }

    public function via($notifiable)
    {
        return ['database', \App\Notifications\Channels\FirebaseChannel::class];
    }

    public function toDatabase($notifiable)
    {
        $dishFilename = DishPhoto::where('menu_id', $this->menu->id)
            ->where('status', 'approved')
            ->value('filename');

        return [
            'title' => "New from Chef {$this->chef->first_name}!",
            'body' => "{$this->menu->title} just added to the menu",
            'image' => $this->chef->photo ?? 'N/A',
            'dish_image' => $dishFilename,
            'fcm_token' => $notifiable->fcm_token,
            'user_id' => $notifiable->id,
            'navigation_id' => $this->chef->id,
            'role' => 'user',
            'category' => 'chef_update',
        ];
    }

    public function toFirebase($notifiable)
    {
        return [
            'title' => "New from Chef {$this->chef->first_name}!",
            'body' => "{$this->menu->title} just added to the menu",
            'image' => DishPhoto::getApprovedUrlForMenu($this->menu->id),
            'data' => [
                'type' => 'chef_update',
                'chef_id' => (string)$this->chef->id,
                'menu_id' => (string)$this->menu->id,
                'role' => 'user',
                'body' => "{$this->menu->title} just added to the menu",
            ],
        ];
    }
}
