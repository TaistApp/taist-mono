<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Regression coverage for the IDOR / broken-object-level-authorization fix on
 * the per-id account endpoints.
 *
 * get_user/{id}, update_user/{id} and remove_user/{id} took the target id
 * straight from the URL and never checked it against the authenticated user.
 * Any signed-in user could read, overwrite (email/password/user_type/verified/
 * is_pending), or delete ANY other account. These endpoints must now only ever
 * act on the caller's own record.
 *
 * The tests drive the real routes through the auth:mapi token guard (a seeded
 * api_token authenticates the caller) so the middleware + ownership guard are
 * exercised end-to-end, not mocked.
 */
class UserEndpointOwnershipTest extends TestCase
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
            $table->string('api_token')->nullable();
            $table->string('zip')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });
    }

    private function seedUser(int $id, string $token, array $overrides = []): void
    {
        DB::table('tbl_users')->insert(array_merge([
            'id' => $id,
            'email' => "user{$id}@example.com",
            'password' => 'secret',
            'first_name' => "User{$id}",
            'user_type' => 1,
            'verified' => 0,
            'is_pending' => 0,
            'is_paused' => 0,
            'api_token' => $token,
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ], $overrides));
    }

    // ---- get_user -------------------------------------------------------

    /** Control: reading your OWN record still works. */
    public function test_get_user_allows_own_id(): void
    {
        $this->seedUser(1, 'tok_alice');

        $resp = $this->getJson('/mapi/get_user/1?api_token=tok_alice', [
            'apiKey' => self::API_KEY,
        ]);

        $resp->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertEquals('user1@example.com', $resp->json('data.email'));
    }

    /** The attack: reading someone ELSE's record is denied. */
    public function test_get_user_denies_other_id(): void
    {
        $this->seedUser(1, 'tok_alice');
        $this->seedUser(2, 'tok_bob', ['email' => 'victim@example.com']);

        $resp = $this->getJson('/mapi/get_user/2?api_token=tok_alice', [
            'apiKey' => self::API_KEY,
        ]);

        $resp->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertStringContainsString('Access denied', $resp->json('error'));
        // The victim's data must not leak in the payload.
        $this->assertNull($resp->json('data'));
    }

    // ---- update_user ----------------------------------------------------

    /** Control: updating your OWN record still works. */
    public function test_update_user_allows_own_id(): void
    {
        $this->seedUser(1, 'tok_alice');

        $resp = $this->postJson('/mapi/update_user/1?api_token=tok_alice', [
            'first_name' => 'Renamed',
        ], ['apiKey' => self::API_KEY]);

        $resp->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertEquals('Renamed', DB::table('tbl_users')->find(1)->first_name);
    }

    /** The attack: overwriting someone else's account is denied and is a no-op. */
    public function test_update_user_denies_other_id(): void
    {
        $this->seedUser(1, 'tok_alice');
        $this->seedUser(2, 'tok_bob', ['email' => 'victim@example.com']);

        $resp = $this->postJson('/mapi/update_user/2?api_token=tok_alice', [
            'email' => 'attacker@evil.com',
            'password' => 'hijacked',
        ], ['apiKey' => self::API_KEY]);

        $resp->assertStatus(200)->assertJsonPath('success', 0);

        $victim = DB::table('tbl_users')->find(2);
        $this->assertEquals('victim@example.com', $victim->email, 'victim email must be untouched');
        $this->assertEquals('secret', $victim->password, 'victim password must be untouched');
    }

    /**
     * Privilege-escalation guard: `verified` is NOT client-settable, even on
     * your own record. A customer who becomes a chef (user_type=2) must not be
     * able to self-approve as a verified chef and skip the background check.
     */
    public function test_update_user_cannot_self_set_verified(): void
    {
        $this->seedUser(1, 'tok_alice', ['user_type' => 1, 'verified' => 0, 'is_pending' => 0]);

        $resp = $this->postJson('/mapi/update_user/1?api_token=tok_alice', [
            'user_type' => 2,   // become a chef (legitimate)
            'is_pending' => 0,  // legitimate field
            'verified' => 1,    // attempted self-approval (must be ignored)
        ], ['apiKey' => self::API_KEY]);

        $resp->assertStatus(200)->assertJsonPath('success', 1);

        $user = DB::table('tbl_users')->find(1);
        $this->assertEquals(2, $user->user_type, 'user_type is a legitimate client field');
        $this->assertEquals(0, $user->verified, 'verified must never be set from the client');
    }

    // ---- remove_user ----------------------------------------------------

    /** The attack: deleting someone else's account is denied and is a no-op. */
    public function test_remove_user_denies_other_id(): void
    {
        $this->seedUser(1, 'tok_alice');
        $this->seedUser(2, 'tok_bob');

        $resp = $this->postJson('/mapi/remove_user/2?api_token=tok_alice', [], [
            'apiKey' => self::API_KEY,
        ]);

        $resp->assertStatus(200)->assertJsonPath('success', 0);
        $this->assertNotNull(DB::table('tbl_users')->find(2), 'victim account must still exist');
    }

    /** Control: deleting your OWN account still works. */
    public function test_remove_user_allows_own_id(): void
    {
        $this->seedUser(1, 'tok_alice');

        $resp = $this->postJson('/mapi/remove_user/1?api_token=tok_alice', [], [
            'apiKey' => self::API_KEY,
        ]);

        $resp->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertNull(DB::table('tbl_users')->find(1), 'own account should be deleted');
    }
}
