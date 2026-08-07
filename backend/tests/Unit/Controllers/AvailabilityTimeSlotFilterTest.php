<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\MapiController;
use Tests\TestCase;

/**
 * Regression coverage for the chef-search meal-time filter.
 *
 * Availability columns hold "HH:MM" strings (e.g. "09:00"), but the search
 * query previously ran HOUR(convert_tz(from_unixtime(col), ...)) on them.
 * MySQL coerces '09:00' to the number 9 — nine seconds after the 1970
 * epoch — so every chef collapsed onto one bogus hour and the
 * Breakfast/Lunch/Dinner/Late filters included/excluded the wrong chefs.
 *
 * The hour expression must now read the hour directly from "HH:MM" values
 * while keeping the legacy unix-timestamp path for old rows.
 */
class AvailabilityTimeSlotFilterTest extends TestCase
{
    private function invokeStatic(string $method, ...$args)
    {
        $ref = new \ReflectionClass(MapiController::class);
        $m = $ref->getMethod($method);
        $m->setAccessible(true);

        return $m->invoke(null, ...$args);
    }

    public function test_hour_expr_reads_hhmm_values_directly(): void
    {
        $expr = $this->invokeStatic('availabilityHourExpr', 'monday_start', -5.0);

        // "HH:MM" branch: hour comes straight from the string, no epoch math.
        $this->assertStringContainsString("WHEN monday_start LIKE '%:%'", $expr);
        $this->assertStringContainsString("SUBSTRING_INDEX(monday_start, ':', 1)", $expr);
    }

    /** Control: legacy unix-timestamp rows keep the original conversion. */
    public function test_hour_expr_keeps_legacy_timestamp_path(): void
    {
        $expr = $this->invokeStatic('availabilityHourExpr', 'monday_start', -5.0);

        $this->assertStringContainsString('from_unixtime(monday_start)', $expr);
        $this->assertStringContainsString('convert_tz', $expr);
        $this->assertStringContainsString('-5 * 60 * 60', $expr);
    }

    /**
     * The timezone gap is embedded as a cast float — a malicious
     * timezone_gap string can no longer be interpolated into the SQL
     * (the caller casts (float) before invoking).
     */
    public function test_hour_expr_timezone_gap_is_numeric(): void
    {
        $expr = $this->invokeStatic('availabilityHourExpr', 'sunday_end', 5.5);

        $this->assertStringContainsString('5.5 * 60 * 60', $expr);
        $this->assertStringNotContainsString(';', $expr);
    }

    public function test_breakfast_window_bounds(): void
    {
        $sql = $this->invokeStatic('availabilityTimeSlotCondition', 'monday', 1, -6.0);

        $this->assertStringContainsString('>= 5', $sql);
        $this->assertStringContainsString('< 11', $sql);
        $this->assertStringContainsString('monday_start', $sql);
        $this->assertStringContainsString('monday_end', $sql);
    }

    public function test_lunch_window_bounds(): void
    {
        $sql = $this->invokeStatic('availabilityTimeSlotCondition', 'tuesday', 2, -6.0);

        $this->assertStringContainsString('>= 11', $sql);
        $this->assertStringContainsString('< 16', $sql);
        $this->assertStringContainsString('tuesday_start', $sql);
    }

    public function test_dinner_window_bounds(): void
    {
        $sql = $this->invokeStatic('availabilityTimeSlotCondition', 'friday', 3, -6.0);

        $this->assertStringContainsString('>= 16', $sql);
        $this->assertStringContainsString('< 22', $sql);
        $this->assertStringContainsString('friday_start', $sql);
    }

    /** Late-night wraps past midnight and keeps the overnight start>end clause. */
    public function test_late_night_window_handles_overnight(): void
    {
        $sql = $this->invokeStatic('availabilityTimeSlotCondition', 'saterday', 4, -6.0);

        $this->assertStringContainsString('>= 22', $sql);
        $this->assertStringContainsString('saterday_start > saterday_end', $sql);
    }

    /** Control: an unknown slot produces no condition (falls back to day-only). */
    public function test_unknown_slot_returns_null(): void
    {
        $this->assertNull($this->invokeStatic('availabilityTimeSlotCondition', 'monday', 0, -6.0));
        $this->assertNull($this->invokeStatic('availabilityTimeSlotCondition', 'monday', 9, -6.0));
    }

    /** Every slot condition must use the hour expression, never bare from_unixtime on the column. */
    public function test_slot_conditions_never_run_from_unixtime_unconditionally(): void
    {
        foreach ([1, 2, 3, 4] as $slot) {
            $sql = $this->invokeStatic('availabilityTimeSlotCondition', 'wednesday', $slot, -6.0);
            $this->assertStringContainsString("LIKE '%:%'", $sql, "slot {$slot} must branch on HH:MM format");
        }
    }
}
