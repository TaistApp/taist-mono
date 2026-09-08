<?php

namespace Tests\Unit\Helpers;

use Tests\TestCase;
use App\Helpers\AppHelper;

/**
 * Unit tests for AppHelper::resolveStripeSsn.
 *
 * Guards the chef-onboarding fix where a real-format SSN in Stripe test mode
 * left Personal Details "Invalid". In test mode we must forward Stripe's
 * documented 000000000 value; in live mode we forward the chef's real SSN.
 */
class AppHelperStripeSsnTest extends TestCase
{
    public function test_test_mode_key_forces_stripe_test_ssn()
    {
        // Even with a real-looking SSN, a test-mode key must yield 000000000
        // so staging accounts verify instead of reading "Invalid".
        $this->assertSame(
            '000000000',
            AppHelper::resolveStripeSsn('sk_test_abc123', '123-45-6789')
        );
    }

    public function test_test_mode_restricted_key_also_forces_test_ssn()
    {
        $this->assertSame(
            '000000000',
            AppHelper::resolveStripeSsn('rk_test_abc123', null)
        );
    }

    public function test_live_mode_forwards_real_ssn_digits()
    {
        // Control case: live key returns the chef's real 9 digits, stripped of
        // formatting characters.
        $this->assertSame(
            '123456789',
            AppHelper::resolveStripeSsn('sk_live_abc123', '123-45-6789')
        );
    }

    public function test_live_mode_strips_non_digits()
    {
        $this->assertSame(
            '123456789',
            AppHelper::resolveStripeSsn('sk_live_abc123', ' 123 45 6789 ')
        );
    }

    public function test_live_mode_returns_null_for_invalid_length()
    {
        // Too few digits → null, so Stripe collects it later rather than
        // submitting a malformed id_number.
        $this->assertNull(AppHelper::resolveStripeSsn('sk_live_abc123', '12345'));
    }

    public function test_live_mode_returns_null_for_empty_ssn()
    {
        $this->assertNull(AppHelper::resolveStripeSsn('sk_live_abc123', null));
        $this->assertNull(AppHelper::resolveStripeSsn('sk_live_abc123', ''));
    }

    // ---- identity pre-fill permission ------------------------------------

    private function account(array $attrs)
    {
        return json_decode(json_encode($attrs));
    }

    /**
     * Our connected accounts are created with
     * controller.stripe_dashboard.type = express, so Stripe owns requirement
     * collection and rejects an `individual` update with "This application does
     * not have the required permissions for the parameter 'individual'". That
     * error aborted chef onboarding, so the pre-fill has to be skipped and the
     * SSN left for Stripe's own hosted flow to collect.
     */
    public function test_identity_prefill_is_skipped_when_stripe_owns_requirements(): void
    {
        $account = $this->account([
            'controller' => ['requirement_collection' => 'stripe'],
            'individual' => ['id_number_provided' => false],
        ]);

        $this->assertFalse(AppHelper::stripeAllowsIdentityPrefill($account));
    }

    public function test_identity_prefill_is_skipped_when_stripe_already_has_the_number(): void
    {
        $account = $this->account([
            'controller' => ['requirement_collection' => 'application'],
            'individual' => ['id_number_provided' => true],
        ]);

        $this->assertFalse(AppHelper::stripeAllowsIdentityPrefill($account));
    }

    public function test_identity_prefill_is_skipped_when_the_account_is_unknown(): void
    {
        $this->assertFalse(AppHelper::stripeAllowsIdentityPrefill(null));
    }

    // Control: a platform-owned account with no id_number yet is exactly the
    // case the pre-fill exists for.
    public function test_identity_prefill_is_allowed_on_a_platform_owned_account(): void
    {
        $account = $this->account([
            'controller' => ['requirement_collection' => 'application'],
            'individual' => ['id_number_provided' => false],
        ]);

        $this->assertTrue(AppHelper::stripeAllowsIdentityPrefill($account));
    }
}
