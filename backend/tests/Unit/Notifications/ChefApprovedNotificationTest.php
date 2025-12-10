<?php

namespace Tests\Unit\Notifications;

use Tests\TestCase;
use App\Notifications\ChefApprovedNotification;
use App\Listener;
use App\Notifications\Channels\FirebaseChannel;

class ChefApprovedNotificationTest extends TestCase
{
    /**
     * Test notification uses correct channels
     */
    public function test_notification_uses_correct_channels()
    {
        $notification = new ChefApprovedNotification();
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
        $notification = new ChefApprovedNotification();

        $user = new Listener();
        $user->id = 123;
        $user->photo = 'photo.jpg';
        $user->fcm_token = 'test-token';

        $data = $notification->toDatabase($user);

        $this->assertEquals('Chef Account Activated', $data['title']);
        $this->assertStringContainsString('approved', $data['body']);
        $this->assertEquals('photo.jpg', $data['image']);
        $this->assertEquals('test-token', $data['fcm_token']);
        $this->assertEquals(123, $data['user_id']);
        $this->assertEquals(123, $data['navigation_id']);
        $this->assertEquals('chef', $data['role']);
    }

    /**
     * Test Firebase notification has correct structure
     */
    public function test_firebase_notification_has_correct_structure()
    {
        $notification = new ChefApprovedNotification();

        $user = new Listener();
        $user->id = 123;
        $user->fcm_token = 'test-token';

        $data = $notification->toFirebase($user);

        $this->assertEquals('Chef Account Activated', $data['title']);
        $this->assertStringContainsString('approved', $data['body']);
        $this->assertArrayHasKey('data', $data);
        $this->assertEquals('chef', $data['data']['role']);
        $this->assertEquals('123', $data['data']['order_id']);
    }

    /**
     * Test notification handles missing photo gracefully
     */
    public function test_notification_handles_missing_photo()
    {
        $notification = new ChefApprovedNotification();

        $user = new Listener();
        $user->id = 123;
        $user->fcm_token = 'test-token';
        // photo is null

        $data = $notification->toDatabase($user);

        $this->assertEquals('N/A', $data['image']);
    }
}
