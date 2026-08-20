<?php

namespace Tests\Unit\Notifications;

use App\Listener;
use App\Notifications\Channels\AppDatabaseChannel;
use App\Notifications\Channels\FirebaseChannel;
use App\Notifications\OrderRejectedNotification;
use Tests\TestCase;

class OrderRejectedNotificationTest extends TestCase
{
    private function order()
    {
        $order = new \stdClass();
        $order->id = 1802;
        $order->menu_id = null;

        return $order;
    }

    private function customer(): Listener
    {
        $user = new Listener();
        $user->id = 55;
        $user->photo = 'chef.jpg';
        $user->fcm_token = 'token-abc';

        return $user;
    }

    public function test_notification_uses_correct_channels()
    {
        $channels = (new OrderRejectedNotification($this->order()))->via($this->customer());

        $this->assertContains(AppDatabaseChannel::class, $channels);
        $this->assertContains(FirebaseChannel::class, $channels);
    }

    public function test_copy_is_softened_and_points_at_similar_chefs()
    {
        $data = (new OrderRejectedNotification($this->order()))->toDatabase($this->customer());

        $this->assertSame('Order Update', $data['title']);
        $this->assertSame(
            "We're sorry - this chef wasn't able to complete your request. Tap to order from similar chefs.",
            $data['body']
        );
    }

    /**
     * Control: the old blunt wording must be gone from both payloads.
     */
    public function test_old_declined_wording_is_no_longer_used()
    {
        $notification = new OrderRejectedNotification($this->order());
        $customer = $this->customer();

        $database = $notification->toDatabase($customer);
        $firebase = $notification->toFirebase($customer);

        $this->assertNotSame('Order Declined', $database['title']);
        $this->assertStringNotContainsString('unable to accept your order', $database['body']);
        $this->assertNotSame('Order Declined', $firebase['title']);
        $this->assertStringNotContainsString('unable to accept your order', $firebase['body']);
    }

    /**
     * The app routes a tapped rejection to the Home tab off these markers.
     */
    public function test_payloads_carry_the_order_rejected_routing_marker()
    {
        $notification = new OrderRejectedNotification($this->order());
        $customer = $this->customer();

        $this->assertSame('order_rejected', $notification->toDatabase($customer)['category']);
        $this->assertSame('order_rejected', $notification->toFirebase($customer)['data']['type']);
    }

    public function test_database_payload_targets_the_customer()
    {
        $data = (new OrderRejectedNotification($this->order()))->toDatabase($this->customer());

        $this->assertSame(55, $data['user_id']);
        $this->assertSame(1802, $data['navigation_id']);
        $this->assertSame('user', $data['role']);
        $this->assertSame('token-abc', $data['fcm_token']);
    }
}
