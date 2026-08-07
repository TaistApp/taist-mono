<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use Tests\TestCase;

/**
 * Regression coverage for the SafeScreener environment selection.
 *
 * Previously sendBackgroundCheckRequest() hardcoded $mode = 'stag', so
 * PRODUCTION background checks were silently filed in the SafeScreener
 * sandbox while the admin email linked to the production report viewer —
 * real chefs' checks never actually ran. The mode now comes from
 * SAFESCREENER_MODE (defaulting to the sandbox so non-prod environments can
 * never file real checks).
 *
 * Also covers backgroundCheckAlreadyComplete(): a chef whose applicant was
 * created but whose ORDER call failed must be allowed to retry, not
 * dead-ended on "You have already applied" forever.
 */
class BackgroundCheckModeTest extends TestCase
{
    protected function tearDown(): void
    {
        putenv('SAFESCREENER_MODE');
        unset($_ENV['SAFESCREENER_MODE'], $_SERVER['SAFESCREENER_MODE']);
        parent::tearDown();
    }

    private function invokeMode()
    {
        $ref = new \ReflectionClass(MapiController::class);
        $controller = $ref->newInstanceWithoutConstructor();
        $method = $ref->getMethod('backgroundCheckMode');
        $method->setAccessible(true);

        return $method->invoke($controller);
    }

    /** Control: without the env var, everything stays in the sandbox. */
    public function test_mode_defaults_to_sandbox(): void
    {
        putenv('SAFESCREENER_MODE');
        unset($_ENV['SAFESCREENER_MODE'], $_SERVER['SAFESCREENER_MODE']);

        $this->assertSame('stag', $this->invokeMode());
    }

    public function test_mode_is_prod_when_env_set(): void
    {
        putenv('SAFESCREENER_MODE=prod');
        $_ENV['SAFESCREENER_MODE'] = 'prod';

        $this->assertSame('prod', $this->invokeMode());
    }

    /** Anything that isn't exactly 'prod' must fall back to the sandbox. */
    public function test_unrecognized_mode_falls_back_to_sandbox(): void
    {
        putenv('SAFESCREENER_MODE=production');
        $_ENV['SAFESCREENER_MODE'] = 'production';

        $this->assertSame('stag', $this->invokeMode());
    }

    /** Applicant + order both present → genuinely already applied. */
    public function test_already_complete_when_applicant_and_order_exist(): void
    {
        $this->assertTrue(MapiController::backgroundCheckAlreadyComplete('applicant-guid', 'order-guid'));
    }

    /**
     * Applicant saved but the order call failed → NOT complete, the chef
     * must be able to retry (this was the permanent dead end).
     */
    public function test_not_complete_when_order_is_missing(): void
    {
        $this->assertFalse(MapiController::backgroundCheckAlreadyComplete('applicant-guid', null));
        $this->assertFalse(MapiController::backgroundCheckAlreadyComplete('applicant-guid', ''));
    }

    /** Control: a fresh chef with neither guid is not complete. */
    public function test_not_complete_when_nothing_saved(): void
    {
        $this->assertFalse(MapiController::backgroundCheckAlreadyComplete(null, null));
        $this->assertFalse(MapiController::backgroundCheckAlreadyComplete('', ''));
    }
}
