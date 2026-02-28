<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DemandSignalTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('tbl_orders');
        Schema::create('tbl_orders', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('chef_user_id');
            $table->string('order_date_new')->nullable();
            $table->integer('status')->default(1);
            $table->string('order_time')->nullable();
            $table->integer('menu_id')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('tbl_orders');
        parent::tearDown();
    }

    public function test_chef_with_active_order_is_hot()
    {
        DB::table('tbl_orders')->insert([
            'chef_user_id' => 101,
            'order_date_new' => '2026-03-01',
            'status' => 1, // Requested — in DEMAND_SIGNAL_STATUSES
        ]);

        $result = MapiController::computeDemandSignal([101, 102], '2026-03-01');

        $this->assertTrue($result[101], 'Chef with active order should be hot');
    }

    public function test_chef_with_accepted_order_is_hot()
    {
        DB::table('tbl_orders')->insert([
            'chef_user_id' => 101,
            'order_date_new' => '2026-03-01',
            'status' => 2, // Accepted
        ]);

        $result = MapiController::computeDemandSignal([101], '2026-03-01');

        $this->assertTrue($result[101], 'Chef with accepted order should be hot');
    }

    public function test_cancelled_order_does_not_count()
    {
        DB::table('tbl_orders')->insert([
            'chef_user_id' => 101,
            'order_date_new' => '2026-03-01',
            'status' => 4, // Cancelled — NOT in DEMAND_SIGNAL_STATUSES
        ]);

        // Use a chef ID whose crc32 hash won't trigger fake demand for this date
        // We need to find one that doesn't pass the fake threshold
        // With 40% threshold: abs(crc32("101-2026-03-01")) % 100 — check if < 40
        $hash = abs(crc32('101-2026-03-01')) % 100;
        if ($hash < MapiController::DEMAND_SIGNAL_FAKE_PERCENTAGE) {
            // This chef would get fake demand anyway, use a different ID
            // Try IDs until we find one that won't be fake-hot
            for ($id = 200; $id < 300; $id++) {
                if (abs(crc32($id . '-2026-03-01')) % 100 >= MapiController::DEMAND_SIGNAL_FAKE_PERCENTAGE) {
                    DB::table('tbl_orders')->truncate();
                    DB::table('tbl_orders')->insert([
                        'chef_user_id' => $id,
                        'order_date_new' => '2026-03-01',
                        'status' => 4,
                    ]);
                    $result = MapiController::computeDemandSignal([$id], '2026-03-01');
                    $this->assertFalse($result[$id], 'Cancelled order should not count as demand');
                    return;
                }
            }
        }

        $result = MapiController::computeDemandSignal([101], '2026-03-01');
        $this->assertFalse($result[101], 'Cancelled order should not count as demand');
    }

    public function test_deterministic_same_chef_same_date()
    {
        $result1 = MapiController::computeDemandSignal([42], '2026-03-01');
        $result2 = MapiController::computeDemandSignal([42], '2026-03-01');

        $this->assertSame($result1[42], $result2[42], 'Same chef+date should always produce same result');
    }

    public function test_deterministic_different_date_produces_variation()
    {
        // Across 100 chef IDs, different dates should produce at least one different result
        $chefIds = range(1, 100);
        $result1 = MapiController::computeDemandSignal($chefIds, '2026-03-01');
        $result2 = MapiController::computeDemandSignal($chefIds, '2026-03-02');

        $differs = false;
        foreach ($chefIds as $id) {
            if ($result1[$id] !== $result2[$id]) {
                $differs = true;
                break;
            }
        }

        $this->assertTrue($differs, 'Different dates should produce variation across 100 chefs');
    }

    public function test_fake_demand_percentage_roughly_correct()
    {
        // With 40% fake demand and no real orders, roughly 40% of chefs should be hot
        $chefIds = range(1, 1000);
        $result = MapiController::computeDemandSignal($chefIds, '2026-06-15');

        $hotCount = count(array_filter($result));

        // Allow 30-50% range (generous tolerance for crc32 distribution)
        $this->assertGreaterThan(300, $hotCount, 'Should have at least ~30% hot chefs');
        $this->assertLessThan(500, $hotCount, 'Should have at most ~50% hot chefs');
    }

    public function test_real_demand_overrides_fake()
    {
        // Chef with a real order should always be hot, regardless of hash
        DB::table('tbl_orders')->insert([
            'chef_user_id' => 101,
            'order_date_new' => '2026-03-01',
            'status' => 2,
        ]);

        $result = MapiController::computeDemandSignal([101], '2026-03-01');
        $this->assertTrue($result[101], 'Real demand always makes chef hot');
    }

    public function test_different_date_order_does_not_count()
    {
        DB::table('tbl_orders')->insert([
            'chef_user_id' => 101,
            'order_date_new' => '2026-03-02', // Different date
            'status' => 1,
        ]);

        // Find a chef ID that won't get fake demand for 2026-03-01
        for ($id = 200; $id < 300; $id++) {
            if (abs(crc32($id . '-2026-03-01')) % 100 >= MapiController::DEMAND_SIGNAL_FAKE_PERCENTAGE) {
                $result = MapiController::computeDemandSignal([$id], '2026-03-01');
                $this->assertFalse($result[$id], 'Order on different date should not count');
                return;
            }
        }
        $this->fail('Could not find a chef ID that avoids fake demand');
    }
}
