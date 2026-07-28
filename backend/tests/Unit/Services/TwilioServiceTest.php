<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\TwilioService;
use ReflectionClass;

/**
 * Unit tests for TwilioService
 * Sprint Task: TMA-001 - Twilio text notifications
 *
 * Tests phone number formatting, message truncation, and service configuration
 */
class TwilioServiceTest extends TestCase
{
    protected $twilioService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->twilioService = new TwilioService();
    }

    /**
     * Helper to call private methods via reflection
     */
    protected function callPrivateMethod($object, $methodName, array $parameters = [])
    {
        $reflection = new ReflectionClass(get_class($object));
        $method = $reflection->getMethod($methodName);
        $method->setAccessible(true);
        return $method->invokeArgs($object, $parameters);
    }

    // ==========================================
    // Phone Number Formatting Tests
    // ==========================================

    /**
     * Test 10-digit US phone number gets +1 prefix
     */
    public function test_format_phone_number_adds_us_prefix_to_10_digits()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', ['5551234567']);
        $this->assertEquals('+15551234567', $result);
    }

    /**
     * Test 11-digit number starting with 1 gets + prefix
     */
    public function test_format_phone_number_adds_plus_to_11_digit_us_number()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', ['15551234567']);
        $this->assertEquals('+15551234567', $result);
    }

    /**
     * Test phone number with parentheses and dashes gets cleaned
     */
    public function test_format_phone_number_removes_parentheses_and_dashes()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', ['(555) 123-4567']);
        $this->assertEquals('+15551234567', $result);
    }

    /**
     * Test phone number with dots gets cleaned
     */
    public function test_format_phone_number_removes_dots()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', ['555.123.4567']);
        $this->assertEquals('+15551234567', $result);
    }

    /**
     * Test phone number with spaces gets cleaned
     */
    public function test_format_phone_number_removes_spaces()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', ['555 123 4567']);
        $this->assertEquals('+15551234567', $result);
    }

    /**
     * Test phone number already in E.164 format is preserved
     */
    public function test_format_phone_number_preserves_e164_format()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', ['+15551234567']);
        $this->assertEquals('+15551234567', $result);
    }

    /**
     * Test international phone number is preserved
     */
    public function test_format_phone_number_preserves_international_format()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', ['+447911123456']);
        $this->assertEquals('+447911123456', $result);
    }

    /**
     * Test empty phone number returns null
     */
    public function test_format_phone_number_returns_null_for_empty()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', ['']);
        $this->assertNull($result);
    }

    /**
     * Test null phone number returns null
     */
    public function test_format_phone_number_returns_null_for_null()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', [null]);
        $this->assertNull($result);
    }

    /**
     * Test too short phone number returns null
     */
    public function test_format_phone_number_returns_null_for_too_short()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', ['12345']);
        $this->assertNull($result);
    }

    /**
     * Test phone number with country code +44 (UK)
     */
    public function test_format_phone_number_handles_uk_number()
    {
        $result = $this->callPrivateMethod($this->twilioService, 'formatPhoneNumber', ['+44 7911 123456']);
        $this->assertEquals('+447911123456', $result);
    }

    // ==========================================
    // Message Truncation Tests
    // ==========================================

    /**
     * Test short message is not truncated
     */
    public function test_truncate_message_preserves_short_message()
    {
        $message = 'Hello, your order is ready!';
        $result = $this->callPrivateMethod($this->twilioService, 'truncateMessage', [$message]);
        $this->assertEquals($message, $result);
    }

    /**
     * Test message at exactly 160 characters is not truncated
     */
    public function test_truncate_message_preserves_160_char_message()
    {
        $message = str_repeat('A', 160);
        $result = $this->callPrivateMethod($this->twilioService, 'truncateMessage', [$message]);
        $this->assertEquals($message, $result);
        $this->assertEquals(160, strlen($result));
    }

    /**
     * Test message over 160 characters is truncated with ellipsis
     */
    public function test_truncate_message_truncates_long_message()
    {
        $message = str_repeat('A', 200);
        $result = $this->callPrivateMethod($this->twilioService, 'truncateMessage', [$message]);
        $this->assertEquals(160, strlen($result));
        $this->assertStringEndsWith('...', $result);
    }

    /**
     * Test truncated message content is correct
     */
    public function test_truncate_message_preserves_content_before_ellipsis()
    {
        $message = str_repeat('B', 200);
        $result = $this->callPrivateMethod($this->twilioService, 'truncateMessage', [$message]);
        $this->assertEquals(str_repeat('B', 157) . '...', $result);
    }

    /**
     * Test custom max length truncation
     */
    public function test_truncate_message_respects_custom_max_length()
    {
        $message = str_repeat('C', 100);
        $result = $this->callPrivateMethod($this->twilioService, 'truncateMessage', [$message, 50]);
        $this->assertEquals(50, strlen($result));
        $this->assertStringEndsWith('...', $result);
    }

    /**
     * Test message at exactly custom max length is preserved
     */
    public function test_truncate_message_preserves_exact_custom_length()
    {
        $message = str_repeat('D', 80);
        $result = $this->callPrivateMethod($this->twilioService, 'truncateMessage', [$message, 80]);
        $this->assertEquals($message, $result);
        $this->assertEquals(80, strlen($result));
    }

    // ==========================================
    // Build Message Tests
    // ==========================================

    /**
     * Test placeholder replacement in message template
     */
    public function test_build_message_replaces_single_placeholder()
    {
        $template = 'Hello {name}!';
        $data = ['name' => 'John'];
        $result = $this->callPrivateMethod($this->twilioService, 'buildMessage', [$template, $data]);
        $this->assertEquals('Hello John!', $result);
    }

    /**
     * Test multiple placeholder replacement
     */
    public function test_build_message_replaces_multiple_placeholders()
    {
        $template = 'Order #{order_id} from {chef_name} is {status}';
        $data = [
            'order_id' => '123',
            'chef_name' => 'Sarah',
            'status' => 'ready'
        ];
        $result = $this->callPrivateMethod($this->twilioService, 'buildMessage', [$template, $data]);
        $this->assertEquals('Order #123 from Sarah is ready', $result);
    }

    /**
     * Test message with no placeholders is preserved
     */
    public function test_build_message_preserves_message_without_placeholders()
    {
        $template = 'Your order is ready for pickup!';
        $data = [];
        $result = $this->callPrivateMethod($this->twilioService, 'buildMessage', [$template, $data]);
        $this->assertEquals($template, $result);
    }

    /**
     * Test duplicate placeholder is replaced both times
     */
    public function test_build_message_replaces_duplicate_placeholders()
    {
        $template = '{name} placed order. Thanks {name}!';
        $data = ['name' => 'Mike'];
        $result = $this->callPrivateMethod($this->twilioService, 'buildMessage', [$template, $data]);
        $this->assertEquals('Mike placed order. Thanks Mike!', $result);
    }

    // ==========================================
    // Service Configuration Tests
    // ==========================================

    /**
     * Test isEnabled returns boolean
     */
    public function test_is_enabled_returns_boolean()
    {
        $result = $this->twilioService->isEnabled();
        $this->assertIsBool($result);
    }

    // ==========================================
    // Integration-style Tests (with mocked dependencies)
    // ==========================================

    /**
     * Test sendVerificationCode returns proper structure for invalid phone
     */
    public function test_send_verification_code_returns_error_for_invalid_phone()
    {
        $result = $this->twilioService->sendVerificationCode('123', '123456');

        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('error', $result);
        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid phone number format', $result['error']);
    }

    /**
     * Test sendSMS returns proper structure for invalid phone
     */
    public function test_send_sms_returns_error_for_invalid_phone()
    {
        $result = $this->twilioService->sendSMS('invalid', 'Test message');

        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('error', $result);
        $this->assertArrayHasKey('sid', $result);
        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid phone number format', $result['error']);
        $this->assertNull($result['sid']);
    }

    /**
     * Test sendSMS includes metadata in error handling
     */
    public function test_send_sms_handles_metadata_properly()
    {
        $metadata = [
            'user_id' => 123,
            'order_id' => 456,
            'notification_type' => 'test'
        ];

        $result = $this->twilioService->sendSMS('invalid', 'Test message', $metadata);

        // Should still return error structure even with metadata
        $this->assertFalse($result['success']);
        $this->assertNotNull($result['error']);
    }

    // ==========================================
    // Environment Gating Tests (SMS_ENABLED)
    // ==========================================

    /**
     * Outside production (APP_ENV=testing here), sends are suppressed and
     * reported as success so callers' flows keep working — no Twilio charge.
     */
    public function test_send_sms_suppressed_outside_production()
    {
        $result = $this->twilioService->sendSMS('3175550188', 'Test message');

        $this->assertTrue($result['success']);
        $this->assertNull($result['error']);
        $this->assertNull($result['sid']);
    }

    public function test_send_verification_code_suppressed_outside_production()
    {
        $result = $this->twilioService->sendVerificationCode('3175550188', '123456');

        $this->assertTrue($result['success']);
        $this->assertNull($result['error']);
    }

    /**
     * Control: SMS_ENABLED=true overrides the gate. With no Twilio credentials
     * configured, the send falls through to the "not configured" error —
     * proving the gate (not credential absence) produced the success above.
     */
    public function test_send_sms_attempted_when_sms_enabled_override_set()
    {
        putenv('SMS_ENABLED=true');
        try {
            $service = new TwilioService();
            $result = $service->sendSMS('3175550188', 'Test message');

            $this->assertFalse($result['success']);
            $this->assertEquals('SMS service not configured', $result['error']);
        } finally {
            putenv('SMS_ENABLED');
        }
    }

    public function test_send_verification_code_attempted_when_sms_enabled_override_set()
    {
        putenv('SMS_ENABLED=true');
        try {
            $service = new TwilioService();
            $result = $service->sendVerificationCode('3175550188', '123456');

            $this->assertFalse($result['success']);
            $this->assertEquals('SMS service not configured', $result['error']);
        } finally {
            putenv('SMS_ENABLED');
        }
    }

    /**
     * Invalid phone still errors before the gate — validation is unchanged.
     */
    public function test_invalid_phone_still_errors_when_suppressed()
    {
        $result = $this->twilioService->sendSMS('invalid', 'Test message');

        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid phone number format', $result['error']);
    }
}
