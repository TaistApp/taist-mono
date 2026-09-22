<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\AdminApiV2Controller;
use Tests\TestCase;

/**
 * Guards the admin panel's Cancellation section against hiding system-initiated
 * cancellations.
 *
 * The orders endpoint used to gate every cancellation field behind
 * `cancelled_by_user_id`. Nothing sets that column on a system cancellation —
 * ProcessExpiredOrders (the 30-minute acceptance timeout) and the
 * payment-failure void in MapiController both write `cancelled_by_role =
 * 'system'` and leave the id NULL, because no user cancelled the order. So a
 * timed-out order rendered an empty Cancellation block: no type, no reason, no
 * refund amount and no Stripe refund id. An admin could not tell it apart from
 * an order that was never cancelled, despite the customer already having been
 * refunded in full.
 *
 * That is exactly the blind spot that made a real chef's missed order
 * (order 1804, auto-cancelled by timeout) impossible to diagnose from the panel.
 */
class AdminOrderCancellationTest extends TestCase
{
    /** The shape the DB query hands the mapper: a plain row object. */
    private function row(array $attrs): object
    {
        return (object) array_merge([
            'cancelled_by_user_id' => null,
            'cancelled_by_role' => null,
            'cancelled_by_first_name' => null,
            'cancelled_by_last_name' => null,
            'cancelled_by_email' => null,
        ], $attrs);
    }

    /** The regression: a 30-minute timeout must still register as cancelled. */
    public function test_system_timeout_is_treated_as_cancelled(): void
    {
        $order = $this->row([
            'cancelled_by_user_id' => null,
            'cancelled_by_role' => 'system',
        ]);

        $this->assertTrue(AdminApiV2Controller::isCancelled($order));
    }

    /** The payment-failure void is the other actor-less cancellation. */
    public function test_payment_failure_void_is_treated_as_cancelled(): void
    {
        $order = $this->row([
            'cancelled_by_user_id' => null,
            'cancelled_by_role' => 'system',
        ]);

        $this->assertTrue(AdminApiV2Controller::isCancelled($order));
    }

    /** Control: a user-initiated cancellation still registers, as it always did. */
    public function test_customer_cancellation_is_treated_as_cancelled(): void
    {
        $order = $this->row([
            'cancelled_by_user_id' => 1102,
            'cancelled_by_role' => 'customer',
            'cancelled_by_first_name' => 'Divyat',
            'cancelled_by_last_name' => 'Agarwal',
        ]);

        $this->assertTrue(AdminApiV2Controller::isCancelled($order));
    }

    /** Control: an order nobody cancelled must NOT render a cancellation block. */
    public function test_uncancelled_order_is_not_treated_as_cancelled(): void
    {
        $this->assertFalse(AdminApiV2Controller::isCancelled($this->row([])));
    }

    /**
     * A system cancellation has no user row to join, so the name must come back
     * null — not the empty string that a blind trim() of two NULLs produces,
     * which the UI would render as a dangling "System — ".
     */
    public function test_system_cancellation_reports_a_null_actor_name(): void
    {
        $actor = AdminApiV2Controller::cancelledBy($this->row([
            'cancelled_by_role' => 'system',
        ]));

        $this->assertSame('system', $actor['role']);
        $this->assertNull($actor['name']);
        $this->assertNull($actor['email']);
    }

    /** Control: a real actor's name and email still come through intact. */
    public function test_user_cancellation_reports_the_actor_name(): void
    {
        $actor = AdminApiV2Controller::cancelledBy($this->row([
            'cancelled_by_user_id' => 1102,
            'cancelled_by_role' => 'customer',
            'cancelled_by_first_name' => 'Divyat',
            'cancelled_by_last_name' => 'Agarwal',
            'cancelled_by_email' => 'agarwaldivyat7@gmail.com',
        ]));

        $this->assertSame('customer', $actor['role']);
        $this->assertSame('Divyat Agarwal', $actor['name']);
        $this->assertSame('agarwaldivyat7@gmail.com', $actor['email']);
    }

    /** A half-populated name must not leave stray whitespace. */
    public function test_partial_actor_name_is_trimmed(): void
    {
        $actor = AdminApiV2Controller::cancelledBy($this->row([
            'cancelled_by_user_id' => 7,
            'cancelled_by_role' => 'admin',
            'cancelled_by_first_name' => 'Dayne',
            'cancelled_by_last_name' => null,
        ]));

        $this->assertSame('Dayne', $actor['name']);
    }
}
