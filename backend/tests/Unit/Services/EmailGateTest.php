<?php

namespace Tests\Unit\Services;

use App\Http\Controllers\MapiController;
use App\Services\EmailGate;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use ReflectionClass;
use Tests\TestCase;

/**
 * The E2E suite (tests/e2e/helpers.js) signs users up as
 * customer-<runId>@e2e-test.taist.app. That domain has no MX record, so every
 * transactional email the flows trigger — password reset, order receipt — is a
 * guaranteed hard bounce against the taist.app sending domain. The suite runs
 * before every staging push, so the bounces accumulate.
 *
 * EmailGate drops those recipients before the Resend call. Unlike the SMS gate
 * in TwilioService it does NOT switch off by environment: staging must keep
 * sending real email so manual testing still works.
 */
class EmailGateTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        putenv('EMAIL_ENABLED');
    }

    protected function tearDown(): void
    {
        putenv('EMAIL_ENABLED');
        parent::tearDown();
    }

    // ── EmailGate ────────────────────────────────────────────────

    public function test_e2e_recipient_is_suppressed(): void
    {
        $this->assertFalse(EmailGate::shouldSend('customer-mkj3a9@e2e-test.taist.app'));
        $this->assertStringContainsString(
            'hard-bounce',
            EmailGate::suppressionReason('customer-mkj3a9@e2e-test.taist.app')
        );
    }

    /** Control: real recipients, including the taist.app parent domain, still send. */
    public function test_real_recipients_are_not_suppressed(): void
    {
        $this->assertTrue(EmailGate::shouldSend('contact@taist.app'));
        $this->assertTrue(EmailGate::shouldSend('a.daynearnett@gmail.com'));
        $this->assertNull(EmailGate::suppressionReason('contact@taist.app'));
    }

    public function test_e2e_match_is_case_insensitive_and_ignores_surrounding_space(): void
    {
        $this->assertFalse(EmailGate::shouldSend('  Customer-ABC@E2E-Test.Taist.App '));
    }

    /**
     * A lookalike must not be swept up — only the E2E subdomain itself and
     * anything nested under it.
     */
    public function test_lookalike_domains_are_not_suppressed(): void
    {
        $this->assertTrue(EmailGate::shouldSend('someone@e2e-test.taist.app.example.com'));
        $this->assertTrue(EmailGate::shouldSend('someone@note2e-test.taist.app'));
        $this->assertFalse(EmailGate::shouldSend('someone@nested.e2e-test.taist.app'));
    }

    /** Second layer: an explicit per-environment kill switch, off by default. */
    public function test_email_enabled_kill_switch_suppresses_everything(): void
    {
        putenv('EMAIL_ENABLED=false');

        $this->assertFalse(EmailGate::shouldSend('contact@taist.app'));
        $this->assertSame(
            'EMAIL_ENABLED is off for this environment',
            EmailGate::suppressionReason('contact@taist.app')
        );
    }

    /** Control: email stays on when EMAIL_ENABLED is unset, unlike SMS_ENABLED. */
    public function test_sending_is_enabled_by_default_outside_production(): void
    {
        $this->assertNotSame('production', app()->environment());
        $this->assertTrue(EmailGate::sendingEnabled());
        $this->assertTrue(EmailGate::shouldSend('contact@taist.app'));
    }

    // ── MapiController::_sendEmail wiring ────────────────────────

    public function test_send_email_never_calls_resend_for_an_e2e_recipient(): void
    {
        [$controller, $sent] = $this->controllerWithRecordedTransport();

        $result = $this->sendEmail($controller, 'customer-mkj3a9@e2e-test.taist.app');

        $this->assertCount(0, $sent, 'Resend must not be called for an E2E recipient.');
        $this->assertTrue($result, 'Callers only log the return value, so a skip must look like a success.');
    }

    /** Control: a normal recipient still reaches the Resend API unchanged. */
    public function test_send_email_still_posts_to_resend_for_a_real_recipient(): void
    {
        [$controller, $sent] = $this->controllerWithRecordedTransport();

        $result = $this->sendEmail($controller, 'contact@taist.app');

        $this->assertCount(1, $sent);
        $this->assertSame(
            'https://api.resend.com/emails',
            (string) $sent[0]['request']->getUri()
        );
        $this->assertStringContainsString(
            '"to":["contact@taist.app"]',
            (string) $sent[0]['request']->getBody()
        );
        $this->assertTrue($result);
    }

    // ── helpers ──────────────────────────────────────────────────

    /**
     * A controller whose Resend transport is a Guzzle mock, so the control case
     * can assert on the real outbound request without touching the network.
     * Built without the constructor: the real one wants injected SMS services
     * and reaches for Firebase credentials.
     *
     * @return array{0: MapiController, 1: \ArrayObject}
     */
    private function controllerWithRecordedTransport(): array
    {
        $sent = new \ArrayObject();
        $stack = HandlerStack::create(new MockHandler([new Response(200, [], '{"id":"stub"}')]));
        $stack->push(Middleware::history($sent));

        $controller = (new ReflectionClass(RecordingMapiController::class))->newInstanceWithoutConstructor();
        $controller->stubClient = new Client(['handler' => $stack]);

        return [$controller, $sent];
    }

    private function sendEmail(MapiController $controller, string $email)
    {
        $method = (new ReflectionClass(MapiController::class))->getMethod('_sendEmail');
        $method->setAccessible(true);

        return $method->invokeArgs($controller, [$email, 'Subject', '<p>Body</p>']);
    }
}

/**
 * Test double: swaps only the HTTP transport, leaving _sendEmail itself intact.
 */
class RecordingMapiController extends MapiController
{
    public $stubClient;

    protected function _resendClient()
    {
        return $this->stubClient;
    }
}
