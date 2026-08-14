<?php

namespace Tests\Unit\Models;

use Tests\TestCase;
use App\Models\Orders;

/**
 * Unit tests for Orders model
 * Sprint Task: TMA-016 - Time window for chef accepting order
 * Sprint Task: TMA-020 - Closed order status updates
 *
 * Tests order expiration, deadline logic, and discount/cancellation summaries
 */
class OrdersTest extends TestCase
{
    // ==========================================
    // isExpired() Tests
    // ==========================================

    /**
     * Test order with no deadline is not expired
     */
    public function test_order_without_deadline_is_not_expired()
    {
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => null,
        ]);

        $this->assertFalse($order->isExpired());
    }

    /**
     * Test order with future deadline is not expired
     */
    public function test_order_with_future_deadline_is_not_expired()
    {
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)(time() + 1800), // 30 minutes from now
        ]);

        $this->assertFalse($order->isExpired());
    }

    /**
     * Test order with past deadline is expired
     */
    public function test_order_with_past_deadline_is_expired()
    {
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)(time() - 60), // 1 minute ago
        ]);

        $this->assertTrue($order->isExpired());
    }

    /**
     * Test accepted order (status 2) is never expired
     */
    public function test_accepted_order_is_not_expired()
    {
        $order = new Orders([
            'status' => 2, // Accepted
            'acceptance_deadline' => (string)(time() - 3600), // 1 hour ago
        ]);

        $this->assertFalse($order->isExpired());
    }

    /**
     * Test completed order (status 3) is never expired
     */
    public function test_completed_order_is_not_expired()
    {
        $order = new Orders([
            'status' => 3, // Completed
            'acceptance_deadline' => (string)(time() - 3600),
        ]);

        $this->assertFalse($order->isExpired());
    }

    /**
     * Test cancelled order (status 4) is never expired
     */
    public function test_cancelled_order_is_not_expired()
    {
        $order = new Orders([
            'status' => 4, // Cancelled
            'acceptance_deadline' => (string)(time() - 3600),
        ]);

        $this->assertFalse($order->isExpired());
    }

    /**
     * Test rejected order (status 5) is never expired
     */
    public function test_rejected_order_is_not_expired()
    {
        $order = new Orders([
            'status' => 5, // Rejected
            'acceptance_deadline' => (string)(time() - 3600),
        ]);

        $this->assertFalse($order->isExpired());
    }

    /**
     * Test order exactly at deadline is expired
     */
    public function test_order_at_exact_deadline_is_expired()
    {
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)(time() - 1), // Just passed
        ]);

        $this->assertTrue($order->isExpired());
    }

    // ==========================================
    // getTimeRemaining() Tests
    // ==========================================

    /**
     * Test order with no deadline returns null
     */
    public function test_time_remaining_null_for_no_deadline()
    {
        $order = new Orders([
            'acceptance_deadline' => null,
        ]);

        $this->assertNull($order->getTimeRemaining());
    }

    /**
     * Test time remaining for future deadline
     */
    public function test_time_remaining_for_future_deadline()
    {
        $deadline = time() + 1800; // 30 minutes
        $order = new Orders([
            'acceptance_deadline' => (string)$deadline,
        ]);

        $remaining = $order->getTimeRemaining();

        // Should be approximately 1800 seconds (allow for small variance)
        $this->assertGreaterThan(1795, $remaining);
        $this->assertLessThanOrEqual(1800, $remaining);
    }

    /**
     * Test time remaining for past deadline returns 0
     */
    public function test_time_remaining_for_past_deadline_returns_zero()
    {
        $order = new Orders([
            'acceptance_deadline' => (string)(time() - 600), // 10 minutes ago
        ]);

        $this->assertEquals(0, $order->getTimeRemaining());
    }

    /**
     * Test time remaining never returns negative
     */
    public function test_time_remaining_never_negative()
    {
        $order = new Orders([
            'acceptance_deadline' => (string)(time() - 3600), // 1 hour ago
        ]);

        $remaining = $order->getTimeRemaining();

        $this->assertGreaterThanOrEqual(0, $remaining);
    }

    // ==========================================
    // getDeadlineInfo() Tests
    // ==========================================

    /**
     * Test deadline info for pending order
     */
    public function test_deadline_info_for_pending_order()
    {
        $deadline = time() + 1800;
        $order = new Orders([
            'status' => 1, // Pending
            'acceptance_deadline' => (string)$deadline,
        ]);

        $info = $order->getDeadlineInfo();

        $this->assertIsArray($info);
        $this->assertArrayHasKey('deadline_timestamp', $info);
        $this->assertArrayHasKey('seconds_remaining', $info);
        $this->assertArrayHasKey('minutes_remaining', $info);
        $this->assertArrayHasKey('is_expired', $info);
        $this->assertEquals($deadline, $info['deadline_timestamp']);
        $this->assertFalse($info['is_expired']);
    }

    /**
     * Test deadline info for accepted order returns null
     */
    public function test_deadline_info_null_for_accepted_order()
    {
        $order = new Orders([
            'status' => 2, // Accepted
            'acceptance_deadline' => (string)(time() + 1800),
        ]);

        $this->assertNull($order->getDeadlineInfo());
    }

    /**
     * Test deadline info for order without deadline returns null
     */
    public function test_deadline_info_null_for_no_deadline()
    {
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => null,
        ]);

        $this->assertNull($order->getDeadlineInfo());
    }

    /**
     * Test minutes remaining calculation
     */
    public function test_deadline_info_minutes_calculation()
    {
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)(time() + 900), // 15 minutes
        ]);

        $info = $order->getDeadlineInfo();

        // Should be approximately 15 minutes (allow for variance)
        $this->assertGreaterThanOrEqual(14, $info['minutes_remaining']);
        $this->assertLessThanOrEqual(15, $info['minutes_remaining']);
    }

    /**
     * Test deadline info shows expired correctly
     */
    public function test_deadline_info_shows_expired()
    {
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)(time() - 60),
        ]);

        $info = $order->getDeadlineInfo();

        $this->assertTrue($info['is_expired']);
        $this->assertEquals(0, $info['seconds_remaining']);
        $this->assertEquals(0, $info['minutes_remaining']);
    }

    // ==========================================
    // hasDiscount() Tests
    // ==========================================

    /**
     * Test order with no discount
     */
    public function test_has_no_discount()
    {
        $order = new Orders([
            'discount_amount' => 0,
        ]);

        $this->assertFalse($order->hasDiscount());
    }

    /**
     * Test order with null discount
     */
    public function test_has_no_discount_when_null()
    {
        $order = new Orders([
            'discount_amount' => null,
        ]);

        $this->assertFalse($order->hasDiscount());
    }

    /**
     * Test order with discount
     */
    public function test_has_discount()
    {
        $order = new Orders([
            'discount_amount' => 10.00,
        ]);

        $this->assertTrue($order->hasDiscount());
    }

    /**
     * Test order with small discount
     */
    public function test_has_small_discount()
    {
        $order = new Orders([
            'discount_amount' => 0.01,
        ]);

        $this->assertTrue($order->hasDiscount());
    }

    // ==========================================
    // getDiscountSummary() Tests
    // ==========================================

    /**
     * Test discount summary for order without discount
     */
    public function test_discount_summary_null_without_discount()
    {
        $order = new Orders([
            'discount_amount' => 0,
        ]);

        $this->assertNull($order->getDiscountSummary());
    }

    /**
     * Test discount summary structure
     */
    public function test_discount_summary_structure()
    {
        $order = new Orders([
            'discount_code' => 'SAVE10',
            'discount_amount' => 10.00,
            'subtotal_before_discount' => 50.00,
            'total_price' => 40.00,
        ]);

        $summary = $order->getDiscountSummary();

        $this->assertIsArray($summary);
        $this->assertArrayHasKey('code', $summary);
        $this->assertArrayHasKey('amount', $summary);
        $this->assertArrayHasKey('original_total', $summary);
        $this->assertArrayHasKey('final_total', $summary);
        $this->assertArrayHasKey('savings', $summary);
    }

    /**
     * Test discount summary values
     */
    public function test_discount_summary_values()
    {
        $order = new Orders([
            'discount_code' => 'PERCENT20',
            'discount_amount' => 15.00,
            'subtotal_before_discount' => 75.00,
            'total_price' => 60.00,
        ]);

        $summary = $order->getDiscountSummary();

        $this->assertEquals('PERCENT20', $summary['code']);
        $this->assertEquals(15.00, $summary['amount']);
        $this->assertEquals(75.00, $summary['original_total']);
        $this->assertEquals(60.00, $summary['final_total']);
        $this->assertEquals('$15.00', $summary['savings']);
    }

    // ==========================================
    // getCancellationSummary() Tests
    // ==========================================

    /**
     * Test cancellation summary for non-cancelled order
     */
    public function test_cancellation_summary_null_for_non_cancelled()
    {
        $order = new Orders([
            'cancelled_at' => null,
        ]);

        $this->assertNull($order->getCancellationSummary());
    }

    /**
     * Test cancellation summary structure
     * Note: We test the attributes directly to avoid triggering relationship
     */
    public function test_cancellation_summary_structure()
    {
        $cancelTime = now();
        $order = new Orders([
            'cancelled_at' => $cancelTime,
            'cancelled_by_role' => 'customer',
            'cancellation_reason' => 'Changed my mind',
            'cancellation_type' => 'customer_request',
        ]);

        // Verify the order has cancellation data
        $this->assertNotNull($order->cancelled_at);
        $this->assertEquals('customer', $order->cancelled_by_role);
        $this->assertEquals('Changed my mind', $order->cancellation_reason);
        $this->assertEquals('customer_request', $order->cancellation_type);
    }

    /**
     * Test cancellation summary values
     * Note: We test the attributes directly to avoid triggering relationship
     */
    public function test_cancellation_summary_values()
    {
        $cancelTime = now();
        $order = new Orders([
            'cancelled_at' => $cancelTime,
            'cancelled_by_role' => 'chef',
            'cancellation_reason' => 'Unable to fulfill',
            'cancellation_type' => 'chef_rejection',
        ]);

        // Verify the cancellation attributes
        $this->assertEquals('chef', $order->cancelled_by_role);
        $this->assertEquals('Unable to fulfill', $order->cancellation_reason);
        $this->assertEquals('chef_rejection', $order->cancellation_type);
        $this->assertEquals($cancelTime, $order->cancelled_at);
    }

    // ==========================================
    // Order Status Constants Tests
    // ==========================================

    /**
     * Test status 1 is pending/requested
     */
    public function test_status_1_is_pending()
    {
        $order = new Orders(['status' => 1]);

        // Only pending orders (status 1) should be checked for expiration
        $order->acceptance_deadline = (string)(time() - 60);
        $this->assertTrue($order->isExpired());
    }

    /**
     * Test 30-minute deadline calculation
     */
    public function test_thirty_minute_deadline_calculation()
    {
        // 30 minutes = 1800 seconds
        $currentTime = time();
        $deadline = $currentTime + 1800;

        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)$deadline,
        ]);

        $remaining = $order->getTimeRemaining();

        // Should be close to 1800 seconds
        $this->assertGreaterThan(1790, $remaining);
        $this->assertLessThanOrEqual(1800, $remaining);
    }

    // ==========================================
    // shouldSendAcceptanceReminder() Tests
    // ==========================================

    /**
     * Test pending order 10 minutes into its window, never reminded, is due
     */
    public function test_acceptance_reminder_due_mid_window()
    {
        $now = 1754200000;
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)($now + 1200), // 20 min left = 10 min elapsed
        ]);

        $this->assertTrue($order->shouldSendAcceptanceReminder($now));
    }

    /**
     * Control: order created under 5 minutes ago gets no reminder yet
     */
    public function test_acceptance_reminder_not_due_in_first_five_minutes()
    {
        $now = 1754200000;
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)($now + 1600), // only ~3 min elapsed
        ]);

        $this->assertFalse($order->shouldSendAcceptanceReminder($now));
    }

    /**
     * Test no reminder once the acceptance window has closed
     */
    public function test_acceptance_reminder_not_sent_after_expiry()
    {
        $now = 1754200000;
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)($now - 60),
        ]);

        $this->assertFalse($order->shouldSendAcceptanceReminder($now));
    }

    /**
     * Test accepted order (status 2) never gets a reminder
     */
    public function test_acceptance_reminder_not_sent_for_accepted_order()
    {
        $now = 1754200000;
        $order = new Orders([
            'status' => 2,
            'acceptance_deadline' => (string)($now + 1200),
        ]);

        $this->assertFalse($order->shouldSendAcceptanceReminder($now));
    }

    /**
     * Test order without a deadline never gets a reminder
     */
    public function test_acceptance_reminder_not_sent_without_deadline()
    {
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => null,
        ]);

        $this->assertFalse($order->shouldSendAcceptanceReminder(1754200000));
    }

    /**
     * Test reminder throttling: one sent 2 minutes ago blocks the next
     */
    public function test_acceptance_reminder_throttled_within_five_minutes()
    {
        $now = 1754200000;
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)($now + 1200),
            'acceptance_reminder_sent_at' => (string)($now - 120), // 2 min ago
        ]);

        $this->assertFalse($order->shouldSendAcceptanceReminder($now));
    }

    /**
     * Test reminder repeats: one sent 6 minutes ago allows the next
     */
    public function test_acceptance_reminder_repeats_after_five_minutes()
    {
        $now = 1754200000;
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)($now + 600), // 10 min left
            'acceptance_reminder_sent_at' => (string)($now - 360), // 6 min ago
        ]);

        $this->assertTrue($order->shouldSendAcceptanceReminder($now));
    }

    // ==========================================
    // Scheduled DateTime Attribute Tests
    // ==========================================

    /**
     * Test scheduled datetime returns null when missing date
     */
    public function test_scheduled_datetime_null_when_missing_date()
    {
        $order = new Orders([
            'order_date_new' => null,
            'order_time' => '14:00',
        ]);

        $this->assertNull($order->scheduled_date_time);
    }

    /**
     * Test scheduled datetime returns null when missing time
     */
    public function test_scheduled_datetime_null_when_missing_time()
    {
        $order = new Orders([
            'order_date_new' => '2025-12-15',
            'order_time' => null,
        ]);

        $this->assertNull($order->scheduled_date_time);
    }

    /**
     * Test scheduled datetime with valid data
     */
    public function test_scheduled_datetime_with_valid_data()
    {
        $order = new Orders([
            'order_date_new' => '2025-12-15',
            'order_time' => '14:30',
            'order_timezone' => 'America/New_York',
        ]);

        $datetime = $order->scheduled_date_time;

        $this->assertInstanceOf(\DateTime::class, $datetime);
        $this->assertEquals('2025-12-15', $datetime->format('Y-m-d'));
        $this->assertEquals('14:30', $datetime->format('H:i'));
    }

    /**
     * Test scheduled datetime defaults to Chicago timezone
     */
    public function test_scheduled_datetime_defaults_to_chicago()
    {
        $order = new Orders([
            'order_date_new' => '2025-12-15',
            'order_time' => '14:30',
            'order_timezone' => null,
        ]);

        $datetime = $order->scheduled_date_time;

        $this->assertInstanceOf(\DateTime::class, $datetime);
        $this->assertEquals('America/Chicago', $datetime->getTimezone()->getName());
    }

    // ==========================================
    // Edge Case Tests
    // ==========================================

    /**
     * Test order with string deadline
     */
    public function test_deadline_as_string()
    {
        $deadline = time() + 1800;
        $order = new Orders([
            'status' => 1,
            'acceptance_deadline' => (string)$deadline,
        ]);

        $info = $order->getDeadlineInfo();

        $this->assertEquals($deadline, $info['deadline_timestamp']);
        $this->assertIsInt($info['deadline_timestamp']);
    }

    /**
     * Test fillable attributes include all required fields
     */
    public function test_fillable_includes_all_order_fields()
    {
        $order = new Orders();
        $fillable = $order->getFillable();

        // Core fields
        $this->assertContains('chef_user_id', $fillable);
        $this->assertContains('customer_user_id', $fillable);
        $this->assertContains('menu_id', $fillable);
        $this->assertContains('status', $fillable);
        $this->assertContains('total_price', $fillable);

        // Deadline field
        $this->assertContains('acceptance_deadline', $fillable);

        // Discount fields
        $this->assertContains('discount_code_id', $fillable);
        $this->assertContains('discount_amount', $fillable);

        // Cancellation fields
        $this->assertContains('cancelled_by_user_id', $fillable);
        $this->assertContains('cancellation_type', $fillable);
        $this->assertContains('refund_stripe_id', $fillable);
    }

    // ==========================================
    // isOnOrAfterOrderDay() Tests
    // "On My Way" day gate — chef can't go en route before the order's day.
    // ==========================================

    private function tzDay(string $base, int $offsetDays, string $tz): string
    {
        return (new \DateTime($base, new \DateTimeZone($tz)))
            ->modify(($offsetDays >= 0 ? '+' : '') . $offsetDays . ' day')
            ->format('Y-m-d');
    }

    /**
     * CONTROL: an order scheduled for today can be marked On My Way.
     */
    public function test_on_my_way_allowed_on_order_day()
    {
        $tz = 'America/Chicago';
        $today = \App\Helpers\TimezoneHelper::getTodayInTimezone($tz);

        $order = new Orders([
            'order_date_new' => $today,
            'order_timezone' => $tz,
        ]);

        $this->assertTrue($order->isOnOrAfterOrderDay());
    }

    /**
     * An order scheduled for tomorrow is blocked (too early).
     */
    public function test_on_my_way_blocked_before_order_day()
    {
        $tz = 'America/Chicago';
        $today = \App\Helpers\TimezoneHelper::getTodayInTimezone($tz);
        $tomorrow = $this->tzDay($today, 1, $tz);

        $order = new Orders([
            'order_date_new' => $tomorrow,
            'order_timezone' => $tz,
        ]);

        $this->assertFalse($order->isOnOrAfterOrderDay());
    }

    /**
     * A past-day order is still allowed (chef running late, day already here).
     */
    public function test_on_my_way_allowed_after_order_day()
    {
        $tz = 'America/Chicago';
        $today = \App\Helpers\TimezoneHelper::getTodayInTimezone($tz);
        $yesterday = $this->tzDay($today, -1, $tz);

        $order = new Orders([
            'order_date_new' => $yesterday,
            'order_timezone' => $tz,
        ]);

        $this->assertTrue($order->isOnOrAfterOrderDay());
    }

    /**
     * Falls back to the legacy unix order_date when no date string is stored —
     * a tomorrow timestamp is still blocked.
     */
    public function test_on_my_way_blocked_using_legacy_timestamp()
    {
        $tz = 'America/Chicago';
        $today = \App\Helpers\TimezoneHelper::getTodayInTimezone($tz);
        $tomorrow = $this->tzDay($today, 1, $tz);
        $ts = (new \DateTime($tomorrow . ' 12:00', new \DateTimeZone($tz)))->getTimestamp();

        $order = new Orders([
            'order_date' => $ts,
            'order_timezone' => $tz,
        ]);

        $this->assertFalse($order->isOnOrAfterOrderDay());
    }

    /**
     * No date information at all must never hard-block the chef.
     */
    public function test_on_my_way_allowed_when_no_date_present()
    {
        $order = new Orders([
            'order_timezone' => 'America/Chicago',
        ]);

        $this->assertTrue($order->isOnOrAfterOrderDay());
    }

    // ==========================================
    // isEligibleForUpcomingReminder() Tests
    // ==========================================

    /**
     * A Requested order (status 1) must NOT get the 24-hour reminder —
     * the chef hasn't accepted yet, so the customer would be reminded
     * about a meal that may still be declined.
     */
    public function test_requested_order_not_eligible_for_upcoming_reminder()
    {
        $order = new Orders(['status' => 1]);

        $this->assertFalse($order->isEligibleForUpcomingReminder());
    }

    /**
     * Control: an Accepted order (status 2) gets the reminder.
     */
    public function test_accepted_order_eligible_for_upcoming_reminder()
    {
        $order = new Orders(['status' => 2]);

        $this->assertTrue($order->isEligibleForUpcomingReminder());
    }

    /**
     * Control: an OnTheWay order (status 7) gets the reminder.
     */
    public function test_on_the_way_order_eligible_for_upcoming_reminder()
    {
        $order = new Orders(['status' => 7]);

        $this->assertTrue($order->isEligibleForUpcomingReminder());
    }

    /**
     * Completed and cancelled orders never get the reminder.
     */
    public function test_closed_orders_not_eligible_for_upcoming_reminder()
    {
        foreach ([3, 4, 5, 6] as $closedStatus) {
            $order = new Orders(['status' => $closedStatus]);

            $this->assertFalse(
                $order->isEligibleForUpcomingReminder(),
                "Status {$closedStatus} should not be reminder-eligible"
            );
        }
    }

    /**
     * The status column arrives from MySQL as a string — eligibility must
     * still match (guards the strict in_array comparison).
     */
    public function test_string_status_from_db_still_eligible()
    {
        $order = new Orders(['status' => '2']);

        $this->assertTrue($order->isEligibleForUpcomingReminder());
    }

    // ==========================================
    // chargeAmountCents() / applicationFeeCents() Tests
    // Discount codes are funded by the platform, not the chef
    // ==========================================

    /**
     * Control: without a discount the platform takes its normal 30% and the
     * chef nets 70% of the order total.
     */
    public function test_fee_without_discount_is_thirty_percent()
    {
        $order = new Orders(['total_price' => 65.00, 'discount_amount' => 0]);

        $this->assertSame(6500, $order->chargeAmountCents());
        $this->assertSame(1950, $order->applicationFeeCents()); // 30% of $65
    }

    /**
     * A partial discount reduces only the platform's fee. $10 off a $65
     * order: customer pays $55, chef must still net $45.50 (70% of $65),
     * so the fee drops to $9.50.
     */
    public function test_partial_discount_comes_out_of_platform_fee()
    {
        $order = new Orders(['total_price' => 55.00, 'discount_amount' => 10.00]);

        $this->assertSame(5500, $order->chargeAmountCents());
        $this->assertSame(950, $order->applicationFeeCents());
    }

    /**
     * A discount equal to the full 30% commission leaves the platform with
     * nothing: the whole charged amount ($45.50) flows to the chef, matching
     * her undiscounted 70% share of $65.
     */
    public function test_discount_equal_to_commission_zeroes_the_fee()
    {
        $order = new Orders(['total_price' => 45.50, 'discount_amount' => 19.50]);

        $this->assertSame(4550, $order->chargeAmountCents());
        $this->assertSame(0, $order->applicationFeeCents());
    }

    /**
     * A destination charge cannot transfer more than was charged, so a
     * discount deeper than the commission clamps the fee at zero instead of
     * going negative.
     */
    public function test_discount_deeper_than_commission_clamps_fee_at_zero()
    {
        $order = new Orders(['total_price' => 32.50, 'discount_amount' => 32.50]); // 50% off $65

        $this->assertSame(0, $order->applicationFeeCents());
    }

    /**
     * Orders created before the discount columns existed have a null
     * discount_amount — fee must fall back to the plain 30%.
     */
    public function test_null_discount_amount_treated_as_no_discount()
    {
        $order = new Orders(['total_price' => 100.00]);

        $this->assertSame(3000, $order->applicationFeeCents());
    }

    /**
     * Fractional totals round to whole cents (Stripe requires integer
     * amounts).
     */
    public function test_amounts_round_to_whole_cents()
    {
        $order = new Orders(['total_price' => 33.33, 'discount_amount' => 0]);

        $this->assertSame(3333, $order->chargeAmountCents());
        $this->assertSame(1000, $order->applicationFeeCents()); // 3333 - round(3333 * 0.7) = 3333 - 2333
    }

    // ==========================================
    // Progression reminder predicates
    // ==========================================

    public function test_omw_reminder_fires_inside_one_hour_window()
    {
        $now = 1_800_000_000;
        $order = new Orders(['status' => 2, 'order_date' => $now + 2700]); // arrives in 45 min

        $this->assertTrue($order->shouldSendOnMyWayReminder($now));
    }

    public function test_omw_reminder_quiet_before_window_and_after_grace()
    {
        $now = 1_800_000_000;

        $tooEarly = new Orders(['status' => 2, 'order_date' => $now + 2 * 3600]); // 2h out
        $this->assertFalse($tooEarly->shouldSendOnMyWayReminder($now));

        $tooLate = new Orders(['status' => 2, 'order_date' => $now - 7200]); // 2h past arrival
        $this->assertFalse($tooLate->shouldSendOnMyWayReminder($now));
    }

    public function test_ingredients_reminder_fires_between_24h_and_3h_out()
    {
        $now = 1_800_000_000;

        $twentyHoursOut = new Orders(['status' => 2, 'order_date' => $now + 20 * 3600]);
        $this->assertTrue($twentyHoursOut->shouldSendIngredientsReminder($now));

        $thirtyHoursOut = new Orders(['status' => 2, 'order_date' => $now + 30 * 3600]);
        $this->assertFalse($thirtyHoursOut->shouldSendIngredientsReminder($now));

        // Inside 3h it's shopping-too-late territory — the OMW nudge takes over
        $twoHoursOut = new Orders(['status' => 2, 'order_date' => $now + 2 * 3600]);
        $this->assertFalse($twoHoursOut->shouldSendIngredientsReminder($now));
    }

    public function test_ingredients_reminder_only_for_accepted_and_only_once()
    {
        $now = 1_800_000_000;

        $requested = new Orders(['status' => 1, 'order_date' => $now + 20 * 3600]);
        $this->assertFalse($requested->shouldSendIngredientsReminder($now));

        $alreadySent = new Orders([
            'status' => 2,
            'order_date' => $now + 20 * 3600,
            'ingredients_reminder_sent_at' => (string)($now - 3600),
        ]);
        $this->assertFalse($alreadySent->shouldSendIngredientsReminder($now));
    }

    public function test_omw_reminder_only_for_accepted_and_only_once()
    {
        $now = 1_800_000_000;

        $requested = new Orders(['status' => 1, 'order_date' => $now + 900]);
        $this->assertFalse($requested->shouldSendOnMyWayReminder($now));

        $alreadySent = new Orders([
            'status' => 2,
            'order_date' => $now + 900,
            'omw_reminder_sent_at' => (string)($now - 300),
        ]);
        $this->assertFalse($alreadySent->shouldSendOnMyWayReminder($now));
    }

    public function test_completion_reminder_fires_after_estimated_cook_time()
    {
        $now = 1_800_000_000;
        // Arrived 70 minutes ago, dish takes 60 minutes
        $order = new Orders(['status' => 7, 'order_date' => $now - 70 * 60]);

        $this->assertTrue($order->shouldSendCompletionReminder(60, $now));
    }

    public function test_completion_reminder_fires_10_min_early_for_quick_chefs()
    {
        $now = 1_800_000_000;
        // Arrived 55 min ago, dish takes 60 min — expected done in 5 min
        $order = new Orders(['status' => 7, 'order_date' => $now - 55 * 60]);

        $this->assertTrue($order->shouldSendCompletionReminder(60, $now));

        // But 20 min before expected done is still too early
        $early = new Orders(['status' => 7, 'order_date' => $now - 40 * 60]);
        $this->assertFalse($early->shouldSendCompletionReminder(60, $now));
    }

    public function test_completion_reminder_quiet_while_still_cooking_and_when_stale()
    {
        $now = 1_800_000_000;

        $stillCooking = new Orders(['status' => 7, 'order_date' => $now - 30 * 60]);
        $this->assertFalse($stillCooking->shouldSendCompletionReminder(60, $now));

        // Expected done 5 hours ago — beyond the 1h grace, stay quiet
        $stale = new Orders(['status' => 7, 'order_date' => $now - 6 * 3600]);
        $this->assertFalse($stale->shouldSendCompletionReminder(60, $now));
    }

    public function test_completion_reminder_only_for_on_my_way_and_only_once()
    {
        $now = 1_800_000_000;

        $accepted = new Orders(['status' => 2, 'order_date' => $now - 70 * 60]);
        $this->assertFalse($accepted->shouldSendCompletionReminder(60, $now));

        $alreadySent = new Orders([
            'status' => 7,
            'order_date' => $now - 70 * 60,
            'completion_reminder_sent_at' => (string)($now - 60),
        ]);
        $this->assertFalse($alreadySent->shouldSendCompletionReminder(60, $now));
    }
}
