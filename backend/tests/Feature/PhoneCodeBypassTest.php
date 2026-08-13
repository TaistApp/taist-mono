<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Non-production QA bypass for phone verification: staging suppresses real
 * SMS sends (TwilioService gate), so the designated test number
 * (317) 353-7345 must verify with the fixed code 000000 — and that pair must
 * be inert in production and for every other number/code.
 */
class PhoneCodeBypassTest extends TestCase
{
    private const TEST_PHONE = '3173537345';
    private const TEST_CODE = '000000';

    protected function setUp(): void
    {
        parent::setUp();

        // Pin the app env so leftover env pollution from other test classes
        // can't flip the bypass off (it keys off app()->environment()).
        $this->app['env'] = 'testing';
    }

    private function confirm(string $phone, string $code)
    {
        return $this->postJson('/mapi/confirm_phone_code', [
            'phone_number' => $phone,
            'code' => $code,
        ]);
    }

    /** The bypass pair verifies with no stored code at all. */
    public function test_test_number_with_fixed_code_verifies_outside_production(): void
    {
        $resp = $this->confirm(self::TEST_PHONE, self::TEST_CODE);

        $resp->assertStatus(200)->assertJsonPath('success', 1);
    }

    /** Formatting variants of the test number normalize to the same bypass. */
    public function test_formatted_test_number_also_bypasses(): void
    {
        $resp = $this->confirm('(317) 353-7345', self::TEST_CODE);

        $resp->assertStatus(200)->assertJsonPath('success', 1);
    }

    /** Control: the test number with a wrong code goes down the normal path. */
    public function test_test_number_with_wrong_code_is_rejected(): void
    {
        $resp = $this->confirm(self::TEST_PHONE, '123456');

        $resp->assertStatus(200)->assertJsonPath('success', 0);
    }

    /** Control: another number with the magic code gets no bypass. */
    public function test_other_number_with_fixed_code_is_rejected(): void
    {
        $resp = $this->confirm('3175550000', self::TEST_CODE);

        $resp->assertStatus(200)->assertJsonPath('success', 0);
    }

    /** The bypass must be dead in production. */
    public function test_bypass_disabled_in_production(): void
    {
        $this->app['env'] = 'production';

        $resp = $this->confirm(self::TEST_PHONE, self::TEST_CODE);

        $resp->assertStatus(200)->assertJsonPath('success', 0);
    }

    /** A real stored code still verifies normally for the test number. */
    public function test_real_code_flow_still_works_for_test_number(): void
    {
        Cache::put('phone-verification:1' . self::TEST_PHONE, [
            'code' => '482913',
            'attempts' => 0,
            'expires_at' => time() + 600,
        ], 600);

        $resp = $this->confirm(self::TEST_PHONE, '482913');

        $resp->assertStatus(200)->assertJsonPath('success', 1);
    }
}
