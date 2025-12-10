<?php

namespace Tests\Unit\Notifications;

use Tests\TestCase;
use App\Notifications\OrderAcceptedNotification;
use App\Listener;
use App\Models\Orders;
use App\Notifications\Channels\FirebaseChannel;

class OrderAcceptedNotificationTest extends TestCase
{
    /**
     * Test notification uses correct channels
     */
    public function test_notification_uses_correct_channels()
    {
        $order = new Orders();
        $order->id = 456;

        $notification = new OrderAcceptedNotification($order);
        $user = new Listener();

        $channels = $notification->via($user);

        $this->assertContains('database', $channels);
        $this->assertContains(FirebaseChannel::class, $channels);
    }

    /**
     * Test database notification has correct structure
     */
    public function test_database_notification_has_correct_structure()
    {
        $order = new Orders();
        $order->id = 456;

        $notification = new OrderAcceptedNotification($order);

        $user = new Listener();
        $user->id = 123;
        $user->photo = 'photo.jpg';
        $user->fcm_token = 'test-token';

        $data = $notification->toDatabase($user);

        $this->assertEquals('Order Accepted', $data['title']);
        $this->assertStringContainsString('accepted', strtolower($data['body']));
        $this->assertEquals('photo.jpg', $data['image']);
        $this->assertEquals('test-token', $data['fcm_token']);
        $this->assertEquals(123, $data['user_id']);
        $this->assertEquals(456, $data['navigation_id']);
        $this->assertEquals('user', $data['role']);
    }

    /**
     * Test Firebase notification has correct structure
     */
    public function test_firebase_notification_has_correct_structure()
    {
        $order = new Orders();
        $order->id = 456;

        $notification = new OrderAcceptedNotification($order);

        $user = new Listener();
        $user->id = 123;
        $user->fcm_token = 'test-token';

        $data = $notification->toFirebase($user);

        $this->assertEquals('Order Accepted', $data['title']);
        $this->assertStringContainsString('accepted', strtolower($data['body']));
        $this->assertArrayHasKey('data', $data);
        $this->assertEquals('user', $data['data']['role']);
        $this->assertEquals('456', $data['data']['order_id']);
    }
}
