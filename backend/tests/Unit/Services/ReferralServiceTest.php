<?php

namespace Tests\Unit\Services;

use App\Services\ReferralService;
use Tests\TestCase;

/**
 * Guards the anti-gaming rule for customer referrals: a user can never refer
 * their own phone number to credit themselves. Phone is the anchor because
 * emails are free and infinite while phone numbers are not.
 */
class ReferralServiceTest extends TestCase
{
    /**
     * Build the service without its constructor — the constructor wires up
     * TwilioService, which isn't needed for the pure phone-comparison logic.
     */
    private function service(): ReferralService
    {
        return (new \ReflectionClass(ReferralService::class))->newInstanceWithoutConstructor();
    }

    public function test_exact_same_phone_is_self_referral()
    {
        $this->assertTrue($this->service()->isSelfReferral('+13175551234', '+13175551234'));
    }

    /**
     * CONTROL: a different number is not a self-referral.
     */
    public function test_different_phone_is_not_self_referral()
    {
        $this->assertFalse($this->service()->isSelfReferral('+13175551234', '+13175559999'));
    }

    /**
     * Formatting differences (spaces, dashes, missing +1) must not bypass the
     * check — both numbers normalize to the same E.164 form.
     */
    public function test_differently_formatted_same_phone_is_self_referral()
    {
        $this->assertTrue($this->service()->isSelfReferral('(317) 555-1234', '3175551234'));
        $this->assertTrue($this->service()->isSelfReferral('+13175551234', '317-555-1234'));
    }

    /**
     * Missing or invalid numbers are never treated as a self-referral (so a
     * referrer with no phone on file isn't blocked from referring others).
     */
    public function test_missing_or_invalid_phone_is_not_self_referral()
    {
        $this->assertFalse($this->service()->isSelfReferral(null, '+13175551234'));
        $this->assertFalse($this->service()->isSelfReferral('', '+13175551234'));
        $this->assertFalse($this->service()->isSelfReferral('+13175551234', '123'));
    }
}
