<?php

namespace App\Http\Controllers;

use App\Listener;
use App\Models\Menus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Endpoints used by the social-media automation (taist-social on Vercel,
 * orchestrated by Make.com). Routes are mounted in routes/mapi.php under
 * the public group and authenticated via the existing `apiKey` header
 * convention used by getAvailableTimeslots — see _checktaistApiKey() in
 * MapiController.
 *
 * Provides:
 *   GET  /mapi/social/menu-items/random    pick a menu for a Menu Item post
 *   GET  /mapi/social/posted-ids           list IDs posted in the last N days
 *   POST /mapi/social/posted-receipt       record that an ID just posted
 *
 * Reviews live in taist-social/src/lib/reviews.ts (a small static pool
 * scraped from taist.app testimonials), but the no-repeat ledger lives
 * here so both kinds share one source of truth.
 */
class SocialController extends Controller
{
    private const API_KEY = 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';
    private const KINDS = ['menu-item', 'review'];

    private function checkApiKey(Request $request): bool
    {
        return $request->header('apiKey') === self::API_KEY;
    }

    private function recentlyPostedIds(string $kind, int $excludeDays): array
    {
        if ($excludeDays <= 0) {
            return [];
        }
        $cutoff = now()->subDays($excludeDays);
        return DB::table('social_posted_receipts')
            ->where('kind', $kind)
            ->where('posted_at', '>=', $cutoff)
            ->pluck('source_id')
            ->map(fn ($v) => (int) $v)
            ->all();
    }

    /**
     * GET /mapi/social/menu-items/random?excludeDays=30
     *
     * Picks a single eligible menu for a Menu Item social post:
     *   - tbl_menus.is_live = 1       (Available in admin)
     *   - tbl_users.user_type = 2     (chef, not customer)
     *   - tbl_users.verified = 1      (phone/email verified)
     *   - tbl_users.is_pending = 0    (Active in admin, not Pending)
     *   - menu id NOT in last `excludeDays` of social_posted_receipts (kind='menu-item')
     *
     * If the exclude filter empties the pool (rare with ~10 chefs but
     * possible if cadence is high), falls back to the full eligible set.
     */
    public function menuItemsRandom(Request $request)
    {
        if (!$this->checkApiKey($request)) {
            return response()->json(['success' => 0, 'error' => 'Access denied.'], 401);
        }

        $excludeDays = (int) $request->query('excludeDays', 30);
        $excludeIds = $this->recentlyPostedIds('menu-item', $excludeDays);

        $base = DB::table('tbl_menus as m')
            ->join('tbl_users as u', 'u.id', '=', 'm.user_id')
            ->where('m.is_live', 1)
            ->where('u.user_type', 2)
            ->where('u.verified', 1)
            ->where('u.is_pending', 0)
            ->select(
                'm.id as menu_id',
                'm.title as menu_title',
                'm.description as menu_description',
                'm.user_id as chef_id',
                'u.first_name as chef_first_name',
                'u.last_name as chef_last_name'
            );

        $eligible = (clone $base)->whereNotIn('m.id', $excludeIds);
        $row = $eligible->inRandomOrder()->first();

        // Fallback: pool was emptied by exclude window — pick from full eligible set
        if (!$row) {
            $row = $base->inRandomOrder()->first();
        }

        if (!$row) {
            return response()->json([
                'success' => 0,
                'error' => 'No eligible menu items found (need is_live=1 menu under verified chef).'
            ], 404);
        }

        return response()->json([
            'success' => 1,
            'menuId' => (int) $row->menu_id,
            'chefId' => (int) $row->chef_id,
            'chefName' => trim($row->chef_first_name),
            'headline' => $row->menu_title,
            'subtext' => $row->menu_description,
        ]);
    }

    /**
     * GET /mapi/social/posted-ids?kind=review&excludeDays=60
     *
     * Returns the IDs Make.com should pass to the taist-social
     * /api/social/reviews/random endpoint as `excludeIds`.
     */
    public function postedIds(Request $request)
    {
        if (!$this->checkApiKey($request)) {
            return response()->json(['success' => 0, 'error' => 'Access denied.'], 401);
        }

        $kind = (string) $request->query('kind', '');
        if (!in_array($kind, self::KINDS, true)) {
            return response()->json([
                'success' => 0,
                'error' => 'kind must be one of: ' . implode(', ', self::KINDS),
            ], 422);
        }

        $excludeDays = (int) $request->query('excludeDays', 60);
        return response()->json([
            'success' => 1,
            'kind' => $kind,
            'excludeDays' => $excludeDays,
            'ids' => $this->recentlyPostedIds($kind, $excludeDays),
        ]);
    }

    /**
     * POST /mapi/social/posted-receipt
     * Body: { "kind": "menu-item" | "review", "id": 123 }
     *
     * Records that an item just posted. Idempotent on (kind, id, day) —
     * calling it twice the same day appends two rows but the no-repeat
     * window still works. Idempotency could be tightened later if it
     * matters; for now the table is small.
     */
    public function postedReceipt(Request $request)
    {
        if (!$this->checkApiKey($request)) {
            return response()->json(['success' => 0, 'error' => 'Access denied.'], 401);
        }

        $kind = (string) $request->input('kind', '');
        $id = (int) $request->input('id', 0);
        if (!in_array($kind, self::KINDS, true) || $id <= 0) {
            return response()->json([
                'success' => 0,
                'error' => 'kind (one of: ' . implode(', ', self::KINDS) . ') and positive id are required',
            ], 422);
        }

        $insertedId = DB::table('social_posted_receipts')->insertGetId([
            'kind' => $kind,
            'source_id' => $id,
            'posted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => 1, 'receiptId' => $insertedId]);
    }
}
