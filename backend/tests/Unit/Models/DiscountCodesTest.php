<?php

namespace Tests\Unit\Models;

use Tests\TestCase;
use App\Models\DiscountCodes;
use Carbon\Carbon;

/**
 * Unit tests for DiscountCodes model
 * Sprint Task: TMA-007 - Coupon code functionality
 *
 * Tests validation, discount calculation, and formatting
 */
class DiscountCodesTest extends TestCase
{
    // ==========================================
    // isValid() Tests
    // ==========================================

    /**
     * Test active code with no restrictions is valid
     */
    public function test_active_code_is_valid()
    {
        $code = new DiscountCodes([
            'code' => 'TEST10',
            'is_active' => true,
            'discount_type' => 'fixed',
            'discount_value' => 10,
        ]);

        $result = $code->isValid();

        $this->assertTrue($result['valid']);
    }

    /**
     * Test inactive code is invalid
     */
    public function test_inactive_code_is_invalid()
    {
        $code = new DiscountCodes([
            'code' => 'INACTIVE',
            'is_active' => false,
            'discount_type' => 'fixed',
            'discount_value' => 10,
        ]);

        $result = $code->isValid();

        $this->assertFalse($result['valid']);
        $this->assertEquals('This code is no longer active', $result['reason']);
    }

    /**
     * Test code not yet active (future valid_from date)
     */
    public function test_future_code_is_invalid()
    {
        $code = new DiscountCodes([
            'code' => 'FUTURE',
            'is_active' => true,
            'discount_type' => 'fixed',
            'discount_value' => 10,
            'valid_from' => Carbon::now()->addDays(7),
        ]);

        $result = $code->isValid();

        $this->assertFalse($result['valid']);
        $this->assertEquals('This code is not yet active', $result['reason']);
    }

    /**
     * Test expired code is invalid
     */
    public function test_expired_code_is_invalid()
    {
        $code = new DiscountCodes([
            'code' => 'EXPIRED',
            'is_active' => true,
            'discount_type' => 'fixed',
            'discount_value' => 10,
            'valid_until' => Carbon::now()->subDays(1),
        ]);

        $result = $code->isValid();

        $this->assertFalse($result['valid']);
        $this->assertEquals('This code has expired', $result['reason']);
    }

    /**
     * Test code at max uses is invalid
     */
    public function test_max_uses_reached_is_invalid()
    {
        $code = new DiscountCodes([
            'code' => 'MAXED',
            'is_active' => true,
            'discount_type' => 'fixed',
            'discount_value' => 10,
            'max_uses' => 100,
            'current_uses' => 100,
        ]);

        $result = $code->isValid();

        $this->assertFalse($result['valid']);
        $this->assertEquals('This code has reached its maximum number of uses', $result['reason']);
    }

    /**
     * Test code over max uses is invalid
     */
    public function test_over_max_uses_is_invalid()
    {
        $code = new DiscountCodes([
            'code' => 'OVERMAXED',
            'is_active' => true,
            'discount_type' => 'fixed',
            'discount_value' => 10,
            'max_uses' => 100,
            'current_uses' => 150,
        ]);

        $result = $code->isValid();

        $this->assertFalse($result['valid']);
    }

    /**
     * Test code with null max_uses has unlimited uses
     */
    public function test_null_max_uses_allows_unlimited()
    {
        $code = new DiscountCodes([
            'code' => 'UNLIMITED',
            'is_active' => true,
            'discount_type' => 'fixed',
            'discount_value' => 10,
            'max_uses' => null,
            'current_uses' => 1000,
        ]);

        $result = $code->isValid();

        $this->assertTrue($result['valid']);
    }

    /**
     * Test code within valid date range
     */
    public function test_code_within_date_range_is_valid()
    {
        $code = new DiscountCodes([
            'code' => 'INRANGE',
            'is_active' => true,
            'discount_type' => 'fixed',
            'discount_value' => 10,
            'valid_from' => Carbon::now()->subDays(7),
            'valid_until' => Carbon::now()->addDays(7),
        ]);

        $result = $code->isValid();

        $this->assertTrue($result['valid']);
    }

