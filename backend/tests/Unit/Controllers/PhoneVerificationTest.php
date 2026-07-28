<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Server-side SMS verification (confirm_phone_code).
 *
 * Previously verify_phone returned the code in the API response and the app
 * compared it client-side, so anyone calling the endpoint could read the code
 * without ever receiving the SMS. The code is now stored in cache and checked
 * server-side; these tests cover the confirm path, attempt limits, expiry,
 * and phone-number normalization.
 */
class PhoneVerificationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function controller(): MapiController
    {
        $ref = new \ReflectionClass(MapiController::class);

        return $ref->newInstanceWithoutConstructor();
    }

    private function storeCode(string $phone, string $code): void
    {
        $ref = new \ReflectionClass(MapiController::class);
        $method = $ref->getMethod('_storePhoneVerificationCode');
        $method->setAccessible(true);
        $method->invoke($this->controller(), $phone, $code);
    }

    private function confirm(string $phone, string $code): array
    {
        $request = Request::create('/mapi/confirm_phone_code', 'POST', [
            'phone_number' => $phone,
            'code' => $code,
        ]);

        return $this->controller()->confirmPhoneCode($request)->getData(true);
    }

    public function test_correct_code_confirms_successfully(): void
    {
        $this->storeCode('5551234567', '123456');

        $result = $this->confirm('5551234567', '123456');

        $this->assertEquals(1, $result['success']);
    }

    public function test_wrong_code_is_rejected(): void
    {
        $this->storeCode('5551234567', '123456');

        $result = $this->confirm('5551234567', '654321');

        $this->assertEquals(0, $result['success']);
        $this->assertEquals('Incorrect verification code', $result['error']);
    }

    /**
     * Control case: a wrong guess must not invalidate the code — the user can
     * still confirm with the right one afterwards.
     */
    public function test_correct_code_still_works_after_a_wrong_guess(): void
    {
        $this->storeCode('5551234567', '123456');

        $this->confirm('5551234567', '000000');
        $result = $this->confirm('5551234567', '123456');

        $this->assertEquals(1, $result['success']);
    }

    public function test_code_is_single_use(): void
    {
        $this->storeCode('5551234567', '123456');

        $this->confirm('5551234567', '123456');
        $result = $this->confirm('5551234567', '123456');

        $this->assertEquals(0, $result['success']);
    }

    public function test_code_is_invalidated_after_max_wrong_attempts(): void
    {
        $this->storeCode('5551234567', '123456');

        for ($i = 0; $i < MapiController::PHONE_CODE_MAX_ATTEMPTS; $i++) {
            $result = $this->confirm('5551234567', '000000');
        }
        $this->assertEquals('Too many incorrect attempts. Please request a new code.', $result['error']);

        // Even the correct code must fail once the code has been invalidated,
        // otherwise the attempt limit is no defense against brute force.
        $result = $this->confirm('5551234567', '123456');
        $this->assertEquals(0, $result['success']);
    }

    public function test_confirm_fails_when_no_code_was_requested(): void
    {
        $result = $this->confirm('5551234567', '123456');

        $this->assertEquals(0, $result['success']);
        $this->assertEquals('Verification code expired. Please request a new code.', $result['error']);
    }

    public function test_expired_code_is_rejected(): void
    {
        // Seed an already-expired entry directly; the cache TTL hasn't elapsed
        // but the embedded expires_at has, which is what confirm checks.
        Cache::put('phone-verification:15551234567', [
            'code' => '123456',
            'attempts' => 0,
            'expires_at' => time() - 1,
        ], 60);

        $result = $this->confirm('5551234567', '123456');

        $this->assertEquals(0, $result['success']);
        $this->assertEquals('Verification code expired. Please request a new code.', $result['error']);
    }

    /**
     * The formatted number the user typed and the E.164-ish variants must all
     * resolve to the same cache entry.
     */
    public function test_phone_number_formats_are_normalized_to_one_code(): void
    {
        $this->storeCode('(555) 123-4567', '123456');

        $result = $this->confirm('+1 555-123-4567', '123456');

        $this->assertEquals(1, $result['success']);
    }

    public function test_missing_code_fails_validation(): void
    {
        $request = Request::create('/mapi/confirm_phone_code', 'POST', [
            'phone_number' => '5551234567',
        ]);

        $result = $this->controller()->confirmPhoneCode($request)->getData(true);

        $this->assertEquals(0, $result['success']);
        $this->assertEquals('Invalid phone number or code', $result['error']);
    }

    public function test_store_sets_entry_with_zero_attempts(): void
    {
        $this->storeCode('5551234567', '123456');

        $entry = Cache::get('phone-verification:15551234567');

        $this->assertNotNull($entry);
        $this->assertEquals('123456', $entry['code']);
        $this->assertEquals(0, $entry['attempts']);
        $this->assertGreaterThan(time(), $entry['expires_at']);
    }
}
