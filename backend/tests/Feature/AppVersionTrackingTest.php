<?php

namespace Tests\Feature;

use App\Support\AppVersion;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Raising MIN_VERSION strands everyone below it — every build up to 32.4.7
 * freezes on the splash rather than showing the update screen. These cover the
 * tracking that tells us who is still on an old build before we raise it.
 */
class AppVersionTrackingTest extends TestCase
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
            $table->string('app_version', 20)->nullable();
            $table->string('app_build', 20)->nullable();
            $table->string('app_platform', 10)->nullable();
            $table->timestamp('app_seen_at')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        $this->seedUser(1, 'tok_one');
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

    private function getUser(array $headers)
    {
        return $this->getJson('/mapi/get_user/1?api_token=tok_one', array_merge(['apiKey' => self::API_KEY], $headers));
    }

    private function row()
    {
        return DB::table('tbl_users')->where('id', 1)->first();
    }

    public function test_records_version_headers_sent_by_the_app(): void
    {
        $this->getUser([
            'X-App-Version' => '32.4.8',
            'X-App-Build' => '192',
            'X-App-Platform' => 'android',
            'User-Agent' => 'okhttp/4.12.0',
        ])->assertOk();

        $row = $this->row();
        $this->assertSame('32.4.8', $row->app_version);
        $this->assertSame('192', $row->app_build);
        $this->assertSame('android', $row->app_platform);
        $this->assertNotNull($row->app_seen_at);
    }

    /** Pre-32.4.8 iOS builds send no headers, but the build is in the User-Agent. */
    public function test_places_old_ios_builds_from_the_user_agent(): void
    {
        $this->getUser(['User-Agent' => 'Taist/70 CFNetwork/1498.700.2 Darwin/23.6.0'])->assertOk();

        $row = $this->row();
        $this->assertSame('32.4.7', $row->app_version);
        $this->assertSame('70', $row->app_build);
        $this->assertSame('ios', $row->app_platform);
    }

    /** Pre-32.4.8 Android sends nothing usable — record nothing rather than guess. */
    public function test_old_android_leaves_the_row_untouched(): void
    {
        $this->getUser(['User-Agent' => 'okhttp/4.12.0'])->assertOk();

        $this->assertNull($this->row()->app_seen_at);
    }

    public function test_unauthenticated_requests_record_nothing(): void
    {
        $this->getJson('/mapi/get-version', [
            'X-App-Version' => '32.4.8',
            'X-App-Platform' => 'ios',
        ]);

        $this->assertNull($this->row()->app_seen_at);
    }

    /** One write per user per hour, not one per API call — but a new build writes at once. */
    public function test_skips_the_write_while_fresh_and_unchanged(): void
    {
        $recent = now()->subMinutes(5)->toDateTimeString();
        DB::table('tbl_users')->where('id', 1)->update([
            'app_version' => '32.4.7', 'app_build' => '70', 'app_platform' => 'ios', 'app_seen_at' => $recent,
        ]);

        $this->getUser(['X-App-Version' => '32.4.7', 'X-App-Build' => '70', 'X-App-Platform' => 'ios'])->assertOk();
        $this->assertSame($recent, (string) $this->row()->app_seen_at);

        $this->getUser(['X-App-Version' => '32.4.8', 'X-App-Build' => '71', 'X-App-Platform' => 'ios'])->assertOk();
        $this->assertSame('32.4.8', $this->row()->app_version);
    }

    public function test_rejects_junk_header_values(): void
    {
        $this->getUser(['X-App-Version' => "32.4.8'; DROP TABLE", 'X-App-Platform' => 'windows'])->assertOk();

        $this->assertNull($this->row()->app_seen_at);
    }

    public function test_ios_build_to_version_map(): void
    {
        $this->assertSame('32.4.7', AppVersion::iosVersionForBuild(63));
        $this->assertSame('32.4.7', AppVersion::iosVersionForBuild(70));
        $this->assertSame('32.4.8', AppVersion::iosVersionForBuild(71));
        $this->assertSame('32.4.4', AppVersion::iosVersionForBuild(58));
        $this->assertNull(AppVersion::iosVersionForBuild(5));
    }

    public function test_report_flags_chefs_below_the_proposed_minimum(): void
    {
        $now = now()->toDateTimeString();
        DB::table('tbl_users')->where('id', 1)->update(['app_version' => '32.4.8', 'app_platform' => 'ios', 'app_seen_at' => $now]);
        $this->seedUser(2, 'tok_two', ['user_type' => 2, 'first_name' => 'Jose', 'app_version' => '32.4.7', 'app_platform' => 'ios', 'app_seen_at' => $now]);
        $this->seedUser(3, 'tok_three', ['user_type' => 2, 'app_version' => '32.4.8', 'app_platform' => 'android', 'app_seen_at' => $now]);
        // Not seen recently — excluded.
        $this->seedUser(4, 'tok_four', ['app_version' => '32.4.4', 'app_platform' => 'ios', 'app_seen_at' => now()->subDays(90)->toDateTimeString()]);

        $this->artisan('app:versions', ['--min' => '32.4.8'])
            ->expectsOutput('Users seen in the last 30 days: 3')
            ->expectsOutput('  all        2 / 3  (66.7%)')
            ->expectsOutput('  chefs      1 / 2  (50%)')
            ->expectsOutput('  customers  1 / 1  (100%)')
            ->expectsOutput('Chefs below 32.4.8 (would be locked out):')
            ->assertExitCode(0);
    }
}
