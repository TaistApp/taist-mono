<?php

namespace Tests\Unit\Notifications;

use App\Listener;
use App\Notifications\Channels\AppDatabaseChannel;
use App\Notifications\Channels\FirebaseChannel;
use App\Notifications\NewMessageNotification;
use Tests\TestCase;

class NewMessageNotificationTest extends TestCase
{
    private function chef(): Listener
    {
        $chef = new Listener();
        $chef->id = 9;
        $chef->first_name = 'Chikondi';
        $chef->last_name = 'Mwale';
        $chef->photo = 'chikondi.jpg';
        $chef->user_type = 2;

        return $chef;
    }

    private function customer(): Listener
    {
        $customer = new Listener();
        $customer->id = 55;
        $customer->fcm_token = 'token-abc';
        $customer->user_type = 1;

        return $customer;
    }

    public function test_notification_uses_correct_channels()
    {
        $channels = (new NewMessageNotification($this->chef(), 1802, 'Hi'))->via($this->customer());

        $this->assertContains(AppDatabaseChannel::class, $channels);
        $this->assertContains(FirebaseChannel::class, $channels);
    }

    public function test_title_uses_first_name_and_last_initial()
    {
        $notification = new NewMessageNotification($this->chef(), 1802, 'Are you free tomorrow?');

        $this->assertSame(
            'New message from Chikondi M.',
            $notification->toDatabase($this->customer())['title']
        );
    }

    /**
     * Control: a sender with no last name still gets a usable title.
     */
    public function test_title_falls_back_when_last_name_is_missing()
    {
        $chef = $this->chef();
        $chef->last_name = null;

        $notification = new NewMessageNotification($chef, 1802, 'Hello');

        $this->assertSame(
            'New message from Chikondi',
            $notification->toDatabase($this->customer())['title']
        );
    }

    public function test_body_previews_the_message_and_truncates_long_ones()
    {
        $short = new NewMessageNotification($this->chef(), 1802, 'Are you free tomorrow?');
        $this->assertSame('Are you free tomorrow?', $short->toDatabase($this->customer())['body']);

        $long = new NewMessageNotification($this->chef(), 1802, str_repeat('a', 400));
        $body = $long->toDatabase($this->customer())['body'];

        $this->assertSame(120, mb_strlen($body));
        $this->assertStringEndsWith('...', $body);
    }

    public function test_firebase_payload_carries_routing_data_for_the_chat_screen()
    {
        $data = (new NewMessageNotification($this->chef(), 1802, 'Hi'))
            ->toFirebase($this->customer())['data'];

        $this->assertSame('chat_message', $data['type']);
        $this->assertSame('1802', $data['order_id']);
        $this->assertSame('9', $data['sender_id']);
        $this->assertSame('Chikondi', $data['sender_first_name']);
        $this->assertSame('Mwale', $data['sender_last_name']);
        $this->assertSame('chikondi.jpg', $data['sender_photo']);
        $this->assertSame('user', $data['role']);
    }

    public function test_role_reflects_the_recipient_not_the_sender()
    {
        $chefRecipient = $this->chef();
        $customerSender = $this->customer();

        $data = (new NewMessageNotification($customerSender, 1802, 'Hi'))->toDatabase($chefRecipient);

        $this->assertSame('chef', $data['role']);
    }
}
