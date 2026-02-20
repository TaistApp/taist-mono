<?php

namespace Tests\Unit\Services;

use App\Services\WeeklyOrderReminderService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class WeeklyOrderReminderServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('tbl_users');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('weekly_order_reminder_logs');

        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('state')->nullable();
            $table->string('photo')->nullable();
            $table->tinyInteger('user_type')->default(1);
            $table->tinyInteger('verified')->default(1);
            $table->string('fcm_token')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('title');
            $table->string('body');
            $table->string('image')->nullable();
            $table->string('fcm_token');
            $table->unsignedBigInteger('user_id');
            $table->string('navigation_id')->default('');
            $table->string('role')->default('customer');
            $table->timestamps();
        });

        Schema::create('weekly_order_reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id');
            $table->string('week_key', 16);
            $table->string('slot_key', 16);
            $table->unsignedTinyInteger('message_index');
            $table->string('timezone', 64);
            $table->timestamp('sent_at_utc');
            $table->string('sent_at_local', 32);
            $table->timestamps();
            $table->unique(['user_id', 'week_key', 'slot_key'], 'weekly_reminder_unique_slot');
        });
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_sends_push_for_customer_in_matching_weekly_slot()
    {
        putenv('WEEKLY_ORDER_REMINDERS_ENABLED=true');
        putenv('WEEKLY_ORDER_REMINDERS_MAX_PER_WEEK=2');
        putenv('WEEKLY_ORDER_REMINDERS_START_HOUR=10');
        putenv('WEEKLY_ORDER_REMINDERS_END_HOUR=16');
        putenv('WEEKLY_ORDER_REMINDERS_WEEKDAYS=1,2,3,4');
        putenv('WEEKLY_ORDER_REMINDERS_MESSAGES=["M1","M2"]');

        DB::table('tbl_users')->insert([
            'id' => 101,
            'first_name' => 'Test',
            'last_name' => 'Customer',
            'state' => 'IN',
            'photo' => '',
            'user_type' => 1,
            'verified' => 1,
            'fcm_token' => 'token_101',
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        $firebaseMock = Mockery::mock();
        $firebaseMock->shouldReceive('send')->once();

        $service = new WeeklyOrderReminderService($firebaseMock);

        $timezone = 'America/Indiana/Indianapolis';
        $baseMonday = Carbon::parse('2026-02-16 00:00:00', $timezone);
        $weekKey = $baseMonday->format('o-\WW');
        $slotKeys = $service->getWeeklySlotKeysForUser(101, $weekKey);
        [$weekday, $slotInDay] = array_map('intval', explode(':', $slotKeys[0]));

        $localNow = $baseMonday->copy()
            ->addDays($weekday - 1)
            ->setTime(10, 0, 0)
            ->addMinutes(($slotInDay * 15) + 1);
        $utcNow = $localNow->copy()->setTimezone('UTC');

        $stats = $service->sendWeeklyReminders(false, $utcNow);

        $this->assertEquals(1, $stats['sent']);
        $this->assertEquals(1, DB::table('weekly_order_reminder_logs')->count());
        $this->assertEquals(1, DB::table('notifications')->count());
    }

    public function test_respects_max_two_per_week_cap()
    {
        putenv('WEEKLY_ORDER_REMINDERS_ENABLED=true');
        putenv('WEEKLY_ORDER_REMINDERS_MAX_PER_WEEK=2');
        putenv('WEEKLY_ORDER_REMINDERS_START_HOUR=10');
        putenv('WEEKLY_ORDER_REMINDERS_END_HOUR=16');
        putenv('WEEKLY_ORDER_REMINDERS_WEEKDAYS=1,2,3,4');
        putenv('WEEKLY_ORDER_REMINDERS_MESSAGES=["M1","M2"]');

        DB::table('tbl_users')->insert([
            'id' => 202,
            'first_name' => 'Cap',
            'last_name' => 'Customer',
            'state' => 'IN',
            'photo' => '',
            'user_type' => 1,
            'verified' => 1,
            'fcm_token' => 'token_202',
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        $firebaseMock = Mockery::mock();
        $firebaseMock->shouldReceive('send')->never();

        $service = new WeeklyOrderReminderService($firebaseMock);

        $timezone = 'America/Indiana/Indianapolis';
        $baseMonday = Carbon::parse('2026-02-16 00:00:00', $timezone);
        $weekKey = $baseMonday->format('o-\WW');
        $slotKeys = $service->getWeeklySlotKeysForUser(202, $weekKey);
        [$weekday, $slotInDay] = array_map('intval', explode(':', $slotKeys[0]));

        DB::table('weekly_order_reminder_logs')->insert([
            [
                'user_id' => 202,
                'week_key' => $weekKey,
                'slot_key' => '1:0',
                'message_index' => 0,
                'timezone' => $timezone,
                'sent_at_utc' => now(),
                'sent_at_local' => '2026-02-16 10:01:00',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_id' => 202,
                'week_key' => $weekKey,
                'slot_key' => '2:0',
                'message_index' => 1,
                'timezone' => $timezone,
                'sent_at_utc' => now(),
                'sent_at_local' => '2026-02-17 10:01:00',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $localNow = $baseMonday->copy()
            ->addDays($weekday - 1)
            ->setTime(10, 0, 0)
            ->addMinutes(($slotInDay * 15) + 1);
        $utcNow = $localNow->copy()->setTimezone('UTC');

        $stats = $service->sendWeeklyReminders(false, $utcNow);

        $this->assertEquals(0, $stats['sent']);
        $this->assertEquals(1, $stats['skipped_cap']);
        $this->assertEquals(2, DB::table('weekly_order_reminder_logs')->count());
    }
}