    // ==========================================
    // calculateDiscount() Tests - Fixed Discount
    // ==========================================

    /**
     * Test fixed discount calculation
     */
    public function test_fixed_discount_calculation()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 10,
        ]);

        $result = $code->calculateDiscount(50.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(10.00, $result['discount_amount']);
        $this->assertEquals(40.00, $result['final_amount']);
    }

    /**
     * Test fixed discount doesn't exceed order amount
     */
    public function test_fixed_discount_caps_at_order_amount()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 50,
        ]);

        $result = $code->calculateDiscount(30.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(30.00, $result['discount_amount']);
        $this->assertEquals(0.00, $result['final_amount']);
    }

    /**
     * Test fixed discount with exact order amount
     */
    public function test_fixed_discount_equals_order_amount()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 25,
        ]);

        $result = $code->calculateDiscount(25.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(25.00, $result['discount_amount']);
        $this->assertEquals(0.00, $result['final_amount']);
    }

    // ==========================================
    // calculateDiscount() Tests - Percentage Discount
    // ==========================================

    /**
     * Test percentage discount calculation
     */
    public function test_percentage_discount_calculation()
    {
        $code = new DiscountCodes([
            'discount_type' => 'percentage',
            'discount_value' => 20,
        ]);

        $result = $code->calculateDiscount(100.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(20.00, $result['discount_amount']);
        $this->assertEquals(80.00, $result['final_amount']);
    }

    /**
     * Test percentage discount with maximum cap
     */
    public function test_percentage_discount_respects_max_cap()
    {
        $code = new DiscountCodes([
            'discount_type' => 'percentage',
            'discount_value' => 50,
            'maximum_discount_amount' => 25,
        ]);

        $result = $code->calculateDiscount(100.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(25.00, $result['discount_amount']); // Capped at $25
        $this->assertEquals(75.00, $result['final_amount']);
    }

    /**
     * Test percentage discount below max cap
     */
    public function test_percentage_discount_below_max_cap()
    {
        $code = new DiscountCodes([
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'maximum_discount_amount' => 50,
        ]);

        $result = $code->calculateDiscount(100.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(10.00, $result['discount_amount']);
        $this->assertEquals(90.00, $result['final_amount']);
    }

    /**
     * Test 100% discount
     */
    public function test_full_percentage_discount()
    {
        $code = new DiscountCodes([
            'discount_type' => 'percentage',
            'discount_value' => 100,
        ]);

        $result = $code->calculateDiscount(75.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(75.00, $result['discount_amount']);
        $this->assertEquals(0.00, $result['final_amount']);
    }

    /**
     * Test small percentage discount rounds correctly
     */
    public function test_percentage_discount_rounds_to_two_decimals()
    {
        $code = new DiscountCodes([
            'discount_type' => 'percentage',
            'discount_value' => 15,
        ]);

        $result = $code->calculateDiscount(33.33);

        $this->assertTrue($result['valid']);
        $this->assertEquals(5.00, $result['discount_amount']); // 33.33 * 0.15 = 4.9995 -> 5.00
        $this->assertEquals(28.33, $result['final_amount']);
    }

    // ==========================================
    // calculateDiscount() Tests - Minimum Order
    // ==========================================

    /**
     * Test order below minimum is rejected
     */
    public function test_order_below_minimum_is_rejected()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 10,
            'minimum_order_amount' => 50,
        ]);

        $result = $code->calculateDiscount(30.00);

        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('Minimum order', $result['reason']);
        $this->assertStringContainsString('$50.00', $result['reason']);
    }

    /**
     * Test order at minimum is accepted
     */
    public function test_order_at_minimum_is_accepted()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 10,
            'minimum_order_amount' => 50,
        ]);

        $result = $code->calculateDiscount(50.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(10.00, $result['discount_amount']);
    }

    /**
     * Test order above minimum is accepted
     */
    public function test_order_above_minimum_is_accepted()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 10,
            'minimum_order_amount' => 50,
        ]);

        $result = $code->calculateDiscount(100.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(10.00, $result['discount_amount']);
    }

    /**
     * Test null minimum allows any order
     */
    public function test_null_minimum_allows_any_order()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 5,
            'minimum_order_amount' => null,
        ]);

        $result = $code->calculateDiscount(1.00);

        $this->assertTrue($result['valid']);
    }

    // ==========================================
    // getFormattedDiscount() Tests
    // ==========================================

    /**
     * Test fixed discount formatting
     */
    public function test_formatted_fixed_discount()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 10,
        ]);

        $formatted = $code->getFormattedDiscount();

        $this->assertEquals('$10.00 off', $formatted);
    }

    /**
     * Test fixed discount formatting with decimals
     */
    public function test_formatted_fixed_discount_with_decimals()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 5.50,
        ]);

        $formatted = $code->getFormattedDiscount();

        $this->assertEquals('$5.50 off', $formatted);
    }

    /**
     * Test percentage discount formatting
     * Note: discount_value is cast to decimal:2 so whole numbers become X.00
     */
    public function test_formatted_percentage_discount()
    {
        $code = new DiscountCodes([
            'discount_type' => 'percentage',
            'discount_value' => 20,
        ]);

        $formatted = $code->getFormattedDiscount();

        $this->assertEquals('20.00% off', $formatted);
    }

    /**
     * Test percentage discount formatting with decimals
     * Note: discount_value is cast to decimal:2
     */
    public function test_formatted_percentage_discount_with_decimals()
    {
        $code = new DiscountCodes([
            'discount_type' => 'percentage',
            'discount_value' => 12.5,
        ]);

        $formatted = $code->getFormattedDiscount();

        $this->assertEquals('12.50% off', $formatted);
    }

    // ==========================================
    // Edge Case Tests
    // ==========================================

    /**
     * Test zero order amount
     */
    public function test_zero_order_amount()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 10,
        ]);

        $result = $code->calculateDiscount(0.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(0.00, $result['discount_amount']);
        $this->assertEquals(0.00, $result['final_amount']);
    }

    /**
     * Test very small order amount with fixed discount
     */
    public function test_small_order_with_large_fixed_discount()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 100,
        ]);

        $result = $code->calculateDiscount(5.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(5.00, $result['discount_amount']); // Capped at order amount
        $this->assertEquals(0.00, $result['final_amount']);
    }

    /**
     * Test very large order amount
     */
    public function test_large_order_amount()
    {
        $code = new DiscountCodes([
            'discount_type' => 'percentage',
            'discount_value' => 10,
        ]);

        $result = $code->calculateDiscount(10000.00);

        $this->assertTrue($result['valid']);
        $this->assertEquals(1000.00, $result['discount_amount']);
        $this->assertEquals(9000.00, $result['final_amount']);
    }

    /**
     * Test code attributes are properly cast
     */
    public function test_attributes_are_properly_cast()
    {
        $code = new DiscountCodes([
            'discount_value' => '10.50',
            'minimum_order_amount' => '25.00',
            'is_active' => 1,
            'max_uses' => '100',
        ]);

        // These should be cast to appropriate types
        $this->assertIsBool($code->is_active);
        $this->assertTrue($code->is_active);
        $this->assertIsInt($code->max_uses);
        $this->assertEquals(100, $code->max_uses);
    }

    /**
     * Test response structure for valid discount
     */
    public function test_valid_discount_response_structure()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 10,
        ]);

        $result = $code->calculateDiscount(50.00);

        $this->assertArrayHasKey('valid', $result);
        $this->assertArrayHasKey('discount_amount', $result);
        $this->assertArrayHasKey('final_amount', $result);
    }

    /**
     * Test response structure for invalid discount
     */
    public function test_invalid_discount_response_structure()
    {
        $code = new DiscountCodes([
            'discount_type' => 'fixed',
            'discount_value' => 10,
            'minimum_order_amount' => 100,
        ]);

        $result = $code->calculateDiscount(50.00);

        $this->assertArrayHasKey('valid', $result);
        $this->assertArrayHasKey('reason', $result);
        $this->assertFalse($result['valid']);
    }
}
