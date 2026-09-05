<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use Tests\TestCase;

/**
 * Regression coverage for what create_payment_intent counts as a paid order.
 *
 * The endpoint confirms the PaymentIntent inline (`confirm => true`) and used
 * to return success on whatever came back, without looking at the status. A
 * card that needed a 3-D Secure challenge therefore produced a 200, an order
 * stamped with a payment_token, and a chef pushed and SMSed about a booking
 * nobody had paid for — the customer's card untouched the whole time.
 *
 * Only a status that actually commits the funds may mark an order paid.
 */
class PaymentIntentOutcomeTest extends TestCase
{
    public function test_succeeded_is_the_only_status_that_means_charged(): void
    {
        $outcome = MapiController::describePaymentIntentOutcome('succeeded');

        $this->assertTrue($outcome['funded']);
        $this->assertSame('', $outcome['message']);
    }

    /**
     * `processing` still commits the money — Stripe settles it without us — so
     * the order stands rather than being cancelled out from under the chef.
     */
    public function test_processing_counts_as_funded(): void
    {
        $this->assertTrue(MapiController::describePaymentIntentOutcome('processing')['funded']);
    }

    /**
     * The bug this test exists for: a 3-D Secure challenge is not a payment.
     */
    public function test_requires_action_is_not_a_payment(): void
    {
        $outcome = MapiController::describePaymentIntentOutcome('requires_action');

        $this->assertFalse($outcome['funded']);
        $this->assertNotSame('', $outcome['message']);
        // The customer has to be told what to do, not shown a raw status.
        $this->assertStringContainsString('bank', $outcome['message']);
    }

    public function test_requires_confirmation_is_not_a_payment(): void
    {
        $this->assertFalse(MapiController::describePaymentIntentOutcome('requires_confirmation')['funded']);
    }

    public function test_requires_payment_method_reads_as_a_decline(): void
    {
        $outcome = MapiController::describePaymentIntentOutcome('requires_payment_method');

        $this->assertFalse($outcome['funded']);
        $this->assertStringContainsString('declined', $outcome['message']);
    }

    /**
     * Authorised-but-uncaptured is money we have not taken. We do not use
     * manual capture, so if it ever appears the order is not paid.
     */
    public function test_requires_capture_is_not_a_payment(): void
    {
        $this->assertFalse(MapiController::describePaymentIntentOutcome('requires_capture')['funded']);
    }

    public function test_canceled_is_not_a_payment(): void
    {
        $this->assertFalse(MapiController::describePaymentIntentOutcome('canceled')['funded']);
    }

    /**
     * Control: an unknown status fails closed. A status Stripe adds later must
     * never fall through into "paid" just because we have not heard of it.
     */
    public function test_an_unrecognised_status_fails_closed(): void
    {
        foreach (['', 'something_new', 'SUCCEEDED', null] as $status) {
            $outcome = MapiController::describePaymentIntentOutcome($status);

            $this->assertFalse(
                $outcome['funded'],
                'An unrecognised status must not be treated as a completed payment'
            );
            $this->assertNotSame('', $outcome['message']);
        }
    }

    /**
     * Every not-funded branch has to give the customer something to act on —
     * a blank error is what leaves them staring at a silent checkout.
     */
    public function test_every_failure_explains_itself(): void
    {
        foreach (['requires_action', 'requires_payment_method', 'requires_capture', 'canceled'] as $status) {
            $this->assertNotSame(
                '',
                MapiController::describePaymentIntentOutcome($status)['message'],
                "Status {$status} must carry a customer-facing message"
            );
        }
    }
}
