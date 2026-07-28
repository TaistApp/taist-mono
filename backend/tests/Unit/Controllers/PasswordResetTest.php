<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use App\Listener;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Server-side password-reset verification.
 *
 * Previously the forgot endpoint returned the reset code in the API response
 * and the app compared it client-side, so anyone calling forgot for a
 * victim's email could read the code and take over the account. New clients
 * now send the email to reset_password and the code is checked server-side
 * (cache entry, 10-min TTL, attempt limit, single-use). Old clients still use
 * the legacy lookup-by-code path until MIN_VERSION forces them out.
 */
class PasswordResetTest extends TestCase
{
    private const API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';

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

    private function storeCode(string $email, string $code): void
    {
        $ref = new \ReflectionClass(MapiController::class);
        $method = $ref->getMethod('_storePasswordResetCode');
        $method->setAccessible(true);
        $method->invoke($this->controller(), $email, $code);
    }

    private function reset(array $params): array
    {
        $request = Request::create('/mapi/reset_password', 'POST', $params, [], [], [
            'HTTP_APIKEY' => self::API_KEY,
        ]);

        return $this->controller()->resetpassword($request)->getData(true);
    }

    private function createUser(string $email, string $dbCode = ''): Listener
    {
        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('email')->nullable();
            $table->string('password')->nullable();
            $table->string('code')->nullable();
            $table->timestamps();
        });

        return Listener::create([
            'email' => $email,
            'password' => 'old-password',
            'code' => $dbCode,
        ]);
    }

    public function test_reset_with_correct_code_updates_password(): void
    {
        $user = $this->createUser('dayne@example.com');
        $this->storeCode('dayne@example.com', '123456');

        $result = $this->reset([
            'email' => 'dayne@example.com',
            'code' => '123456',
            'password' => 'new-password',
        ]);

        $this->assertEquals(1, $result['success']);
        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_wrong_code_is_rejected_and_password_unchanged(): void
    {
        $user = $this->createUser('dayne@example.com');
        $this->storeCode('dayne@example.com', '123456');

        $result = $this->reset([
            'email' => 'dayne@example.com',
            'code' => '654321',
            'password' => 'attacker-password',
        ]);

        $this->assertEquals(0, $result['success']);
        $this->assertEquals('Incorrect verification code', $result['error']);
        $this->assertTrue(Hash::check('old-password', $user->fresh()->password));
    }

    /**
     * Control case: a wrong guess must not invalidate the code — the user can
     * still reset with the right one afterwards.
     */
    public function test_correct_code_still_works_after_a_wrong_guess(): void
    {
        $this->createUser('dayne@example.com');
        $this->storeCode('dayne@example.com', '123456');

        $this->reset(['email' => 'dayne@example.com', 'code' => '000000', 'password' => 'x']);
        $result = $this->reset([
            'email' => 'dayne@example.com',
            'code' => '123456',
            'password' => 'new-password',
        ]);

        $this->assertEquals(1, $result['success']);
    }

    public function test_code_is_single_use(): void
    {
        $this->createUser('dayne@example.com');
        $this->storeCode('dayne@example.com', '123456');

        $this->reset(['email' => 'dayne@example.com', 'code' => '123456', 'password' => 'first']);
        $result = $this->reset([
            'email' => 'dayne@example.com',
            'code' => '123456',
            'password' => 'second',
        ]);

        $this->assertEquals(0, $result['success']);
    }

    public function test_code_is_invalidated_after_max_wrong_attempts(): void
    {
        $this->createUser('dayne@example.com');
        $this->storeCode('dayne@example.com', '123456');

        for ($i = 0; $i < MapiController::RESET_CODE_MAX_ATTEMPTS; $i++) {
            $result = $this->reset(['email' => 'dayne@example.com', 'code' => '000000', 'password' => 'x']);
        }
        $this->assertEquals('Too many incorrect attempts. Please request a new code.', $result['error']);

        // Even the correct code must fail once invalidated, otherwise the
        // attempt limit is no defense against brute force.
        $result = $this->reset([
            'email' => 'dayne@example.com',
            'code' => '123456',
            'password' => 'new-password',
        ]);
        $this->assertEquals(0, $result['success']);
    }

    public function test_reset_fails_when_no_code_was_requested(): void
    {
        $result = $this->reset([
            'email' => 'dayne@example.com',
            'code' => '123456',
            'password' => 'new-password',
        ]);

        $this->assertEquals(0, $result['success']);
        $this->assertEquals('Verification code expired. Please request a new code.', $result['error']);
    }

    public function test_expired_code_is_rejected(): void
    {
        // Seed an already-expired entry directly; the cache TTL hasn't elapsed
        // but the embedded expires_at has, which is what the check uses.
        Cache::put('password-reset:dayne@example.com', [
            'code' => '123456',
            'attempts' => 0,
            'expires_at' => time() - 1,
        ], 60);

        $result = $this->reset([
            'email' => 'dayne@example.com',
            'code' => '123456',
            'password' => 'new-password',
        ]);

        $this->assertEquals(0, $result['success']);
        $this->assertEquals('Verification code expired. Please request a new code.', $result['error']);
    }

    public function test_email_case_and_whitespace_are_normalized_for_the_code(): void
    {
        $this->createUser('Dayne@Example.com');
        $this->storeCode(' Dayne@Example.com ', '123456');

        // Cache key must match despite case/whitespace differences; the DB
        // lookup uses the email as sent, same as the forgot endpoint does.
        $result = $this->reset([
            'email' => 'Dayne@Example.com',
            'code' => '123456',
            'password' => 'new-password',
        ]);

        $this->assertEquals(1, $result['success']);
    }

    /**
     * Control case: old app versions send only {code, password} and rely on
     * the legacy lookup-by-code path — it must keep working until MIN_VERSION
     * forces those versions out.
     */
    public function test_legacy_reset_without_email_still_works(): void
    {
        $user = $this->createUser('dayne@example.com', '654321');

        $result = $this->reset(['code' => '654321', 'password' => 'new-password']);

        $this->assertEquals(1, $result['success']);
        $refreshed = $user->fresh();
        $this->assertTrue(Hash::check('new-password', $refreshed->password));
        $this->assertEquals('', $refreshed->code);
    }

    public function test_missing_code_fails_validation(): void
    {
        $result = $this->reset(['email' => 'dayne@example.com', 'password' => 'new-password']);

        $this->assertEquals(0, $result['success']);
    }

    public function test_invalid_api_key_is_rejected(): void
    {
        $request = Request::create('/mapi/reset_password', 'POST', [
            'email' => 'dayne@example.com',
            'code' => '123456',
            'password' => 'new-password',
        ], [], [], ['HTTP_APIKEY' => 'wrong-key']);

        $result = $this->controller()->resetpassword($request)->getData(true);

        $this->assertEquals(0, $result['success']);
        $this->assertStringContainsString('Access denied', $result['error']);
    }
}
