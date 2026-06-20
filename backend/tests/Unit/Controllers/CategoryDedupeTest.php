<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Guards against duplicate cuisine categories, which surfaced as repeated chips
 * (e.g. two "Indian") on the customer Home screen. Covers both the prevention
 * (create/update reject case-insensitive dupes) and the data cleanup that the
 * dedupe migration performs, including repointing menus onto the kept id.
 */
class CategoryDedupeTest extends TestCase
{
    // Matches MapiController::_taistApiKey() so the api-key guard passes.
    private const API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('tbl_categories');
        Schema::create('tbl_categories', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name', 50);
            $table->integer('chef_id')->default(0);
            $table->integer('menu_id')->default(0);
            $table->tinyInteger('status')->default(2);
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::dropIfExists('tbl_menus');
        Schema::create('tbl_menus', function (Blueprint $table) {
            $table->increments('id');
            $table->string('category_ids', 50)->default('');
        });
    }

    private function controller(): MapiController
    {
        return (new \ReflectionClass(MapiController::class))->newInstanceWithoutConstructor();
    }

    private function seedCategory(int $id, string $name, int $status = 2): void
    {
        DB::table('tbl_categories')->insert([
            'id' => $id,
            'name' => $name,
            'chef_id' => 0,
            'menu_id' => 0,
            'status' => $status,
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);
    }

    // --- Prevention: createCategory -----------------------------------------

    public function test_create_rejects_case_insensitive_duplicate()
    {
        $this->seedCategory(5, 'Indian');

        $request = new Request(['name' => '  indian  '], [], [], [], [], [], null);
        $request->headers->set('apiKey', self::API_KEY);
        $this->controller()->createCategory($request);

        $this->assertEquals(1, DB::table('tbl_categories')->where('name', 'like', '%ndian%')->count(),
            'A case-insensitive duplicate must not create a second row');
    }

    public function test_create_allows_a_genuinely_new_category()
    {
        // Control case: a distinct name should still be created.
        $this->seedCategory(5, 'Indian');

        $request = new Request(['name' => 'Thai']);
        $request->headers->set('apiKey', self::API_KEY);
        $this->controller()->createCategory($request);

        $this->assertEquals(1, DB::table('tbl_categories')->where('name', 'Thai')->count(),
            'A genuinely new category should be created');
        $this->assertEquals(2, DB::table('tbl_categories')->count());
    }

    // --- Prevention: updateCategory -----------------------------------------

    public function test_update_rejects_rename_into_existing_name()
    {
        $this->seedCategory(5, 'Indian');
        $this->seedCategory(6, 'Italian');

        // Try to rename Italian -> "indian" (collides with id 5).
        $request = new Request(['name' => 'indian']);
        $request->headers->set('apiKey', self::API_KEY);
        $this->controller()->updateCategory($request, 6);

        $this->assertEquals('Italian', DB::table('tbl_categories')->find(6)->name,
            'Renaming into an existing name must be rejected');
    }

    public function test_update_allows_a_non_colliding_rename()
    {
        // Control case: renaming to a fresh name should succeed.
        $this->seedCategory(6, 'Italian');

        $request = new Request(['name' => 'Tuscan']);
        $request->headers->set('apiKey', self::API_KEY);
        $this->controller()->updateCategory($request, 6);

        $this->assertEquals('Tuscan', DB::table('tbl_categories')->find(6)->name);
    }

    // --- Data cleanup: the dedupe migration ---------------------------------

    public function test_migration_merges_duplicates_and_repoints_menus()
    {
        // Two "Indian" (5, 20) and two "Vegetarian" (7, 21); plus a unique one.
        $this->seedCategory(5, 'Indian');
        $this->seedCategory(7, 'Vegetarian');
        $this->seedCategory(12, 'Italian');
        $this->seedCategory(20, 'Indian');
        $this->seedCategory(21, ' vegetarian ');

        // Menus tagged with the duplicate ids should be repointed to the kept id.
        DB::table('tbl_menus')->insert(['id' => 1, 'category_ids' => '20']);        // dup Indian
        DB::table('tbl_menus')->insert(['id' => 2, 'category_ids' => '5,21,12']);    // mixes kept + dup
        DB::table('tbl_menus')->insert(['id' => 3, 'category_ids' => '12']);         // untouched

        $migration = require base_path('database/migrations/2026_06_20_000001_dedupe_categories.php');
        $migration->up();

        // Duplicates gone; lowest id kept.
        $this->assertNull(DB::table('tbl_categories')->find(20));
        $this->assertNull(DB::table('tbl_categories')->find(21));
        $this->assertNotNull(DB::table('tbl_categories')->find(5));
        $this->assertNotNull(DB::table('tbl_categories')->find(7));
        $this->assertEquals(3, DB::table('tbl_categories')->count());

        // Menus repointed onto the kept ids, with no duplicate id left behind.
        $this->assertEquals('5', DB::table('tbl_menus')->find(1)->category_ids);
        $this->assertEquals('5,7,12', DB::table('tbl_menus')->find(2)->category_ids);
        $this->assertEquals('12', DB::table('tbl_menus')->find(3)->category_ids);
    }

    public function test_migration_is_a_noop_when_there_are_no_duplicates()
    {
        // Control case: clean data is left untouched.
        $this->seedCategory(5, 'Indian');
        $this->seedCategory(12, 'Italian');
        DB::table('tbl_menus')->insert(['id' => 1, 'category_ids' => '5,12']);

        $migration = require base_path('database/migrations/2026_06_20_000001_dedupe_categories.php');
        $migration->up();

        $this->assertEquals(2, DB::table('tbl_categories')->count());
        $this->assertEquals('5,12', DB::table('tbl_menus')->find(1)->category_ids);
    }
}
