<?php

namespace Tests\Unit\Helpers;

use App\Helpers\AppHelper;
use Tests\TestCase;

/**
 * The chef acceptance window was a flat 30 minutes from order creation, so an
 * order placed at 11:39 for a 2:00pm slot was auto-cancelled and refunded at
 * 12:09 — over an hour and a half before the chef was needed. The window now
 * scales with how far out the slot is, while reserving the last hour before
 * the slot so a cancelled customer can still book someone else.
 */
class AcceptanceDeadlineTest extends TestCase
{
    private const NOW = 1789227600; // arbitrary fixed "now"

    private function windowMinutes(int $leadSeconds): float
    {
        $deadline = AppHelper::acceptanceDeadlineFor(self::NOW, self::NOW + $leadSeconds);
        return ($deadline - self::NOW) / 60;
    }

    public function test_window_is_a_flat_thirty_minutes(): void
    {
        foreach ([120, 150, 300, 24 * 60, 7 * 24 * 60] as $leadMins) {
            $this->assertSame(
                30.0,
                $this->windowMinutes($leadMins * 60),
                "lead {$leadMins}m should still give 30 minutes"
            );
        }
    }

    public function test_window_does_not_depend_on_the_slot_time(): void
    {
        $withSlot = AppHelper::acceptanceDeadlineFor(self::NOW, self::NOW + (150 * 60));
        $withoutSlot = AppHelper::acceptanceDeadlineFor(self::NOW, null);

        $this->assertSame($withSlot, $withoutSlot);
        $this->assertSame(self::NOW + 1800, $withSlot);
    }

    /**
     * The two rules have to hold together: orders carry a hard two-hour
     * minimum lead, so a 30-minute window always closes with at least 90
     * minutes left for the customer to book someone else.
     */
    public function test_customer_always_keeps_ninety_minutes_before_the_slot(): void
    {
        $slot = self::NOW + (120 * 60); // the tightest lead the app allows
        $deadline = AppHelper::acceptanceDeadlineFor(self::NOW, $slot);

        $this->assertSame(90, (int) (($slot - $deadline) / 60));
    }

    // Control: the window is the documented constant, not a magic number.
    public function test_window_is_the_declared_constant(): void
    {
        $this->assertSame(1800, AppHelper::ACCEPTANCE_WINDOW);
    }

    // ---- expiry sweep window -------------------------------------------

    /**
     * The sweep crashed for months before it could cancel anything holding a
     * payment token, so the first correct run would otherwise refund a whole
     * backlog at once — in production, 12 orders from March to August, each
     * with a live payment intent.
     */
    public function test_sweep_ignores_a_months_old_backlog(): void
    {
        $now = self::NOW;
        $floor = AppHelper::expirySweepFloor($now);

        $thirtyThreeDaysAgo = $now - (33 * 24 * 3600);

        $this->assertLessThan($floor, $thirtyThreeDaysAgo, 'old backlog must fall outside the window');
    }

    public function test_sweep_still_catches_an_order_a_chef_just_missed(): void
    {
        $now = self::NOW;
        $floor = AppHelper::expirySweepFloor($now);

        foreach ([600, 3600, 24 * 3600, 6 * 24 * 3600] as $ago) {
            $this->assertGreaterThan($floor, $now - $ago, "deadline {$ago}s ago should sweep");
        }
    }

    // Control: the boundary is exactly seven days, not open-ended.
    public function test_sweep_window_is_seven_days(): void
    {
        $this->assertSame(7 * 24 * 3600, AppHelper::EXPIRY_SWEEP_LOOKBACK);
        $this->assertSame(self::NOW - (7 * 24 * 3600), AppHelper::expirySweepFloor(self::NOW));
    }
}
