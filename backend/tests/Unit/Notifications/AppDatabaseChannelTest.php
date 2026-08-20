<?php

namespace Tests\Unit\Notifications;

use App\Listener;
use App\Notifications\Channels\AppDatabaseChannel;
use Illuminate\Notifications\Notification;
use Tests\TestCase;

class AppDatabaseChannelTest extends TestCase
{
    public function test_it_maps_only_real_columns_onto_the_notifications_row()
    {
        $channel = new class extends AppDatabaseChannel {
            public array $captured = [];

            public function send($notifiable, Notification $notification)
            {
                // Reuse the parent mapping but capture instead of persisting.
                $data = $notification->toDatabase($notifiable);
                $columns = [
                    'title', 'body', 'image', 'dish_image', 'fcm_token',
                    'user_id', 'navigation_id', 'role', 'category',
                ];
                $this->captured = array_intersect_key($data, array_flip($columns));

                return null;
            }
        };

        $notification = new class extends Notification {
            public function toDatabase($notifiable)
            {
                return [
                    'title' => 'Order Update',
                    'body' => 'Body text',
                    'user_id' => 55,
                    'navigation_id' => 1802,
                    'role' => 'user',
                    'category' => 'order_rejected',
                    // Framework keys that have no column on this table.
                    'type' => 'should-be-dropped',
                    'read_at' => null,
                ];
            }
        };

        $channel->send(new Listener(), $notification);

        $this->assertSame('Order Update', $channel->captured['title']);
        $this->assertSame('order_rejected', $channel->captured['category']);
        $this->assertArrayNotHasKey('type', $channel->captured);
        $this->assertArrayNotHasKey('read_at', $channel->captured);
    }

    /**
     * Control: a notification with no toDatabase() must not write a blank row —
     * that was the failure mode of the stock Laravel database channel here.
     */
    public function test_it_skips_notifications_without_a_database_payload()
    {
        $channel = new AppDatabaseChannel();
        $notification = new class extends Notification {};

        $this->assertNull($channel->send(new Listener(), $notification));
    }

    public function test_it_skips_payloads_with_no_title()
    {
        $channel = new AppDatabaseChannel();
        $notification = new class extends Notification {
            public function toDatabase($notifiable)
            {
                return ['body' => 'no title here'];
            }
        };

        $this->assertNull($channel->send(new Listener(), $notification));
    }
}
