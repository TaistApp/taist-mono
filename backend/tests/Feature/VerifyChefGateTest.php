<?php

namespace Tests\Feature;

use App\Http\Controllers\E2E\TestHelperController;
use Tests\TestCase;

/**
 * Regression coverage for the /mapi/e2e/verify_chef safety gate.
 *
 * The E2E helper routes are always registered (including in production) with
 * auth checked inside the controller. verify_chef was missing the
 * isStripeTestMode() gate its sibling endpoints have, so anyone holding the
 * app's public apiKey (extractable from the app bundle) could flip any chef
 * to verified in production — bypassing admin review and the background
 * check. The gate must reject before any database work happens.
 */
class VerifyChefGateTest extends TestCase
{
    // Same public constant the app bundle ships; using the literal here keeps
    // the test honest about what an attacker actually has.
    private const APP_API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';

    protected function tearDown(): void
    {
        putenv('STRIPE_SECRET');
        unset($_ENV['STRIPE_SECRET'], $_SERVER['STRIPE_SECRET']);
        parent::tearDown();
    }

    /**
     * With a live (or absent) Stripe key, verify_chef must refuse even with
     * the correct apiKey. No DB tables exist in this test environment, so
     * this also proves the gate fires before any database access.
     */
    public function test_verify_chef_rejected_when_stripe_not_in_test_mode(): void
    {
        putenv('STRIPE_SECRET=sk_live_notatestkey');
        $_ENV['STRIPE_SECRET'] = 'sk_live_notatestkey';

        $response = $this->postJson('/mapi/e2e/verify_chef', ['user_id' => 1], [
            'apiKey' => self::APP_API_KEY,
        ]);

        $response->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertStringContainsString('test keys', $response->json('error'));
    }

    public function test_verify_chef_rejected_with_no_stripe_key_at_all(): void
    {
        putenv('STRIPE_SECRET');
        unset($_ENV['STRIPE_SECRET'], $_SERVER['STRIPE_SECRET']);

        $response = $this->postJson('/mapi/e2e/verify_chef', ['user_id' => 1], [
            'apiKey' => self::APP_API_KEY,
        ]);

        $response->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertStringContainsString('test keys', $response->json('error'));
    }

    /** Control: a wrong apiKey is still rejected first. */
    public function test_verify_chef_rejected_with_bad_api_key(): void
    {
        $response = $this->postJson('/mapi/e2e/verify_chef', ['user_id' => 1], [
            'apiKey' => 'not-the-key',
        ]);

        $response->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertSame('Access denied.', $response->json('error'));
    }

    /** The mode detector itself: only sk_test_* keys count as test mode. */
    public function test_stripe_test_mode_detection(): void
    {
        $ref = new \ReflectionClass(TestHelperController::class);
        $controller = $ref->newInstanceWithoutConstructor();
        $method = $ref->getMethod('isStripeTestMode');
        $method->setAccessible(true);

        putenv('STRIPE_SECRET=sk_test_abc');
        $_ENV['STRIPE_SECRET'] = 'sk_test_abc';
        $this->assertTrue($method->invoke($controller));

        putenv('STRIPE_SECRET=sk_live_abc');
        $_ENV['STRIPE_SECRET'] = 'sk_live_abc';
        $this->assertFalse($method->invoke($controller));
    }
}
