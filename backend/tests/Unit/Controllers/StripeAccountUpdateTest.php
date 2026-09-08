<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use ReflectionMethod;
use RuntimeException;
use Tests\TestCase;

/**
 * A stand-in for \Stripe\StripeClient's `accounts` service that records every
 * update it is asked to make and can be told to reject the first n of them.
 */
class FakeStripeAccounts
{
    /** @var array<int, array> Params of every update attempt, in order. */
    public array $attempts = [];

    public function __construct(private int $failures, private string $message)
    {
    }

    public function update(string $accountId, array $params)
    {
        $this->attempts[] = $params;
        if (count($this->attempts) <= $this->failures) {
            throw new RuntimeException($this->message);
        }
        return (object) ['id' => $accountId];
    }
}

class FakeStripeClient
{
    public function __construct(public FakeStripeAccounts $accounts)
    {
    }
}

/**
 * Chef Stripe onboarding died on the housekeeping account update.
 *
 * Taist creates connected accounts with controller.stripe_dashboard.type =
 * express, which makes Stripe the owner of requirement collection. Stripe
 * accepts an `individual` pre-fill when the account is CREATED but rejects it
 * on a later update — "This application does not have the required permissions
 * for the parameter 'individual' on account acct_…". That threw out of
 * addStripeAccount, so a chef retrying Stripe setup never got an account link
 * at all, only "Some problems occurred. Please try again."
 *
 * The update is housekeeping; the account link is what the chef needs. It must
 * never be able to fail the request.
 */
class StripeAccountUpdateTest extends TestCase
{
    private const PERMISSION_ERROR =
        "This application does not have the required permissions for the parameter 'individual' on account 'acct_1UD6iNKlqwV7FfO6'.";

    private function bestEffortUpdate($client, array $params): void
    {
        $method = new ReflectionMethod(MapiController::class, '_updateStripeAccountBestEffort');
        $method->setAccessible(true);
        $method->invoke(app(MapiController::class), $client, 'acct_1UD6iNKlqwV7FfO6', $params);
    }

    private function params(bool $withIndividual): array
    {
        $params = [
            'business_profile' => ['url' => 'https://taist.app'],
            'settings' => ['payments' => ['statement_descriptor' => 'TAIST']],
        ];
        if ($withIndividual) {
            $params['individual'] = ['id_number' => '000000000'];
        }
        return $params;
    }

    public function test_permission_error_on_individual_is_retried_without_it(): void
    {
        $accounts = new FakeStripeAccounts(1, self::PERMISSION_ERROR);

        $this->bestEffortUpdate(new FakeStripeClient($accounts), $this->params(true));

        $this->assertCount(2, $accounts->attempts);
        $this->assertArrayHasKey('individual', $accounts->attempts[0]);
        // The retry keeps the housekeeping fields and drops only the identity.
        $this->assertArrayNotHasKey('individual', $accounts->attempts[1]);
        $this->assertSame('https://taist.app', $accounts->attempts[1]['business_profile']['url']);
    }

    public function test_update_that_keeps_failing_does_not_throw(): void
    {
        $accounts = new FakeStripeAccounts(99, self::PERMISSION_ERROR);

        $this->bestEffortUpdate(new FakeStripeClient($accounts), $this->params(true));

        // Two attempts, no exception — the caller goes on to make the link.
        $this->assertCount(2, $accounts->attempts);
    }

    public function test_failure_without_identity_fields_is_not_retried(): void
    {
        $accounts = new FakeStripeAccounts(99, 'Some other Stripe problem');

        $this->bestEffortUpdate(new FakeStripeClient($accounts), $this->params(false));

        // Nothing to strip, so retrying would just fail the same way.
        $this->assertCount(1, $accounts->attempts);
    }

    // Control: the normal case still sends everything, exactly once.
    public function test_successful_update_is_sent_once_with_all_fields(): void
    {
        $accounts = new FakeStripeAccounts(0, self::PERMISSION_ERROR);

        $this->bestEffortUpdate(new FakeStripeClient($accounts), $this->params(true));

        $this->assertCount(1, $accounts->attempts);
        $this->assertSame('000000000', $accounts->attempts[0]['individual']['id_number']);
    }
}
