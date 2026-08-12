<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The apartment/unit number (`address2`) travels profile → update_user →
 * get_user so the chef's order screen can show the full delivery address.
 * Kept separate from `address` so map links / geocoding keep working on the
 * plain street address.
 */
class UserAddress2Test extends TestCase
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
            $table->string('address')->nullable();
            $table->string('address2', 50)->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip')->nullable();
            $table->tinyInteger('user_type')->default(1);
            $table->tinyInteger('verified')->default(0);
            $table->tinyInteger('is_pending')->default(0);
            $table->tinyInteger('is_paused')->default(0);
            $table->string('api_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        DB::table('tbl_users')->insert([
            'id' => 1,
            'email' => 'customer@example.com',
            'password' => 'secret',
            'first_name' => 'Dayne',
            'address' => '10903 Lantern View Dr',
            'address2' => null,
            'city' => 'Fishers',
            'state' => 'Indiana',
            'zip' => '46038',
            'api_token' => 'tok_customer',
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);
    }

    public function test_update_user_persists_address2_and_get_user_returns_it(): void
    {
        $resp = $this->postJson('/mapi/update_user/1?api_token=tok_customer', [
            'address2' => 'Apt 4B',
        ], ['apiKey' => self::API_KEY]);

        $resp->assertStatus(200)->assertJsonPath('success', 1);

        $row = DB::table('tbl_users')->find(1);
        $this->assertEquals('Apt 4B', $row->address2);
        $this->assertEquals('10903 Lantern View Dr', $row->address, 'street address must be untouched');

        $get = $this->getJson('/mapi/get_user/1?api_token=tok_customer', [
            'apiKey' => self::API_KEY,
        ]);
        $get->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertEquals('Apt 4B', $get->json('data.address2'));
    }

    /** Control: an update that doesn't mention address2 leaves it alone. */
    public function test_update_without_address2_leaves_existing_value(): void
    {
        DB::table('tbl_users')->where('id', 1)->update(['address2' => 'Unit 7']);

        $resp = $this->postJson('/mapi/update_user/1?api_token=tok_customer', [
            'first_name' => 'Renamed',
        ], ['apiKey' => self::API_KEY]);

        $resp->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertEquals('Unit 7', DB::table('tbl_users')->find(1)->address2);
    }

    /** An explicit empty string clears a previously saved unit number. */
    public function test_empty_address2_clears_saved_value(): void
    {
        DB::table('tbl_users')->where('id', 1)->update(['address2' => 'Unit 7']);

        $resp = $this->postJson('/mapi/update_user/1?api_token=tok_customer', [
            'address2' => '',
        ], ['apiKey' => self::API_KEY]);

        $resp->assertStatus(200)->assertJsonPath('success', 1);
        $this->assertSame('', (string) DB::table('tbl_users')->find(1)->address2);
    }
}
