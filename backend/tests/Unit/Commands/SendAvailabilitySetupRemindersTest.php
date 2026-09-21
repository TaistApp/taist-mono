<?php

namespace Tests\Unit\Commands;

use App\Console\Commands\SendAvailabilitySetupReminders as Cmd;
use Carbon\Carbon;
use Tests\TestCase;

/**
 * Coverage for who the availability-setup nudge targets and how often.
 *
 * The failure modes this guards are both directions: a chef who never set
 * hours going un-nudged forever (the bug it was written for), and a chef who
 * already set hours — or already said no four times — getting pushed anyway.
 */
class SendAvailabilitySetupRemindersTest extends TestCase
{
    private function chef(array $overrides = []): object
    {
        return (object) array_merge([
            'user_type' => 2,
            'verified' => 1,
            'is_pending' => 0,
            'is_paused' => 0,
        ], $overrides);
    }

    private function availability(array $days = []): object
    {
        $row = [];
        foreach (Cmd::DAY_START_COLUMNS as $column) {
            $row[$column] = '';
        }

        return (object) array_merge($row, $days);
    }

    // --- who counts as a chef worth nudging -------------------------------

    /** Control case: an approved, active chef is in scope. */
    public function test_approved_active_chef_is_in_scope(): void
    {
        $this->assertTrue(Cmd::isActiveChef($this->chef()));
    }

    public function test_pending_chef_is_skipped(): void
    {
        $this->assertFalse(Cmd::isActiveChef($this->chef(['is_pending' => 1])));
    }

    public function test_unverified_chef_is_skipped(): void
    {
        $this->assertFalse(Cmd::isActiveChef($this->chef(['verified' => 0])));
    }

    /** A paused chef took themselves offline on purpose; nudging that is spam. */
    public function test_paused_chef_is_skipped(): void
    {
        $this->assertFalse(Cmd::isActiveChef($this->chef(['is_paused' => 1])));
    }

    public function test_customer_account_is_skipped(): void
    {
        $this->assertFalse(Cmd::isActiveChef($this->chef(['user_type' => 1])));
    }

    // --- what counts as "no availability set" -----------------------------

    /** The state Chef Thalor was in: approved, no tbl_availabilities row at all. */
    public function test_missing_availability_row_counts_as_unset(): void
    {
        $this->assertTrue(Cmd::hasNoAvailability(null));
    }

    /** Opened the sheet, saved nothing — still unbookable, still needs the nudge. */
    public function test_blank_availability_row_counts_as_unset(): void
    {
        $this->assertTrue(Cmd::hasNoAvailability($this->availability()));
    }

    /** Control case: one real day of hours means the chef is done. */
    public function test_chef_with_one_day_set_is_not_nudged(): void
    {
        $this->assertFalse(Cmd::hasNoAvailability($this->availability(['wednesday_start' => '10:00'])));
    }

    /** The legacy "saterday" column spelling has to be honoured or weekend-only chefs get spammed. */
    public function test_saturday_legacy_column_spelling_counts_as_set(): void
    {
        $this->assertFalse(Cmd::hasNoAvailability($this->availability(['saterday_start' => '09:00'])));
    }

    public function test_array_rows_are_supported(): void
    {
        $this->assertTrue(Cmd::hasNoAvailability(['monday_start' => '']));
        $this->assertFalse(Cmd::hasNoAvailability(['monday_start' => '11:00']));
    }

    // --- throttling --------------------------------------------------------

    /** Control case: a chef never reminded is sendable. */
    public function test_never_reminded_chef_is_not_throttled(): void
    {
        $this->assertFalse(Cmd::shouldThrottle(null));
        $this->assertFalse(Cmd::shouldThrottle(''));
    }

    public function test_recent_reminder_throttles(): void
    {
        $now = time();
        $this->assertTrue(Cmd::shouldThrottle(date('Y-m-d H:i:s', $now - 3600), $now));
    }

    public function test_reminder_older_than_the_window_does_not_throttle(): void
    {
        $now = time();
        $lastSent = date('Y-m-d H:i:s', $now - Cmd::THROTTLE_SECONDS - 60);
        $this->assertFalse(Cmd::shouldThrottle($lastSent, $now));
    }

    // --- quiet hours -------------------------------------------------------

    /** Control case: mid-afternoon in the chef's own state is fair game. */
    public function test_afternoon_local_time_is_inside_the_window(): void
    {
        // 19:00 UTC = 15:00 Eastern (DST).
        $this->assertTrue(Cmd::isInsideLocalWindow('IN', Carbon::parse('2026-09-21 19:00:00', 'UTC')));
    }

    /** The whole point of the window: no 4am pushes from an hourly schedule. */
    public function test_small_hours_local_time_is_outside_the_window(): void
    {
        // 08:00 UTC = 04:00 Eastern (DST).
        $this->assertFalse(Cmd::isInsideLocalWindow('IN', Carbon::parse('2026-09-21 08:00:00', 'UTC')));
    }

    public function test_late_evening_local_time_is_outside_the_window(): void
    {
        // 02:00 UTC = 22:00 Eastern the previous day (DST).
        $this->assertFalse(Cmd::isInsideLocalWindow('IN', Carbon::parse('2026-09-22 02:00:00', 'UTC')));
    }

    /** A chef with no state on file still has to be reachable, via the default timezone. */
    public function test_missing_state_falls_back_to_the_default_timezone(): void
    {
        $this->assertTrue(Cmd::isInsideLocalWindow(null, Carbon::parse('2026-09-21 19:00:00', 'UTC')));
    }
}
