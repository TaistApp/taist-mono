<?php

namespace App\Notifications\Channels;

use App\Notification as AppNotification;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

/**
 * Writes notifications to this app's legacy `notifications` table.
 *
 * Laravel's built-in `database` channel builds an `id`/`type`/`data`/`read_at`
 * payload for its own `DatabaseNotification` schema. This project replaced that
 * table with flat columns (title, body, image, navigation_id, role, ...), and
 * `App\Notification::$fillable` filters the framework's keys out — so the stock
 * channel inserted a row with every column empty. Because the MySQL connection
 * runs non-strict (config/database.php), those blank inserts succeeded silently
 * and the in-app Notifications list filled up with empty cards.
 *
 * This channel maps `toDatabase()` straight onto the real columns instead.
 */
class AppDatabaseChannel
{
    /**
     * Columns that actually exist on the `notifications` table.
     */
    private const COLUMNS = [
        'title',
        'body',
        'image',
        'dish_image',
        'fcm_token',
        'user_id',
        'navigation_id',
        'role',
        'category',
    ];

    public function send($notifiable, Notification $notification)
    {
        if (!method_exists($notification, 'toDatabase')) {
            return null;
        }

        $data = $notification->toDatabase($notifiable);
        if (!is_array($data)) {
            return null;
        }

        $row = array_intersect_key($data, array_flip(self::COLUMNS));

        // These are required (NOT NULL, no default) on the legacy schema.
        $row['user_id'] = $row['user_id'] ?? $notifiable->id;
        $row['fcm_token'] = $row['fcm_token'] ?? ($notifiable->fcm_token ?? '');
        $row['navigation_id'] = $row['navigation_id'] ?? '';
        $row['role'] = $row['role'] ?? 'user';

        if (empty($row['title'])) {
            return null;
        }

        try {
            return AppNotification::create($row);
        } catch (\Throwable $e) {
            Log::error('Failed to persist notification', [
                'notification' => get_class($notification),
                'user_id' => $row['user_id'] ?? null,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
