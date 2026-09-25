<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * push_opted_in sat at 0 for all 174 chefs in production and nothing could say
 * why: the endpoint wrote no log, and the app discarded its response. These
 * cover the log line that tells "never called" apart from "called and turned
 * away", and the ownership check on a flag any signed-in user could flip on
 * any other account.
 */
class PushOptInTest extends TestCase
{
    // Matches MapiController::_taistApiKey() so the shared api-key header passes.
    private const API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';

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
            $table->tinyInteger('push_opted_in')->default(0);
            $table->string('fcm_token', 200)->nullable();
            $table->string('api_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        $this->seedUser(903, 'tok_chef', ['user_type' => 2, 'fcm_token' => 'fcm-903']);
        $this->seedUser(1112, 'tok_customer');
    }

    private function seedUser(int $id, string $token, array $overrides = []): void
    {
        DB::table('tbl_users')->insert(array_merge([
            'id' => $id,
            'email' => "user{$id}@example.com",
            'password' => 'secret',
            'first_name' => "User{$id}",
            'user_type' => 1,
            'api_token' => $token,
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ], $overrides));
    }

    private function optIn(string $token, array $payload)
    {
        return $this->postJson(
            "/mapi/notifications/opt-in?api_token={$token}",
            $payload,
            ['apiKey' => self::API_KEY],
        );
    }

    private function optedIn(int $id): int
    {
        return (int) DB::table('tbl_users')->where('id', $id)->value('push_opted_in');
    }

    public function test_records_the_opt_in_for_the_calling_chef(): void
    {
        Log::shouldReceive('info')->once()->with('push opt-in recorded', \Mockery::on(
            fn ($ctx) => $ctx['user_id'] === 903
                && $ctx['user_type'] === 2
                && $ctx['has_fcm_token'] === true
        ));
        Log::shouldReceive('warning')->never();
        Log::shouldReceive('error')->never();

        $this->optIn('tok_chef', ['user_id' => 903])
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->assertSame(1, $this->optedIn(903));
    }

    /** Without this line a chef who never opted in looks the same as one whose call was refused. */
    public function test_logs_a_call_that_arrives_without_a_user_id(): void
    {
        Log::shouldReceive('warning')->once()->with('push opt-in rejected: no user_id', \Mockery::any());
        Log::shouldReceive('info')->never();

        $this->optIn('tok_chef', [])
            ->assertOk()
            ->assertJson(['success' => false]);

        $this->assertSame(0, $this->optedIn(903));
    }

    /** An id nobody owns is refused like any other foreign id, and says no more. */
    public function test_refuses_an_id_that_belongs_to_nobody(): void
    {
        Log::shouldReceive('warning')->once()->with('push opt-in rejected: not the caller', \Mockery::any());
        Log::shouldReceive('info')->never();

        $this->optIn('tok_chef', ['user_id' => 999999])
            ->assertOk()
            ->assertJson(['success' => false, 'error' => 'User not found']);
    }

    /** Any signed-in user could flip anyone else's flag. */
    public function test_refuses_to_opt_in_somebody_else(): void
    {
        Log::shouldReceive('warning')->once()->with('push opt-in rejected: not the caller', \Mockery::any());
        Log::shouldReceive('info')->never();

        $this->optIn('tok_customer', ['user_id' => 903])
            ->assertOk()
            ->assertJson(['success' => false]);

        $this->assertSame(0, $this->optedIn(903));
    }

    /** Control: the endpoint stays behind auth, so an unauthenticated call writes nothing. */
    public function test_unauthenticated_calls_change_nothing(): void
    {
        $this->postJson('/mapi/notifications/opt-in', ['user_id' => 903], ['apiKey' => self::API_KEY]);

        $this->assertSame(0, $this->optedIn(903));
    }
}
