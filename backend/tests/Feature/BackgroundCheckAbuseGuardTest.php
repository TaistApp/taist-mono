<?php

namespace Tests\Feature;

use App\Http\Controllers\MapiController;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Regression coverage for the background_check/{id} abuse guard.
 *
 * Every call to this endpoint files a BILLABLE order with SafeScreener. It sits
 * inside auth:mapi but took the target id straight from the URL with no
 * ownership check (unlike get_user/update_user/remove_user, which were fixed in
 * the August IDOR work) and no rate limit — so any signed-up account could order
 * checks against arbitrary user ids and run up charges on our account.
 *
 * Tests drive the real auth:mapi token guard. The "own id" cases pre-fill the
 * rate limiter so the request short-circuits BEFORE the outbound SafeScreener
 * call — that keeps the suite offline while still proving the ownership guard
 * let the request through (a blocked request would say "Access denied" instead).
 */
class BackgroundCheckAbuseGuardTest extends TestCase
{
    // Matches MapiController::_taistApiKey().
    private const API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('tbl_users');
        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('email')->nullable();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('ssn')->nullable();
            $table->tinyInteger('user_type')->default(2);
            $table->tinyInteger('is_pending')->default(1);
            $table->string('applicant_guid')->nullable();
            $table->string('order_guid')->nullable();
            $table->string('api_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });
    }

    private function seedChef(int $id, string $token): void
    {
        DB::table('tbl_users')->insert([
            'id' => $id,
            'email' => "chef{$id}@example.com",
            'first_name' => "Chef{$id}",
            'last_name' => 'Test',
            'phone' => '3175550100',
            'user_type' => 2,
            'is_pending' => 1,
            'api_token' => $token,
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);
    }

    private function submit(int $targetId, string $token, array $body = [])
    {
        return $this->postJson("/mapi/background_check/{$targetId}?api_token={$token}", $body + [
            'first_name' => 'Chef',
            'last_name'  => 'Test',
            'email'      => 'chef@example.com',
            'phone'      => '3175550100',
            'ssn'        => '123-45-6789',
            'birthday'   => '1990-01-01',
        ], ['apiKey' => self::API_KEY]);
    }

    /**
     * THE ATTACK: ordering a billable check against someone else's user id.
     * Must be refused before any SafeScreener call is made.
     */
    public function test_denies_ordering_a_check_against_another_users_id(): void
    {
        $this->seedChef(1, 'tok_alice');
        $this->seedChef(2, 'tok_bob');

        $resp = $this->submit(2, 'tok_alice');

        $resp->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertStringContainsString('Access denied', $resp->json('error'));

        // No order may have been recorded against the victim.
        $this->assertNull(DB::table('tbl_users')->find(2)->order_guid);
        $this->assertNull(DB::table('tbl_users')->find(2)->applicant_guid);
    }

    /**
     * A denied cross-user attempt must not burn the VICTIM's rate-limit budget
     * — otherwise the guard turns into a denial-of-service against that chef.
     */
    public function test_denied_attempt_does_not_consume_victims_rate_limit(): void
    {
        $this->seedChef(1, 'tok_alice');
        $this->seedChef(2, 'tok_bob');

        $this->submit(2, 'tok_alice')->assertJsonPath('success', 0);

        $this->assertSame(0, RateLimiter::attempts('background-check:2'));
    }

    /**
     * CONTROL: the caller's OWN id passes the ownership guard. Proven by the
     * request reaching the rate limiter (pre-filled here) rather than being
     * turned away with "Access denied" — and without touching the network.
     */
    public function test_allows_own_id_through_the_ownership_guard(): void
    {
        $this->seedChef(1, 'tok_alice');

        for ($i = 0; $i < MapiController::BACKGROUND_CHECK_MAX_ATTEMPTS; $i++) {
            RateLimiter::hit('background-check:1', 3600);
        }

        $resp = $this->submit(1, 'tok_alice');

        $resp->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertStringContainsString('Too many background check attempts', $resp->json('error'));
        $this->assertStringNotContainsString('Access denied', (string) $resp->json('error'));
    }

    /** The rate limit actually caps billable submissions for one's own account. */
    public function test_rate_limit_blocks_submissions_past_the_cap(): void
    {
        $this->seedChef(1, 'tok_alice');

        for ($i = 0; $i < MapiController::BACKGROUND_CHECK_MAX_ATTEMPTS; $i++) {
            RateLimiter::hit('background-check:1', 3600);
        }

        $this->assertTrue(
            RateLimiter::tooManyAttempts('background-check:1', MapiController::BACKGROUND_CHECK_MAX_ATTEMPTS),
            'limiter should be exhausted at the cap'
        );

        $this->submit(1, 'tok_alice')
            ->assertJsonPath('success', 0)
            ->assertJsonFragment(['error' => 'Too many background check attempts. Please wait a few minutes and try again.']);
    }

    /** CONTROL: below the cap the limiter does not block. */
    public function test_rate_limit_does_not_block_below_the_cap(): void
    {
        RateLimiter::hit('background-check:1', 3600);

        $this->assertFalse(
            RateLimiter::tooManyAttempts('background-check:1', MapiController::BACKGROUND_CHECK_MAX_ATTEMPTS)
        );
    }

    /** Each chef gets an independent budget — one chef can't exhaust another's. */
    public function test_rate_limit_buckets_are_per_chef(): void
    {
        for ($i = 0; $i < MapiController::BACKGROUND_CHECK_MAX_ATTEMPTS; $i++) {
            RateLimiter::hit('background-check:1', 3600);
        }

        $this->assertTrue(RateLimiter::tooManyAttempts('background-check:1', MapiController::BACKGROUND_CHECK_MAX_ATTEMPTS));
        $this->assertFalse(RateLimiter::tooManyAttempts('background-check:2', MapiController::BACKGROUND_CHECK_MAX_ATTEMPTS));
    }
}
