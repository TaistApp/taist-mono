<?php

namespace Tests\Unit\Services;

use App\Services\ReviewDateSpreader;
use DateTimeImmutable;
use Tests\TestCase;

/**
 * Guards the seeded-review date backfill: dates must be varied (no more
 * single-day walls of reviews), deterministic across re-runs, in the past,
 * and ordered so higher review ids never show an earlier calendar date.
 */
class ReviewDateSpreaderTest extends TestCase
{
    private ReviewDateSpreader $spreader;
    private DateTimeImmutable $now;

    protected function setUp(): void
    {
        parent::setUp();
        $this->spreader = new ReviewDateSpreader();
        $this->now = new DateTimeImmutable('2026-08-13 12:00:00');
    }

    public function test_spreads_reviews_across_multiple_days()
    {
        $dates = $this->spreader->computeDates([101, 102, 103, 104, 105], $this->now);

        $days = array_unique(array_map(fn ($d) => substr($d, 0, 10), $dates));
        $this->assertGreaterThan(1, count($days), 'all reviews landed on the same day');
    }

    public function test_deterministic_across_runs()
    {
        $first = $this->spreader->computeDates([7, 8, 9], $this->now);
        $second = $this->spreader->computeDates([9, 7, 8], $this->now);

        $this->assertSame($first, $second);
    }

    public function test_all_dates_are_in_the_past()
    {
        $dates = $this->spreader->computeDates(range(1, 20), $this->now);

        foreach ($dates as $id => $date) {
            $this->assertLessThan(
                $this->now->getTimestamp(),
                strtotime($date),
                "review {$id} got a future date"
            );
        }
    }

    public function test_calendar_dates_do_not_decrease_with_id()
    {
        $dates = $this->spreader->computeDates(range(50, 61), $this->now);
        ksort($dates);

        $previousDay = null;
        foreach ($dates as $date) {
            $day = substr($date, 0, 10);
            if ($previousDay !== null) {
                $this->assertGreaterThanOrEqual($previousDay, $day);
            }
            $previousDay = $day;
        }
    }

    public function test_respects_earliest_floor()
    {
        $earliest = new DateTimeImmutable('2026-07-20 00:00:00');
        $dates = $this->spreader->computeDates([1, 2, 3, 4], $this->now, $earliest);

        foreach ($dates as $id => $date) {
            $this->assertGreaterThanOrEqual(
                $earliest->getTimestamp(),
                strtotime($date),
                "review {$id} predates the chef's signup floor"
            );
        }
    }

    public function test_empty_input_returns_empty_map_control()
    {
        $this->assertSame([], $this->spreader->computeDates([], $this->now));
    }
}
