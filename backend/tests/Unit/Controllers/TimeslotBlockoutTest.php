<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TimeslotBlockoutTest extends TestCase
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

        Schema::dropIfExists('tbl_menus');
        Schema::create('tbl_menus', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            $table->double('estimated_time')->nullable();
            $table->tinyInteger('is_live')->default(1);
            $table->string('title')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('tbl_orders');
        Schema::dropIfExists('tbl_menus');
        parent::tearDown();
    }

    private function generateSlots(string $from, string $to): array
    {
        $slots = [];
        $startMinutes = MapiController::timeToMinutes($from);
        $endMinutes = MapiController::timeToMinutes($to);
        for ($m = $startMinutes; $m < $endMinutes; $m += 30) {
            $slots[] = sprintf('%02d:%02d', intdiv($m, 60), $m % 60);
        }
        return $slots;
    }

    private function seedMenu(int $chefId, int $estimatedTime, int $menuId = 1): void
    {
        DB::table('tbl_menus')->insert([
            'id' => $menuId,
            'user_id' => $chefId,
            'estimated_time' => $estimatedTime,
            'is_live' => 1,
            'title' => 'Test Menu Item',
        ]);
    }

    private function seedOrder(int $chefId, string $date, string $time, int $menuId = 1, int $status = 2): void
    {
        DB::table('tbl_orders')->insert([
            'chef_user_id' => $chefId,
            'order_date_new' => $date,
            'order_time' => $time,
            'menu_id' => $menuId,
            'status' => $status,
        ]);
    }

    public function test_no_orders_returns_all_slots()
    {
        $this->seedMenu(101, 60);

        $slots = $this->generateSlots('10:00', '18:00');
        $filtered = MapiController::filterSlotsByOrders($slots, 101, '2026-03-01');

        $this->assertEquals($slots, $filtered);
    }

    public function test_single_order_blocks_around_it()
    {
        // Chef has 90 min max menu item, buffer = 30 min (from constants)
        $this->seedMenu(101, 90);
        $this->seedOrder(101, '2026-03-01', '12:00');

        $slots = $this->generateSlots('10:00', '18:00');
        $filtered = MapiController::filterSlotsByOrders($slots, 101, '2026-03-01');

        // Order at 12:00 (720 min), 90 min prep → ends 13:30 (810 min)
        // New order session = 90 min (chef's max), buffer = 30 min
        // comesBefore: slot + 90 + 30 <= 720 → slot <= 600 (10:00)
        // comesAfter: slot >= 810 + 30 = 840 (14:00)
        $this->assertContains('10:00', $filtered, 'Slot at boundary should be available');
        $this->assertNotContains('10:30', $filtered, 'Projected end + buffer overlaps order');
        $this->assertNotContains('12:00', $filtered, 'Slot at order time blocked');
        $this->assertNotContains('13:30', $filtered, 'Slot during order blocked');
        $this->assertContains('14:00', $filtered, 'Slot at order end + buffer available');
        $this->assertContains('17:30', $filtered);
    }

    public function test_two_orders_blocks_gap_between_them()
    {
        $this->seedMenu(101, 60, 1);
        $this->seedOrder(101, '2026-03-01', '12:00', 1);
        $this->seedOrder(101, '2026-03-01', '13:30', 1);

        $slots = $this->generateSlots('10:00', '18:00');
        $filtered = MapiController::filterSlotsByOrders($slots, 101, '2026-03-01');

        // Gap between orders too small for new 60 min order + 30 min buffers
        $this->assertNotContains('12:00', $filtered);
        $this->assertNotContains('13:00', $filtered);
        $this->assertNotContains('13:30', $filtered);
    }

    public function test_cancelled_order_does_not_block()
    {
        $this->seedMenu(101, 60);
        $this->seedOrder(101, '2026-03-01', '12:00', 1, 4); // Cancelled

        $slots = $this->generateSlots('10:00', '18:00');
        $filtered = MapiController::filterSlotsByOrders($slots, 101, '2026-03-01');

        $this->assertContains('12:00', $filtered);
        $this->assertEquals($slots, $filtered);
    }

    public function test_requested_order_blocks()
    {
        $this->seedMenu(101, 60);
        $this->seedOrder(101, '2026-03-01', '12:00', 1, 1); // Requested

        $slots = $this->generateSlots('10:00', '18:00');
        $filtered = MapiController::filterSlotsByOrders($slots, 101, '2026-03-01');

        $this->assertNotContains('12:00', $filtered);
    }

    public function test_on_my_way_order_blocks()
    {
        $this->seedMenu(101, 60);
        $this->seedOrder(101, '2026-03-01', '12:00', 1, 7); // On My Way

        $slots = $this->generateSlots('10:00', '18:00');
        $filtered = MapiController::filterSlotsByOrders($slots, 101, '2026-03-01');

        $this->assertNotContains('12:00', $filtered);
    }

    public function test_completed_order_does_not_block()
    {
        $this->seedMenu(101, 60);
        $this->seedOrder(101, '2026-03-01', '12:00', 1, 3); // Completed

        $slots = $this->generateSlots('10:00', '18:00');
        $filtered = MapiController::filterSlotsByOrders($slots, 101, '2026-03-01');

        $this->assertContains('12:00', $filtered);
    }

    public function test_no_live_menu_uses_default_duration()
    {
        $this->seedMenu(101, 60, 1);
        DB::table('tbl_menus')->where('id', 1)->update(['is_live' => 0]);
        $this->seedOrder(101, '2026-03-01', '12:00', 1);

        $slots = $this->generateSlots('10:00', '18:00');
        $filtered = MapiController::filterSlotsByOrders($slots, 101, '2026-03-01');

        // Default duration = 120 min (from constant), buffer = 30
        // Order at 12:00, 60 min prep → ends 13:00
        // comesBefore: slot + 120 + 30 <= 720 → slot <= 570 (9:30) — all our slots start at 10:00
        // comesAfter: slot >= 810 (13:30)
        // So 10:00 through 13:00 are blocked
        $this->assertNotContains('10:00', $filtered);
        $this->assertNotContains('12:00', $filtered);
        $this->assertContains('13:30', $filtered);
    }

    public function test_slot_between_two_orders_allowed_when_gap_is_large()
    {
        $this->seedMenu(101, 60, 1);
        $this->seedOrder(101, '2026-03-01', '10:00', 1);
        $this->seedOrder(101, '2026-03-01', '15:00', 1);

        $slots = $this->generateSlots('08:00', '18:00');
        $filtered = MapiController::filterSlotsByOrders($slots, 101, '2026-03-01');

        // Order 1: 10:00-11:00, Order 2: 15:00-16:00
        // comesAfter order 1: slot >= 11:30
        // comesBefore order 2: slot + 60 + 30 <= 15:00 → slot <= 13:30
        $this->assertContains('11:30', $filtered);
        $this->assertContains('12:00', $filtered);
        $this->assertContains('13:30', $filtered);
        // 14:00 + 60 + 30 = 15:30 > 15:00 → BLOCKED
        $this->assertNotContains('14:00', $filtered);
    }

    public function test_time_to_minutes_helper()
    {
        $this->assertEquals(0, MapiController::timeToMinutes('00:00'));
        $this->assertEquals(60, MapiController::timeToMinutes('01:00'));
        $this->assertEquals(90, MapiController::timeToMinutes('01:30'));
        $this->assertEquals(720, MapiController::timeToMinutes('12:00'));
        $this->assertEquals(1410, MapiController::timeToMinutes('23:30'));
    }
}
