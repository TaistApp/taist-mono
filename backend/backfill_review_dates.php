<?php

/**
 * Backfill varied dates onto seeded/AI chef reviews.
 *
 * Seeding runs ("boost reviews") stamp every review with the run date, so a
 * chef's public profile shows one identical date on all reviews. This spreads
 * each chef's fake reviews (from_user_id = 0, or source ai_generated /
 * admin_created) across a recent window via ReviewDateSpreader. Authentic
 * customer reviews are never touched. Deterministic — safe to re-run.
 *
 * Reviewer display names need no backfill: Reviews::reviewer_name computes a
 * deterministic fallback name for these rows at serialization time.
 *
 * Run:   php backfill_review_dates.php            (dry run — prints changes)
 *        php backfill_review_dates.php --apply    (writes to the DB)
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\ReviewDateSpreader;
use Illuminate\Support\Facades\DB;

$apply = in_array('--apply', $argv, true);
$now = new DateTimeImmutable('now');
$spreader = new ReviewDateSpreader();

$fakeReviews = DB::table('tbl_reviews')
    ->where(function ($q) {
        $q->where('from_user_id', 0)
          ->orWhereIn('source', ['ai_generated', 'admin_created']);
    })
    ->orderBy('to_user_id')
    ->orderBy('id')
    ->get(['id', 'to_user_id', 'created_at', 'updated_at']);

if ($fakeReviews->isEmpty()) {
    echo "No seeded/AI reviews found — nothing to do.\n";
    exit(0);
}

$chefSignups = DB::table('tbl_users')
    ->whereIn('id', $fakeReviews->pluck('to_user_id')->unique())
    ->pluck('created_at', 'id');

$updated = 0;
foreach ($fakeReviews->groupBy('to_user_id') as $chefId => $reviews) {
    $earliest = null;
    $signup = $chefSignups[$chefId] ?? null;
    if ($signup && ($ts = strtotime($signup)) !== false) {
        $earliest = (new DateTimeImmutable('@' . $ts))->modify('+7 days');
    }

    $dates = $spreader->computeDates($reviews->pluck('id')->all(), $now, $earliest);

    $chefName = DB::table('tbl_users')->where('id', $chefId)->value('first_name') ?? "chef {$chefId}";
    echo "Chef {$chefName} (#{$chefId}): " . count($dates) . " fake reviews\n";

    foreach ($reviews as $review) {
        $newDate = $dates[$review->id] ?? null;
        if ($newDate === null || $review->updated_at === $newDate) {
            continue;
        }
        echo "  review #{$review->id}: {$review->updated_at} -> {$newDate}\n";
        if ($apply) {
            DB::table('tbl_reviews')->where('id', $review->id)->update([
                'created_at' => $newDate,
                'updated_at' => $newDate,
            ]);
        }
        $updated++;
    }
}

echo $apply
    ? "Done — updated {$updated} reviews.\n"
    : "Dry run — {$updated} reviews would change. Re-run with --apply to write.\n";
