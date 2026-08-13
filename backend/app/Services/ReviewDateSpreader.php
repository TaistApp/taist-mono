<?php

namespace App\Services;

use DateTimeImmutable;

/**
 * Computes plausible, varied dates for seeded/AI chef reviews.
 *
 * Seeding runs stamp every review with the same created_at, so a chef's whole
 * review list shows one date in the app. This spreads each chef's fake reviews
 * across a recent window, deterministically by review id (re-running never
 * shuffles dates), keeping id order = chronological order so the list still
 * reads newest-last by id.
 */
class ReviewDateSpreader
{
    /** Newest fake review lands at least this many days before "now". */
    private const MIN_DAYS_AGO = 3;

    /** Days of history per review, bounded to a sane window. */
    private const DAYS_PER_REVIEW = 11;
    private const MIN_WINDOW_DAYS = 30;
    private const MAX_WINDOW_DAYS = 160;

    /**
     * @param int[] $reviewIds ids of one chef's fake reviews, any order
     * @param DateTimeImmutable $now reference "today"
     * @param DateTimeImmutable|null $earliest optional floor (e.g. chef signup date)
     * @return array<int, string> review id => 'Y-m-d H:i:s'
     */
    public function computeDates(array $reviewIds, DateTimeImmutable $now, ?DateTimeImmutable $earliest = null): array
    {
        $ids = array_values(array_unique(array_map('intval', $reviewIds)));
        sort($ids);
        $count = count($ids);
        if ($count === 0) {
            return [];
        }

        $windowDays = max(self::MIN_WINDOW_DAYS, min(self::MAX_WINDOW_DAYS, $count * self::DAYS_PER_REVIEW));
        $end = $now->modify('-' . self::MIN_DAYS_AGO . ' days');
        $start = $end->modify("-{$windowDays} days");
        if ($earliest !== null && $earliest > $start) {
            // Never start after the end of the window (brand-new chef): fall
            // back to a one-day window just before the end.
            $start = min($earliest, $end->modify('-1 day'));
        }
        $spanSeconds = max($end->getTimestamp() - $start->getTimestamp(), 86400);

        $dates = [];
        foreach ($ids as $i => $id) {
            // Even slot per review plus a per-id jitter inside the slot, so
            // gaps look organic but ordering by id is preserved.
            $slot = ($i + 0.15 + 0.7 * $this->hashFraction($id)) / $count;
            $timestamp = $start->getTimestamp() + (int) round($slot * $spanSeconds);

            $date = (new DateTimeImmutable('@' . $timestamp))
                // Reviews come in after dinner: pin the clock to 17:00–21:59.
                ->setTime(17 + ($id * 13) % 5, ($id * 37) % 60, ($id * 7) % 60);

            $dates[$id] = $date->format('Y-m-d H:i:s');
        }

        return $dates;
    }

    /** Deterministic value in [0, 1) derived from the review id. */
    private function hashFraction(int $id): float
    {
        return (crc32('review-date-' . $id) % 1000) / 1000;
    }
}
