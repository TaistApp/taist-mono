<?php

namespace App\Http\Controllers;

use App\Listener;
use App\Models\Menus;
use App\Models\SocialContentQueue;
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
    private const KINDS = ['menu-item', 'review', 'dish-photo'];

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
            // First name + last initial (e.g. "Martin L.") — house style for
            // chef attribution on social posts. Falls back to first name only
            // if the chef has no last name on file.
            'chefName' => $this->formatChefName($row->chef_first_name, $row->chef_last_name),
            'headline' => $row->menu_title,
            'subtext' => $row->menu_description,
        ]);
    }

    /**
     * Format a chef's name as "First L." (first name + last initial) for
     * social attribution. Returns just the first name if no last name.
     */
    private function formatChefName(?string $firstName, ?string $lastName): string
    {
        $first = trim((string) $firstName);
        $last = trim((string) $lastName);
        if ($last === '') {
            return $first;
        }
        return trim($first . ' ' . strtoupper(substr($last, 0, 1)) . '.');
    }

    /**
     * GET /mapi/social/menu-lookup?id=123
     *
     * Resolves a menu id back to its chef + status. Used to answer
     * "who posted that?" without needing direct DB access.
     */
    public function menuLookup(Request $request)
    {
        if (!$this->checkApiKey($request)) {
            return response()->json(['success' => 0, 'error' => 'Access denied.'], 401);
        }

        $id = (int) $request->query('id', 0);
        if ($id <= 0) {
            return response()->json(['success' => 0, 'error' => 'positive id is required'], 422);
        }

        $row = DB::table('tbl_menus as m')
            ->leftJoin('tbl_users as u', 'u.id', '=', 'm.user_id')
            ->where('m.id', $id)
            ->select(
                'm.id as menu_id',
                'm.title as menu_title',
                'm.is_live',
                'm.user_id as chef_id',
                'u.first_name',
                'u.last_name',
                'u.user_type',
                'u.verified',
                'u.is_pending'
            )
            ->first();

        if (!$row) {
            return response()->json(['success' => 0, 'error' => 'Menu not found'], 404);
        }

        return response()->json([
            'success' => 1,
            'menuId' => (int) $row->menu_id,
            'menuTitle' => $row->menu_title,
            'isLive' => (int) $row->is_live,
            'chefId' => (int) $row->chef_id,
            'chefName' => trim(($row->first_name ?? '') . ' ' . ($row->last_name ?? '')),
            'chefStatus' => [
                'userType' => (int) ($row->user_type ?? 0),
                'verified' => (int) ($row->verified ?? 0),
                'isPending' => (int) ($row->is_pending ?? 0),
            ],
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

    /**
     * GET /mapi/social/dish-photos/random?excludeDays=14
     *
     * Picks a random approved, social-queued dish photo:
     *   - status = 'approved'
     *   - queued_for_social = 1
     *   - not posted in last `excludeDays`
     *
     * Returns the photo URL, caption, chef name, and menu title for
     * Make.com / taist-social to compose a post.
     */
    public function dishPhotosRandom(Request $request)
    {
        if (!$this->checkApiKey($request)) {
            return response()->json(['success' => 0, 'error' => 'Access denied.'], 401);
        }

        $excludeDays = (int) $request->query('excludeDays', 14);
        $excludeIds = $this->recentlyPostedIds('dish-photo', $excludeDays);

        $base = DB::table('tbl_dish_photos as dp')
            ->join('tbl_menus as m', 'm.id', '=', 'dp.menu_id')
            ->join('tbl_users as u', 'u.id', '=', 'dp.chef_user_id')
            ->where('dp.status', 'approved')
            ->where('dp.queued_for_social', 1)
            ->select(
                'dp.id as photo_id',
                'dp.filename',
                'dp.social_caption',
                'dp.menu_id',
                'dp.chef_user_id as chef_id',
                'm.title as menu_title',
                'm.description as menu_description',
                'u.first_name as chef_first_name',
                'u.last_name as chef_last_name'
            );

        $eligible = (clone $base)->whereNotIn('dp.id', $excludeIds);
        $row = $eligible->inRandomOrder()->first();

        if (!$row) {
            $row = $base->inRandomOrder()->first();
        }

        if (!$row) {
            return response()->json([
                'success' => 0,
                'error' => 'No eligible dish photos (need approved + queued_for_social).',
            ], 404);
        }

        return response()->json([
            'success' => 1,
            'photoId' => (int) $row->photo_id,
            'imageUrl' => url('assets/uploads/images/' . $row->filename),
            'caption' => $row->social_caption,
            'menuId' => (int) $row->menu_id,
            'menuTitle' => $row->menu_title,
            'menuDescription' => $row->menu_description,
            'chefId' => (int) $row->chef_id,
            'chefName' => trim($row->chef_first_name),
        ]);
    }

    /**
     * POST /mapi/social/content-queue/generate
     *
     * Bulk-inserts content items into the social_content_queue table.
     * Used by the Claude Routine to push generated content for admin review.
     *
     * Body: { "items": [{ pillar, caption, hashtags?, scheduled_date?, image_url?,
     *          source_photo_id?, source_menu_id?, review_quote?, review_attribution?,
     *          notes?, post_id?, day_of_week?, time?, platform?, target_audience? }] }
     */
    public function contentQueueGenerate(Request $request)
    {
        if (!$this->checkApiKey($request)) {
            return response()->json(['success' => 0, 'error' => 'Access denied.'], 401);
        }

        $items = $request->input('items', []);
        if (empty($items) || !is_array($items)) {
            return response()->json([
                'success' => 0,
                'error' => 'items array is required and must not be empty.',
            ], 422);
        }

        $allowed = [
            'post_id', 'scheduled_date', 'day_of_week', 'time', 'platform',
            'pillar', 'caption', 'hashtags', 'image_url', 'target_audience',
            'notes', 'review_quote', 'review_attribution',
            'source_photo_id', 'source_menu_id',
        ];

        $inserted = [];
        $errors = [];

        foreach ($items as $i => $itemData) {
            // Validate required fields
            if (empty($itemData['pillar']) || empty($itemData['caption'])) {
                $errors[] = "Item {$i}: pillar and caption are required.";
                continue;
            }

            $row = [];
            foreach ($allowed as $field) {
                if (isset($itemData[$field])) {
                    $row[$field] = $itemData[$field];
                }
            }
            $row['queue_status'] = 'draft';
            $row['generated_by'] = 'routine';

            $record = SocialContentQueue::create($row);
            $inserted[] = $record->id;
        }

        return response()->json([
            'success' => 1,
            'inserted' => count($inserted),
            'ids' => $inserted,
            'errors' => $errors,
        ]);
    }
}
