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

    public function test_order_placed_two_and_a_half_hours_ahead_gets_ninety_minutes(): void
    {
        // The reported case: 2.5h lead used to be cancelled after 30 minutes.
        $this->assertSame(90.0, $this->windowMinutes(150 * 60));
    }

    public function test_minimum_lead_order_still_gets_a_full_hour(): void
    {
        // 2h is the shortest lead the app allows, leaving 1h after the buffer.
        $this->assertSame(60.0, $this->windowMinutes(120 * 60));
    }

    public function test_far_future_order_is_capped_so_it_cannot_sit_for_days(): void
    {
        $this->assertSame(360.0, $this->windowMinutes(7 * 24 * 60 * 60));
    }

    public function test_the_hour_before_the_slot_is_reserved_for_the_customer(): void
    {
        $orderTs = self::NOW + (150 * 60);
        $deadline = AppHelper::acceptanceDeadlineFor(self::NOW, $orderTs);

        $this->assertSame(3600, $orderTs - $deadline);
    }

    public function test_missing_slot_time_falls_back_to_the_minimum_window(): void
    {
        $this->assertSame(self::NOW + 1800, AppHelper::acceptanceDeadlineFor(self::NOW, null));
        $this->assertSame(self::NOW + 1800, AppHelper::acceptanceDeadlineFor(self::NOW, 0));
    }

    // Control: a short-lead order can never drop below the 30-minute floor,
    // so a chef always gets a usable window no matter how tight the slot.
    public function test_window_never_falls_below_thirty_minutes(): void
    {
        foreach ([0, 15 * 60, 45 * 60, 80 * 60] as $lead) {
            $this->assertGreaterThanOrEqual(30.0, $this->windowMinutes($lead), "lead {$lead}s");
        }
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
