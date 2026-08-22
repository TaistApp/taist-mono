<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Regression coverage for the "Your account is currently deactivated" lockout.
 *
 * `is_pending` is the chef-application flag, but the pre-Dec-2025 signup screen
 * set it to 1 for every role, so early customers carry a stale 1. The login
 * gate added in 3e78641 rejected `is_pending = 1 && user_type != 2`, which
 * locked those customers out of the app entirely. Login must not read
 * `is_pending` at all — deactivation lives in `verified`.
 */
class LoginPendingFlagTest extends TestCase
{
    // Matches MapiController::_taistApiKey() so the shared api-key header passes.
    private const API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';
    private const PASSWORD = 'correct-horse';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('tbl_users');
        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('email')->nullable();
            $table->string('password')->nullable();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->tinyInteger('user_type')->default(1);
            $table->tinyInteger('verified')->default(0);
            $table->tinyInteger('is_pending')->default(0);
            $table->tinyInteger('is_paused')->default(0);
            $table->string('api_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        $this->insertUser(1, 'legacy-customer@example.com', 1, 1, 1);  // stale flag
        $this->insertUser(2, 'new-customer@example.com', 1, 0, 1);     // control
        $this->insertUser(3, 'pending-chef@example.com', 2, 1, 1);     // onboarding chef
        $this->insertUser(4, 'rejected@example.com', 1, 0, 2);         // actually blocked
    }

    private function insertUser(int $id, string $email, int $userType, int $isPending, int $verified): void
    {
        DB::table('tbl_users')->insert([
            'id' => $id,
            'email' => $email,
            'password' => Hash::make(self::PASSWORD),
            'user_type' => $userType,
            'is_pending' => $isPending,
            'verified' => $verified,
            'is_paused' => 0,
            'api_token' => '',
        ]);
    }

    private function login(string $email, string $password = self::PASSWORD)
    {
        return $this->postJson('/mapi/login', [
            'email' => $email,
            'password' => $password,
        ], ['apiKey' => self::API_KEY]);
    }

    /** The bug: a customer carrying the legacy chef-application flag must get in. */
    public function test_customer_with_stale_is_pending_can_log_in(): void
    {
        $response = $this->login('legacy-customer@example.com');

        $response->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertNotEmpty($response->json('data.api_token'));
    }

    /** Control: a normal customer (is_pending = 0) still logs in. */
    public function test_customer_without_pending_flag_can_log_in(): void
    {
        $this->login('new-customer@example.com')
            ->assertStatus(200)
            ->assertJsonPath('success', 1);
    }

    /** Control: chefs mid-onboarding keep their existing access. */
    public function test_pending_chef_can_still_log_in(): void
    {
        $this->login('pending-chef@example.com')
            ->assertStatus(200)
            ->assertJsonPath('success', 1);
    }

    /** Control: real deactivation lives in `verified` and still blocks login. */
    public function test_unverified_account_is_still_blocked(): void
    {
        $response = $this->login('rejected@example.com');

        $response->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertStringContainsString('verify the account', $response->json('error'));
    }

    /** Control: the wrong password is still rejected. */
    public function test_wrong_password_is_still_rejected(): void
    {
        $response = $this->login('legacy-customer@example.com', 'nope');

        $response->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertStringContainsString('password is not correct', $response->json('error'));
    }
}
