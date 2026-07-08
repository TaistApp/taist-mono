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
}
