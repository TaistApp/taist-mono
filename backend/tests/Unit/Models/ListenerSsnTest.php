<?php

namespace Tests\Unit\Models;

use App\Listener;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Guards the SSN-at-rest invariants for the chef onboarding redesign:
 * the chef enters their SSN once in the Stripe step and it powers both
 * Stripe id_number pre-fill AND background check pre-fill. The privacy
 * contract is: encrypted at rest, hidden from API responses, with a
 * `has_ssn` boolean exposed so the UI can skip re-asking.
 */
class ListenerSsnTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('tbl_users');
        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email')->nullable();
            $table->string('password')->default('');
            $table->string('phone')->nullable();
            $table->integer('birthday')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip')->nullable();
            $table->text('ssn')->nullable();
            $table->string('api_token')->nullable();
            $table->string('code')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });
    }

    public function test_ssn_is_encrypted_at_rest()
    {
        $user = new Listener();
        $user->first_name = 'Dayne';
        $user->ssn = '123-45-6789';
        $user->save();

        $raw = DB::table('tbl_users')->where('id', $user->id)->value('ssn');

        $this->assertNotEquals('123-45-6789', $raw, 'Raw row must not contain plaintext SSN');
        $this->assertNotNull($raw);
        $this->assertGreaterThan(20, strlen($raw), 'Encrypted payload should be longer than the plaintext');
    }

    public function test_ssn_round_trips_via_cast()
    {
        $user = new Listener();
        $user->first_name = 'Dayne';
        $user->ssn = '123-45-6789';
        $user->save();

        $reloaded = Listener::find($user->id);
        $this->assertSame('123-45-6789', $reloaded->ssn);
    }

    public function test_ssn_is_hidden_from_json_output()
    {
        $user = new Listener();
        $user->first_name = 'Dayne';
        $user->ssn = '123-45-6789';
        $user->save();

        $json = Listener::find($user->id)->toArray();

        $this->assertArrayNotHasKey('ssn', $json, 'SSN must never leak into API responses');
    }

    public function test_has_ssn_true_when_value_present()
    {
        $user = new Listener();
        $user->first_name = 'Dayne';
        $user->ssn = '123-45-6789';
        $user->save();

        $json = Listener::find($user->id)->toArray();

        $this->assertArrayHasKey('has_ssn', $json);
        $this->assertTrue($json['has_ssn'], 'has_ssn should be true once the chef has saved their SSN');
    }

    public function test_has_ssn_false_when_value_missing()
    {
        // Control case: a brand-new chef with no SSN saved should not be told
        // they can skip the background-check SSN input.
        $user = new Listener();
        $user->first_name = 'Dayne';
        $user->save();

        $json = Listener::find($user->id)->toArray();

        $this->assertArrayHasKey('has_ssn', $json);
        $this->assertFalse($json['has_ssn']);
    }
}
