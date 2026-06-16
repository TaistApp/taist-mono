<?php

namespace Tests\Unit\Services;

use App\Services\ChefConfirmationReminderService;
use App\Services\TwilioService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

/**
 * Tests for the chef availability reminder service, focused on which chefs
 * are selected for the 24-hour reminder.
 *
 * Regression guard for the "Pause Account" feature: a chef who has self-paused
 * (is_paused = 1) must NOT receive availability reminders, even though they are
 * still a verified, non-pending chef. This was the exact notification that drove
 * a chef to delete his account, so the exclusion is covered here.
 */
class ChefConfirmationReminderServiceTest extends TestCase
{
    /** @var string|false */
    private $originalAppEnv;

    protected function setUp(): void
    {
        parent::setUp();

        // findChefsNeedingReminders() only runs in production; force it on.
        $this->originalAppEnv = getenv('APP_ENV');
        putenv('APP_ENV=production');
        $_ENV['APP_ENV'] = 'production';
        $_SERVER['APP_ENV'] = 'production';

        Schema::dropIfExists('tbl_users');
        Schema::dropIfExists('tbl_availabilities');
        Schema::dropIfExists('tbl_availability_overrides');

        Schema::create('tbl_users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('state')->nullable();
            $table->tinyInteger('user_type')->default(1);
            $table->tinyInteger('verified')->default(1);
            $table->tinyInteger('is_pending')->default(0);
            $table->tinyInteger('is_paused')->default(0);
            $table->string('phone')->nullable();
            $table->string('fcm_token')->nullable();
            $table->string('last_online_reminder_sent_at')->nullable();
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('tbl_availabilities', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            foreach (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saterday', 'sunday'] as $day) {
                $table->string($day . '_start')->nullable();
                $table->string($day . '_end')->nullable();
            }
            $table->string('created_at')->nullable();
            $table->string('updated_at')->nullable();
        });

        Schema::create('tbl_availability_overrides', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            $table->date('override_date');
            $table->string('start_time')->nullable();
            $table->string('end_time')->nullable();
            $table->string('status')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        if ($this->originalAppEnv === false) {
            putenv('APP_ENV');
            unset($_ENV['APP_ENV'], $_SERVER['APP_ENV']);
        } else {
            putenv('APP_ENV=' . $this->originalAppEnv);
            $_ENV['APP_ENV'] = $this->originalAppEnv;
            $_SERVER['APP_ENV'] = $this->originalAppEnv;
        }

        Mockery::close();
        parent::tearDown();
    }

    private function makeService(): ChefConfirmationReminderService
    {
        // The Twilio dependency is never exercised by findChefsNeedingReminders().
        $twilio = Mockery::mock(TwilioService::class);
        return new ChefConfirmationReminderService($twilio);
    }

    /**
     * Insert a chef plus an availability row whose schedule for "tomorrow"
     * lands inside the ~24h reminder window, so the chef qualifies unless
     * filtered out by another rule (pending/unverified/paused).
     */
    private function seedChefInReminderWindow(int $id, array $overrides = []): void
    {
        DB::table('tbl_users')->insert(array_merge([
            'id' => $id,
            'state' => 'CA', // America/Los_Angeles
            'user_type' => 2,
            'verified' => 1,
            'is_pending' => 0,
            'is_paused' => 0,
            'phone' => '+15555550' . $id,
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ], $overrides));

        // Reminder time = tomorrow's start minus one day = today at the start time.
        // Setting the start time to "now" in the chef's timezone puts the chef
        // squarely inside the 30-minute window. Every day column is populated so
        // the test is robust regardless of which weekday "tomorrow" is.
        $chefNow = new Carbon('now', 'America/Los_Angeles');
        $startTime = $chefNow->format('H:i');

        $row = ['user_id' => $id, 'created_at' => now()->toDateTimeString(), 'updated_at' => now()->toDateTimeString()];
        foreach (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saterday', 'sunday'] as $day) {
            $row[$day . '_start'] = $startTime;
            $row[$day . '_end'] = '23:59';
        }
        DB::table('tbl_availabilities')->insert($row);
    }

    public function test_active_chef_in_window_receives_reminder()
    {
        $this->seedChefInReminderWindow(1);

        $reminders = $this->makeService()->findChefsNeedingReminders();

        $chefIds = array_column($reminders, 'chef_id');
        $this->assertContains(1, $chefIds, 'An active, verified chef in the window should be reminded');
    }

    public function test_paused_chef_is_excluded_from_reminders()
    {
        // Identical setup to the active chef, but paused.
        $this->seedChefInReminderWindow(1);                 // active control
        $this->seedChefInReminderWindow(2, ['is_paused' => 1]); // paused

        $reminders = $this->makeService()->findChefsNeedingReminders();

        $chefIds = array_column($reminders, 'chef_id');
        $this->assertContains(1, $chefIds, 'Active chef should still be reminded');
        $this->assertNotContains(2, $chefIds, 'Paused chef must not be reminded');
    }
}
