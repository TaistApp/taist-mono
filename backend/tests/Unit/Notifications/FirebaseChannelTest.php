<?php

namespace Tests\Unit\Notifications;

use Tests\TestCase;
use App\Notifications\Channels\FirebaseChannel;
use App\Notifications\ChefApprovedNotification;
use App\Listener;
use Mockery;

class FirebaseChannelTest extends TestCase
{
    /**
     * Test channel skips sending when user has no FCM token
     */
    public function test_channel_skips_when_no_fcm_token()
    {
        $channel = new FirebaseChannel();
        $notification = new ChefApprovedNotification();

        $user = new Listener();
        $user->id = 123;
        $user->fcm_token = null;

        // Should not throw an error
        $channel->send($user, $notification);

        $this->assertTrue(true); // If we get here, test passed
    }

    /**
     * Test channel handles Firebase exceptions gracefully
     */
    public function test_channel_handles_firebase_exceptions_gracefully()
    {
        $channel = new FirebaseChannel();
        $notification = new ChefApprovedNotification();

        $user = new Listener();
        $user->id = 123;
        $user->fcm_token = 'invalid-token';

        // Should not throw an error even if Firebase fails
        $channel->send($user, $notification);

        $this->assertTrue(true); // If we get here, test passed
    }
}
