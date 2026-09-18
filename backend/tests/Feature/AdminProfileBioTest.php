<?php

namespace Tests\Feature;

use App\Models\Admins;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Regression coverage for the silently-discarded chef bio in the admin panel.
 *
 * The bio lives on the tbl_availabilities row keyed by user_id, which a chef
 * only gets once they save weekly hours. profileUpdate() ran a bare
 * ->update() and always answered success:true, so for a chef with no such row
 * the update matched zero rows, the panel showed a green toast, and the bio
 * was thrown away (confirmed in production with chef user id 1120).
 *
 * profileShow() had the matching hole: it 404'd for those same chefs, which is
 * why the panel rendered an empty Bio box with no explanation.
 *
 * These drive the real admin-api-v2 routes through the auth:adminapi guard.
 */
class AdminProfileBioTest extends TestCase
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
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('phone')->nullable();
            $table->text('bio')->nullable();
            $table->tinyInteger('user_type')->default(1);
            $table->tinyInteger('verified')->default(0);
            $table->tinyInteger('is_pending')->default(0);
            $table->tinyInteger('is_paused')->default(0);
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::dropIfExists('tbl_availabilities');
        Schema::create('tbl_availabilities', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            $table->text('bio')->nullable();
            foreach (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saterday', 'sunday'] as $day) {
                $table->string($day . '_start')->nullable();
                $table->string($day . '_end')->nullable();
            }
            $table->double('minimum_order_amount')->nullable();
            $table->double('max_order_distance')->nullable();
            // Mirrors production: created_at is NOT NULL with no default.
            $table->string('created_at');
            $table->string('updated_at')->nullable();
        });

        Schema::dropIfExists('tbl_reviews');
        Schema::create('tbl_reviews', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('to_user_id');
            $table->integer('from_user_id')->nullable();
        });

        Schema::dropIfExists('tbl_menus');
        Schema::create('tbl_menus', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            $table->tinyInteger('is_live')->default(0);
        });
    }

    private function seedChef(int $id): void
    {
        DB::table('tbl_users')->insert([
            'id' => $id,
            'email' => "chef{$id}@example.com",
            'first_name' => 'Chef',
            'last_name' => (string) $id,
            'user_type' => 2,
            'verified' => 1,
            'is_pending' => 0,
            'created_at' => '2026-01-01 00:00:00',
        ]);
    }

    private function seedAvailability(int $userId, ?string $bio = null): void
    {
        DB::table('tbl_availabilities')->insert([
            'user_id' => $userId,
            'bio' => $bio,
            'monday_start' => '09:00',
            'monday_end' => '17:00',
            'created_at' => '2026-01-01 00:00:00',
        ]);
    }

    private function actingAsAdmin(): self
    {
        $admin = new Admins(['email' => 'admin@example.com']);
        $admin->id = 1;

        return $this->actingAs($admin, 'adminapi');
    }

    /**
     * CONTROL: a chef who already has an availability row. This path always
     * worked and must keep working.
     */
    public function test_bio_persists_for_chef_with_an_availability_row()
    {
        $this->seedChef(1120);
        $this->seedAvailability(1120, 'Old bio.');

        $response = $this->actingAsAdmin()
            ->putJson('/admin-api-v2/profiles/1120', ['bio' => 'Fresh bio from the panel.']);

        $response->assertStatus(200)->assertJson(['success' => true]);

        $this->assertSame(
            'Fresh bio from the panel.',
            DB::table('tbl_availabilities')->where('user_id', 1120)->value('bio')
        );
        // The upsert must not have added a second row for the same chef.
        $this->assertSame(1, DB::table('tbl_availabilities')->where('user_id', 1120)->count());
    }

    /**
     * The reported bug: no availability row, so ->update() matched nothing and
     * the panel was told the save succeeded.
     */
    public function test_bio_is_not_silently_discarded_for_chef_without_an_availability_row()
    {
        $this->seedChef(1120);
        $this->assertSame(0, DB::table('tbl_availabilities')->where('user_id', 1120)->count());

        $response = $this->actingAsAdmin()
            ->putJson('/admin-api-v2/profiles/1120', ['bio' => 'Bio saved before hours were set.']);

        // Either the upsert succeeded or the endpoint reported a failure --
        // what it must never do is answer success while dropping the write.
        if ($response->status() === 200 && $response->json('success') === true) {
            $this->assertSame(
                'Bio saved before hours were set.',
                DB::table('tbl_availabilities')->where('user_id', 1120)->value('bio'),
                'Endpoint reported success but the bio never reached the database.'
            );
        } else {
            $this->assertNotSame(true, $response->json('success'));
        }
    }

    /**
     * Re-saving an identical bio is still a success. Guards against "fix" that
     * checks affected rows: the MySQL connection does not set
     * PDO::MYSQL_ATTR_FOUND_ROWS, so an unchanged update() returns 0 rows.
     */
    public function test_resaving_an_unchanged_bio_still_reports_success()
    {
        $this->seedChef(1120);
        $this->seedAvailability(1120, 'Identical bio.');

        $this->actingAsAdmin()
            ->putJson('/admin-api-v2/profiles/1120', ['bio' => 'Identical bio.'])
            ->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertSame(
            'Identical bio.',
            DB::table('tbl_availabilities')->where('user_id', 1120)->value('bio')
        );
    }

    /**
     * A non-chef id must be rejected rather than creating an orphan
     * availability row.
     */
    public function test_bio_update_rejects_an_id_that_is_not_a_chef()
    {
        DB::table('tbl_users')->insert([
            'id' => 55,
            'email' => 'customer@example.com',
            'user_type' => 1,
            'created_at' => '2026-01-01 00:00:00',
        ]);

        $this->actingAsAdmin()
            ->putJson('/admin-api-v2/profiles/55', ['bio' => 'Not a chef.'])
            ->assertStatus(404);

        $this->assertSame(0, DB::table('tbl_availabilities')->where('user_id', 55)->count());
    }

    /**
     * profileShow() used to 404 for a chef with no availability row, so the
     * panel could not explain the empty Bio box.
     */
    public function test_profile_show_returns_an_empty_bio_instead_of_404()
    {
        $this->seedChef(1120);

        $this->actingAsAdmin()
            ->getJson('/admin-api-v2/profiles/1120')
            ->assertStatus(200)
            ->assertJson(['id' => null, 'user_id' => 1120, 'bio' => null]);
    }

    public function test_profile_show_still_404s_for_an_unknown_id()
    {
        $this->actingAsAdmin()
            ->getJson('/admin-api-v2/profiles/99999')
            ->assertStatus(404);
    }

    /**
     * Locks in the single-source-of-truth conclusion: tbl_availabilities.bio is
     * the field customers actually see. getChefPublicProfile() overwrites
     * tbl_users.bio with the availability bio, so the admin editor writing the
     * availability row is correct and there is no second field to keep in sync.
     */
    public function test_admin_written_bio_is_the_one_the_customer_endpoint_returns()
    {
        $this->seedChef(1120);
        // A stale value on tbl_users.bio must not win.
        DB::table('tbl_users')->where('id', 1120)->update(['bio' => 'Stale legacy bio.']);

        $this->actingAsAdmin()
            ->putJson('/admin-api-v2/profiles/1120', ['bio' => 'What customers should read.'])
            ->assertStatus(200);

        $this->withHeader('apiKey', self::API_KEY)
            ->getJson('/mapi/get_chef_public_profile/1120')
            ->assertStatus(200)
            ->assertJson(['success' => 1, 'data' => ['bio' => 'What customers should read.']]);
    }
}
