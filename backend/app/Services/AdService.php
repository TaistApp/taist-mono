<?php

namespace App\Services;

use App\Models\Ad;
use App\Models\AdBacklogItem;
use App\Models\AdBatch;
use App\Models\AdSettings;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Paid Instagram/Facebook ads for customers, run from `php artisan ads:run`
 * on the same pattern as the newsletters.
 *
 * Lifecycle of a batch:
 *   draft -> scheduled -> (48h before: ads created in Meta, paused, and the
 *   preview emailed) -> live (ads switched on) -> ended (ads paused)
 *
 * Everything runs through the Meta Marketing API; nobody works in Ads
 * Manager. Creating the ads paused at preview time surfaces Meta's review
 * inside the 48-hour window, and edits made after that are re-uploaded
 * before go-live. If a batch can't go live cleanly, nothing is switched on:
 * it goes back to a draft and Dayne is emailed. After a batch goes live the
 * planner schedules the next one (cadence_days later) from the idea backlog,
 * or recycles top organic posts when the backlog is empty. The first batch
 * is always scheduled by hand.
 */
class AdService
{
    const DEFAULT_LINK_URL = 'https://taist.app';

    // A chef dish photo is not reused in another ad within this many days.
    const DISH_PHOTO_REUSE_DAYS = 60;

    // Recycling: organic posts from this many days back are eligible.
    const RECYCLE_WINDOW_DAYS = 30;

    // An image post this close to a Menu Item receipt counts as a Menu Item post.
    const MENU_ITEM_MATCH_HOURS = 6;

    const COMPETITORS = ['doordash', 'door dash', 'uber eats', 'ubereats', 'grubhub', 'instacart', 'postmates', 'hellofresh', 'hello fresh'];

    private $newsletters;
    private $meta;

    public function __construct(NewsletterService $newsletters, MetaAdsClient $meta)
    {
        // Email delivery and discount-code checks are shared with newsletters.
        $this->newsletters = $newsletters;
        $this->meta = $meta;
    }

    public function meta(): MetaAdsClient
    {
        return $this->meta;
    }

    // ------------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------------

    public function automationEnabled(): bool
    {
        return (bool) config('app.ads_automation');
    }

    public function previewEmail(): string
    {
        return config('app.ads_preview_email') ?: 'dayne@taist.app';
    }

    public function adminEditUrl(AdBatch $batch): string
    {
        return $this->newsletters->publicBaseUrl() . '/admin-new/ads/' . $batch->id;
    }

    public function pauseToken(AdBatch $batch): string
    {
        $key = (string) config('app.key');
        if ($key === '') {
            throw new \RuntimeException('APP_KEY must be set to sign ad links.');
        }
        return hash_hmac('sha256', 'ads-pause|' . $batch->id, $key);
    }

    public function verifyPauseToken(AdBatch $batch, $token): bool
    {
        return is_string($token) && $token !== '' && hash_equals($this->pauseToken($batch), $token);
    }

    public function pauseUrl(AdBatch $batch): string
    {
        return $this->newsletters->publicBaseUrl() . '/ads/pause/' . $batch->id . '?t=' . $this->pauseToken($batch);
    }

    // ------------------------------------------------------------------
    // Content checks
    // ------------------------------------------------------------------

    /**
     * Problems worth fixing before a batch goes live, as "Ad N: ..." lines.
     * Shown in the admin editor and in the preview email.
     *
     * @param  Collection|null  $ads  unsaved ads to check instead of the stored ones
     */
    public function warnings(AdBatch $batch, ?Collection $ads = null): array
    {
        $ads = $ads ?? $batch->ads;
        if ($ads->isEmpty()) {
            return ['This batch has no ads.'];
        }

        $warnings = [];
        foreach ($ads->values() as $i => $ad) {
            foreach ($this->adWarnings($ad) as $warning) {
                $warnings[] = 'Ad ' . ($i + 1) . ': ' . $warning;
            }
        }
        return $warnings;
    }

    /**
     * Checks one ad against Meta's recommended lengths and the Taist content
     * rules shared with the organic posts (taist-social CLAUDE.md).
     */
    public function adWarnings(Ad $ad): array
    {
        // A recycled post runs exactly as it was published organically.
        if ($ad->source_ig_media_id) {
            return [];
        }

        $warnings = [];
        $primary = trim((string) $ad->primary_text);
        $headline = trim((string) $ad->headline);
        $description = trim((string) $ad->description);

        if ($primary === '') {
            $warnings[] = 'Primary text is empty.';
        } elseif (mb_strlen($primary) > Ad::PRIMARY_TEXT_LIMIT) {
            $warnings[] = 'Primary text is ' . mb_strlen($primary) . ' characters. Meta shows about '
                . Ad::PRIMARY_TEXT_LIMIT . ' before "... more".';
        }
        if ($headline === '') {
            $warnings[] = 'Headline is empty.';
        } elseif (mb_strlen($headline) > Ad::HEADLINE_LIMIT) {
            $warnings[] = 'Headline is ' . mb_strlen($headline) . ' characters. Keep it under ' . Ad::HEADLINE_LIMIT . ' so it is not cut off.';
        }
        if (mb_strlen($description) > Ad::DESCRIPTION_LIMIT) {
            $warnings[] = 'Description is ' . mb_strlen($description) . ' characters. Keep it under ' . Ad::DESCRIPTION_LIMIT . '.';
        }

        $image = trim((string) $ad->image_url);
        if ($image === '') {
            $warnings[] = 'No image. Add one, or leave it and pick a dish photo in the editor.';
        } elseif (stripos($image, 'https://') !== 0) {
            $warnings[] = 'The image link must start with https:// for Meta to fetch it.';
        }

        $text = implode("\n", [$primary, $headline, $description]);

        if (preg_match('/[\x{2014}\x{2013}]/u', $text)) {
            $warnings[] = 'Contains a dash (— or –). Taist copy uses no em dashes.';
        }
        $withoutAllowedFree = preg_replace('/free to download|download (taist )?(for )?free/i', '', $text);
        if (preg_match('/\bfree\b/i', $withoutAllowedFree)) {
            $warnings[] = 'Says "free". Taist is not free; only "free to download" is allowed.';
        }
        if (preg_match('/zionsville|z-ville/i', $text)) {
            $warnings[] = 'Mentions Zionsville, which Taist does not advertise in.';
        }
        if (preg_match('/\b(no|zero|without)\s+parking\b|parking[- ]free/i', $text)) {
            $warnings[] = 'Claims no parking. Chefs drive to the home, so drop the parking angle.';
        }
        if (preg_match('/\blowkey\b/i', $text)) {
            $warnings[] = 'Uses "lowkey". Use "pretty" or "actually" instead.';
        }
        if (preg_match('/\bstupid(ly)?\b/i', $text)) {
            $warnings[] = 'Uses "stupid". Use "ridiculously simple" or "simple" instead.';
        }
        foreach (self::COMPETITORS as $name) {
            if (stripos($text, $name) !== false) {
                $warnings[] = 'Names a competitor ("' . $name . '"). Use a generic word like "delivery".';
                break;
            }
        }

        preg_match_all('/\bcode\s+([A-Z0-9][A-Z0-9_-]{2,})\b/i', $text, $matches);
        $codes = collect($matches[1] ?? [])->map(function ($c) {
            return strtoupper($c);
        })->filter(function ($c) {
            return preg_match('/[0-9]/', $c) || strlen($c) >= 5;
        })->unique();
        foreach ($codes as $code) {
            $problem = $this->newsletters->discountCodeProblem($code);
            if ($problem !== null) {
                $warnings[] = $problem;
            }
        }

        return $warnings;
    }

    // ------------------------------------------------------------------
    // Images
    // ------------------------------------------------------------------

    /**
     * A random admin-approved dish photo that was queued for social and has
     * not been in an ad recently. Ads keep their own record (tbl_ads), so
     * this never uses up the organic posts' no-repeat window.
     *
     * @return array|null ['id' => int, 'url' => string]
     */
    public function pickDishPhoto(array $excludeIds = []): ?array
    {
        try {
            $recent = Ad::whereNotNull('dish_photo_id')
                ->where('created_at', '>=', Carbon::now()->subDays(self::DISH_PHOTO_REUSE_DAYS))
                ->pluck('dish_photo_id')
                ->all();

            $row = DB::table('tbl_dish_photos')
                ->where('status', 'approved')
                ->where('queued_for_social', 1)
                ->whereNotIn('id', array_merge($recent, $excludeIds))
                ->inRandomOrder()
                ->first(['id', 'filename']);
        } catch (\Throwable $e) {
            return null; // table unavailable (e.g. tests)
        }

        if (!$row) {
            return null;
        }

        return [
            'id' => (int) $row->id,
            'url' => $this->newsletters->publicBaseUrl() . '/assets/uploads/images/' . $row->filename,
        ];
    }

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    /**
     * Email showing each ad as it would appear in the Instagram feed, with a
     * banner on top (schedule, warnings, edit/pause links).
     *
     * @return array ['subject' => string, 'html' => string, 'text' => string]
     */
    public function renderEmail(AdBatch $batch, string $subject, array $banner): array
    {
        $ads = $batch->ads->map(function (Ad $ad) {
            return [
                'angle' => $ad->angle,
                'primaryText' => (string) $ad->primary_text,
                'headline' => (string) $ad->headline,
                'description' => (string) $ad->description,
                'ctaLabel' => $ad->ctaLabel(),
                'imageUrl' => $ad->image_url,
                'linkUrl' => $ad->link_url ?: self::DEFAULT_LINK_URL,
                'linkDomain' => strtoupper((string) parse_url($ad->link_url ?: self::DEFAULT_LINK_URL, PHP_URL_HOST)),
            ];
        })->values()->all();

        $html = view('emails.ad-preview', [
            'subject' => $subject,
            'banner' => $banner,
            'ads' => $ads,
        ])->render();

        $lines = ['*** ' . $banner['title'] . ' ***'];
        foreach ($banner['lines'] ?? [] as $line) {
            $lines[] = $line;
        }
        foreach ($banner['links'] ?? [] as [$label, $url]) {
            $lines[] = "{$label}: {$url}";
        }
        foreach ($ads as $i => $ad) {
            $lines[] = '';
            $lines[] = 'Ad ' . ($i + 1) . ($ad['angle'] ? ' (' . $ad['angle'] . ')' : '');
            $lines[] = 'Primary text: ' . $ad['primaryText'];
            $lines[] = 'Headline: ' . $ad['headline'];
            $lines[] = 'Description: ' . $ad['description'];
            $lines[] = 'Button: ' . $ad['ctaLabel'] . ' -> ' . $ad['linkUrl'];
            $lines[] = 'Image: ' . ($ad['imageUrl'] ?: '(none)');
        }

        return ['subject' => $subject, 'html' => $html, 'text' => implode("\n", $lines)];
    }

    /**
     * Email the batch preview to Dayne (or a test copy to any address).
     */
    public function sendPreview(AdBatch $batch, ?string $to = null, bool $isTest = false, array $metaProblems = []): array
    {
        $to = $to ?: $this->previewEmail();
        $settings = AdSettings::current();
        $goLive = $batch->effectiveGoLiveAt();

        $lines = [
            $batch->displayName() . ' (' . $batch->ads->count() . ' ad' . ($batch->ads->count() === 1 ? '' : 's')
                . ') goes live ' . ($goLive ? $this->eastern($goLive, 'l, M j \a\t g:i A') . ' ET' : '(not scheduled yet)')
                . ' and runs ' . $settings['run_days'] . ' days.',
            'Shown as they would appear in the Instagram feed. Facebook uses the same copy.',
        ];
        if (!$isTest && $batch->status === AdBatch::STATUS_SCHEDULED) {
            $lines[] = 'No action needed if they look good. They switch on automatically at go-live.';
        }
        foreach ($metaProblems as $problem) {
            $lines[] = 'Meta: ' . $problem . ' The batch will not go live until this is fixed.';
        }
        foreach ($this->warnings($batch) as $warning) {
            $lines[] = 'Warning: ' . $warning;
        }

        $links = [['Edit in admin', $this->adminEditUrl($batch)]];
        if ($batch->status === AdBatch::STATUS_SCHEDULED) {
            $links[] = ['Pause this batch', $this->pauseUrl($batch)];
        }

        $prefix = $isTest ? '[Test] ' : '[Ads preview, live ' . ($goLive ? $this->eastern($goLive, 'D M j') : 'unscheduled') . '] ';
        $rendered = $this->renderEmail($batch, $prefix . $batch->displayName(), [
            'title' => $isTest ? 'Test send' : 'Ads preview: goes live in ' . AdSettings::noticeLabel(),
            'lines' => $lines,
            'links' => $links,
        ]);

        return $this->newsletters->deliver([[
            'to' => $to,
            'subject' => $rendered['subject'],
            'html' => $rendered['html'],
            'text' => $rendered['text'],
        ]])[0];
    }

    // ------------------------------------------------------------------
    // Automation (ads:run)
    // ------------------------------------------------------------------

    public function earliestGoLiveAt(?Carbon $now = null): Carbon
    {
        return ($now ?: Carbon::now())->copy()->addMinutes(AdSettings::noticeMinutes());
    }

    /**
     * Next go-live slot at the configured time (Eastern) on or after
     * $target, and never inside the notice window.
     */
    public function nextSlot(Carbon $target, Carbon $now): Carbon
    {
        [$h, $m] = array_map('intval', explode(':', AdSettings::current()['go_live_time']));

        $earliest = $this->earliestGoLiveAt($now)->addMinutes(15);
        $base = $target->greaterThan($earliest) ? $target : $earliest;

        $slot = $base->copy()->setTimezone(AdSettings::TIMEZONE)->setTime($h, $m);
        if ($slot->lessThan($base)) {
            $slot->addDay();
        }

        return $slot->setTimezone('UTC');
    }

    /**
     * Draft (and schedule, when there is content) the next batch once the
     * latest one has gone live and nothing newer is in the pipeline. Content
     * comes from the idea backlog; when that is empty, the best-performing
     * recent organic Instagram posts are recycled as ads.
     */
    public function planNextBatch(Carbon $now, bool $dryRun = false): ?AdBatch
    {
        $settings = AdSettings::current();
        if (!$settings['auto_schedule']) {
            return null;
        }

        $open = AdBatch::whereIn('status', [AdBatch::STATUS_DRAFT, AdBatch::STATUS_SCHEDULED])->exists();
        if ($open) {
            return null;
        }

        // The chain only starts once an admin-scheduled batch has gone live.
        $last = AdBatch::whereIn('status', [AdBatch::STATUS_LIVE, AdBatch::STATUS_ENDED])
            ->whereNotNull('launched_at')
            ->orderByDesc('launched_at')
            ->first();
        if (!$last) {
            return null;
        }

        $perBatch = min($settings['ads_per_batch'], AdBatch::MAX_ADS);
        $goLiveAt = $this->nextSlot($last->launched_at->copy()->addDays($settings['cadence_days']), $now);
        $backlog = AdBacklogItem::available()->orderBy('sort')->orderBy('id')->limit($perBatch)->get();
        $recycled = $backlog->isEmpty() ? $this->pickRecycledPosts($now, $perBatch) : [];
        $hasContent = $backlog->isNotEmpty() || $recycled;
        $number = ((int) AdBatch::max('batch_number')) + 1;
        $status = $hasContent ? AdBatch::STATUS_SCHEDULED : AdBatch::STATUS_DRAFT;

        if ($dryRun) {
            return new AdBatch(['batch_number' => $number, 'status' => $status, 'go_live_at' => $goLiveAt]);
        }

        $batch = AdBatch::create([
            'batch_number' => $number,
            'status' => $status,
            'go_live_at' => $goLiveAt,
            'created_by' => 'auto',
            'notes' => !$hasContent
                ? 'Auto-drafted with no ideas and no organic posts to recycle, so it is NOT scheduled. Add ads and schedule it.'
                : ($recycled ? 'Auto-drafted from the top organic Instagram posts of the last '
                    . self::RECYCLE_WINDOW_DAYS . ' days (the idea backlog was empty).' : 'Auto-drafted from the backlog.'),
        ]);

        $ads = $backlog->isNotEmpty() ? $this->adsFromBacklog($backlog) : collect($recycled)->map(function ($post) {
            return $this->adFromInstagramPost($post);
        });
        foreach ($ads->values() as $i => $ad) {
            $ad->batch_id = $batch->id;
            $ad->sort = $i;
            $ad->save();
        }

        if (!$hasContent) {
            $this->notify(
                "Ads need content: {$batch->displayName()}",
                '<p>' . e($batch->displayName()) . ' was auto-drafted, but the idea backlog is empty and there are no '
                . 'recent organic posts left to recycle, so it is <strong>not scheduled</strong>.</p><p>Add ads and schedule it here: '
                . '<a href="' . e($this->adminEditUrl($batch)) . '">' . e($this->adminEditUrl($batch)) . '</a></p>'
            );
        }

        return $batch;
    }

    /**
     * Unsaved ads for backlog ideas, each image-less idea getting a
     * different dish photo.
     */
    public function adsFromBacklog(Collection $items): Collection
    {
        $usedPhotos = [];
        return $items->values()->map(function (AdBacklogItem $item) use (&$usedPhotos) {
            $ad = $this->adFromBacklog($item, $usedPhotos);
            if ($ad->dish_photo_id) {
                $usedPhotos[] = $ad->dish_photo_id;
            }
            return $ad;
        });
    }

    /**
     * An unsaved ad built from a backlog idea. Ideas without an image get an
     * approved chef dish photo (real photos chefs take after an order).
     */
    public function adFromBacklog(AdBacklogItem $item, array $excludePhotoIds = []): Ad
    {
        $ad = new Ad([
            'backlog_id' => $item->id,
            'angle' => $item->angle,
            'primary_text' => $item->primary_text,
            'headline' => $item->headline,
            'description' => $item->description,
            'cta' => $item->cta && isset(Ad::CTAS[$item->cta]) ? $item->cta : 'LEARN_MORE',
            'link_url' => $item->link_url ?: self::DEFAULT_LINK_URL,
            'image_url' => $item->image_url,
        ]);

        if (!$ad->image_url && ($photo = $this->pickDishPhoto($excludePhotoIds))) {
            $ad->image_url = $photo['url'];
            $ad->dish_photo_id = $photo['id'];
        }

        return $ad;
    }

    // ------------------------------------------------------------------
    // Recycling organic posts
    // ------------------------------------------------------------------

    /**
     * The best organic Instagram posts of the last RECYCLE_WINDOW_DAYS that
     * have never been an ad: most likes + comments first, newest first on a
     * tie. Menu Item posts are skipped because their photo may be
     * AI-generated.
     *
     * @return array[] Instagram media rows
     */
    public function pickRecycledPosts(Carbon $now, int $limit): array
    {
        if (!$this->meta->configured()) {
            return [];
        }

        try {
            $media = $this->meta->recentInstagramMedia($now->copy()->subDays(self::RECYCLE_WINDOW_DAYS));
        } catch (\Throwable $e) {
            Log::warning('Could not list Instagram posts to recycle: ' . $e->getMessage());
            return [];
        }

        $used = Ad::whereNotNull('source_ig_media_id')->pluck('source_ig_media_id')->all();
        $menuItemTimes = $this->menuItemPostTimes($now);

        return collect($media)
            ->reject(function ($post) use ($used) {
                return in_array((string) $post['id'], $used, true);
            })
            ->reject(function ($post) use ($menuItemTimes) {
                return $this->looksLikeMenuItemPost($post, $menuItemTimes);
            })
            ->sort(function ($a, $b) {
                $engagement = ($b['like_count'] ?? 0) + ($b['comments_count'] ?? 0)
                    - (($a['like_count'] ?? 0) + ($a['comments_count'] ?? 0));
                return $engagement !== 0 ? $engagement : strcmp($b['timestamp'] ?? '', $a['timestamp'] ?? '');
            })
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * When the organic publisher posted Menu Item posts. The taist-social
     * Content Publisher records a "menu-item" receipt each time it posts
     * one; returns null when that ledger can't be read, so callers can fail
     * safe.
     *
     * @return Carbon[]|null
     */
    private function menuItemPostTimes(Carbon $now): ?array
    {
        try {
            return DB::table('social_posted_receipts')
                ->where('kind', 'menu-item')
                ->where('posted_at', '>=', $now->copy()->subDays(self::RECYCLE_WINDOW_DAYS + 1))
                ->pluck('posted_at')
                ->map(function ($t) {
                    return Carbon::parse($t);
                })
                ->all();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * An image post published within MENU_ITEM_MATCH_HOURS of a Menu Item
     * receipt is treated as a Menu Item post. Without the receipt ledger,
     * every image post is treated as one and only videos (Reels) recycle.
     */
    private function looksLikeMenuItemPost(array $post, ?array $menuItemTimes): bool
    {
        $isVideo = in_array($post['media_type'] ?? '', ['VIDEO', 'REELS'], true)
            || ($post['media_product_type'] ?? '') === 'REELS';
        if ($isVideo) {
            return false;
        }
        if ($menuItemTimes === null) {
            return true;
        }

        $postedAt = Carbon::parse($post['timestamp'] ?? 'now');
        foreach ($menuItemTimes as $time) {
            if (abs($postedAt->diffInMinutes($time, false)) <= self::MENU_ITEM_MATCH_HOURS * 60) {
                return true;
            }
        }
        return false;
    }

    /**
     * An unsaved ad that promotes an existing Instagram post as-is (its
     * likes and comments carry over). Caption and image are copied only for
     * the preview.
     */
    public function adFromInstagramPost(array $post): Ad
    {
        $engagement = ($post['like_count'] ?? 0) + ($post['comments_count'] ?? 0);

        return new Ad([
            'angle' => 'Recycled post, ' . Carbon::parse($post['timestamp'] ?? 'now')->setTimezone(AdSettings::TIMEZONE)->format('M j')
                . ' (' . $engagement . ' likes + comments)',
            'primary_text' => (string) ($post['caption'] ?? ''),
            'cta' => 'LEARN_MORE',
            'link_url' => self::DEFAULT_LINK_URL,
            'image_url' => $post['thumbnail_url'] ?? $post['media_url'] ?? null,
            'source_ig_media_id' => (string) $post['id'],
            'source_permalink' => $post['permalink'] ?? null,
        ]);
    }

    // ------------------------------------------------------------------
    // Meta sync
    // ------------------------------------------------------------------

    /**
     * Make sure every ad in the batch exists in Meta (paused) with its
     * current content. New ads are created; ads edited since upload are
     * replaced (the old Meta ad is archived). Never switches anything on.
     *
     * @return array error lines ("Ad 2: Meta: ..."), empty when all synced
     */
    public function syncToMeta(AdBatch $batch): array
    {
        if (!$this->meta->configured()) {
            return ['Meta is not connected (missing ' . implode(', ', $this->meta->missingConfig()) . ').'];
        }

        $errors = [];
        foreach ($batch->ads->values() as $i => $ad) {
            $hash = $ad->contentHash();
            if ($ad->meta_ad_id && $ad->meta_content_hash === $hash) {
                continue;
            }
            try {
                if ($ad->meta_ad_id) {
                    $this->meta->setStatus($ad->meta_ad_id, 'ARCHIVED');
                }
                $ids = $this->meta->createPausedAd($ad, 'Taist ' . $batch->displayName() . ' - ' . mb_substr($ad->angle ?: 'Ad ' . ($i + 1), 0, 80));
                $ad->update([
                    'meta_ad_id' => $ids['ad_id'],
                    'meta_creative_id' => $ids['creative_id'],
                    'meta_content_hash' => $hash,
                    'meta_status' => 'PAUSED',
                    'meta_note' => null,
                ]);
            } catch (\Throwable $e) {
                $ad->update(['meta_note' => mb_substr($e->getMessage(), 0, 500)]);
                $errors[] = 'Ad ' . ($i + 1) . ': ' . $e->getMessage();
            }
        }

        return $errors;
    }

    /**
     * Refresh each uploaded ad's Meta review state. Returns problem lines for
     * ads Meta rejected.
     */
    public function refreshReviewState(AdBatch $batch): array
    {
        if (!$this->meta->configured()) {
            return [];
        }

        $problems = [];
        foreach ($batch->ads->values() as $i => $ad) {
            if (!$ad->meta_ad_id) {
                continue;
            }
            try {
                $state = $this->meta->reviewState($ad->meta_ad_id);
            } catch (\Throwable $e) {
                continue; // a failed read is not a rejection
            }
            $ad->update([
                'meta_status' => $state['effective_status'],
                'meta_note' => $state['feedback'] ? mb_substr($state['feedback'], 0, 500) : $ad->meta_note,
            ]);
            if ($state['effective_status'] === 'DISAPPROVED') {
                $problems[] = 'Ad ' . ($i + 1) . ': Meta rejected it' . ($state['feedback'] ? ' (' . $state['feedback'] . ')' : '') . '.';
            }
        }

        return $problems;
    }

    /**
     * Take a batch's ads out of Meta (paused or deleted batch). Best effort.
     */
    public function withdrawFromMeta(AdBatch $batch): void
    {
        if (!$this->meta->configured()) {
            return;
        }
        foreach ($batch->ads as $ad) {
            if (!$ad->meta_ad_id) {
                continue;
            }
            try {
                $this->meta->setStatus($ad->meta_ad_id, 'ARCHIVED');
                $ad->update(['meta_ad_id' => null, 'meta_creative_id' => null, 'meta_content_hash' => null, 'meta_status' => 'ARCHIVED']);
            } catch (\Throwable $e) {
                Log::warning("Archiving Meta ad {$ad->meta_ad_id} failed: " . $e->getMessage());
            }
        }
    }

    /**
     * Pause every ad of a live batch in Meta and mark the batch ended.
     */
    public function endBatch(AdBatch $batch, Carbon $now): void
    {
        foreach ($batch->ads as $ad) {
            if (!$ad->meta_ad_id || !$this->meta->configured()) {
                continue;
            }
            try {
                $this->meta->setStatus($ad->meta_ad_id, 'PAUSED');
                $ad->update(['meta_status' => 'PAUSED']);
            } catch (\Throwable $e) {
                Log::error("Pausing Meta ad {$ad->meta_ad_id} failed: " . $e->getMessage());
                $ad->update(['meta_note' => mb_substr('Could not pause: ' . $e->getMessage(), 0, 500)]);
            }
        }
        $batch->update(['status' => AdBatch::STATUS_ENDED, 'ended_at' => $now]);
    }

    // ------------------------------------------------------------------
    // Automation steps
    // ------------------------------------------------------------------

    /**
     * Upload scheduled batches entering the notice window to Meta (paused)
     * and email Dayne the preview, including anything Meta turned down.
     */
    public function sendDuePreviews(Carbon $now, bool $dryRun = false): int
    {
        $due = AdBatch::where('status', AdBatch::STATUS_SCHEDULED)
            ->whereNull('preview_sent_at')
            ->whereNotNull('go_live_at')
            ->where('go_live_at', '<=', $now->copy()->addMinutes(AdSettings::noticeMinutes()))
            ->orderBy('go_live_at')
            ->get();

        $sent = 0;
        foreach ($due as $batch) {
            if ($dryRun) {
                $sent++;
                continue;
            }
            $metaProblems = $this->syncToMeta($batch);
            $result = $this->sendPreview($batch->fresh('ads'), null, false, $metaProblems);
            if ($result['ok']) {
                // Go-live is held until the full notice window after this moment.
                $batch->update(['preview_sent_at' => $now]);
                $sent++;
            } else {
                Log::error("Ads preview for batch {$batch->id} failed: {$result['error']}");
            }
        }

        return $sent;
    }

    /**
     * Switch on batches whose go-live time has come. Edits made since the
     * preview are uploaded first. If anything can't go live (Meta not
     * connected, an upload fails, Meta rejected an ad) no ad is switched on:
     * the batch goes back to a draft and Dayne is told why.
     *
     * @return AdBatch[] batches that went live
     */
    public function launchDueBatches(Carbon $now, bool $dryRun = false): array
    {
        $candidates = AdBatch::where('status', AdBatch::STATUS_SCHEDULED)->whereNotNull('preview_sent_at')->get();
        $runDays = AdSettings::current()['run_days'];

        $launched = [];
        foreach ($candidates as $batch) {
            $goLive = $batch->effectiveGoLiveAt();
            if (!$goLive || $goLive->greaterThan($now)) {
                continue;
            }
            if ($dryRun) {
                $launched[] = $batch;
                continue;
            }

            $problems = $this->syncToMeta($batch);
            $batch->load('ads');
            if (!$problems) {
                $problems = $this->refreshReviewState($batch);
            }

            // A pause that landed while we were uploading wins.
            if ($batch->fresh()->status !== AdBatch::STATUS_SCHEDULED) {
                continue;
            }
            if ($problems) {
                $this->holdBatch($batch, $problems);
                continue;
            }

            try {
                $this->meta->ensureAdSetActive();
            } catch (\Throwable $e) {
                $this->holdBatch($batch, ['Could not switch on the customer ad set: ' . $e->getMessage()]);
                continue;
            }

            $failed = [];
            foreach ($batch->ads->values() as $i => $ad) {
                try {
                    $this->meta->setStatus($ad->meta_ad_id, 'ACTIVE');
                    $ad->update(['meta_status' => 'ACTIVE']);
                } catch (\Throwable $e) {
                    $failed[] = 'Ad ' . ($i + 1) . ': ' . $e->getMessage();
                }
            }
            if ($failed) {
                // All or nothing: switch off whatever did go on.
                foreach ($batch->ads as $ad) {
                    try {
                        $this->meta->setStatus($ad->meta_ad_id, 'PAUSED');
                        $ad->update(['meta_status' => 'PAUSED']);
                    } catch (\Throwable $e) {
                        Log::error("Re-pausing Meta ad {$ad->meta_ad_id} failed: " . $e->getMessage());
                    }
                }
                $this->holdBatch($batch, $failed);
                continue;
            }

            $batch->update([
                'status' => AdBatch::STATUS_LIVE,
                'launched_at' => $now,
                'ends_at' => $now->copy()->addDays($runDays),
            ]);

            $backlogIds = $batch->ads->pluck('backlog_id')->filter()->all();
            if ($backlogIds) {
                AdBacklogItem::whereIn('id', $backlogIds)->whereNull('used_at')->update([
                    'used_at' => $now,
                    'used_in_batch_id' => $batch->id,
                ]);
            }

            $this->notify(
                "Ads live: {$batch->displayName()}",
                '<p>' . e($batch->displayName()) . ' (' . $batch->ads->count() . ' ads) is now running on Instagram and Facebook'
                . ' until ' . e($this->eastern($batch->ends_at, 'l, M j')) . '. Nothing to do.</p>'
                . '<p><a href="' . e($this->adminEditUrl($batch)) . '">' . e($this->adminEditUrl($batch)) . '</a></p>'
            );
            $launched[] = $batch;
        }

        return $launched;
    }

    /**
     * Pause the ads of live batches past their run length.
     *
     * @return AdBatch[]
     */
    public function endExpiredBatches(Carbon $now, bool $dryRun = false): array
    {
        $expired = AdBatch::where('status', AdBatch::STATUS_LIVE)
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', $now)
            ->get();

        if (!$dryRun) {
            foreach ($expired as $batch) {
                $this->endBatch($batch, $now);
            }
        }

        return $expired->all();
    }

    /**
     * Back to a draft with the reasons, and tell Dayne. Nothing is switched on.
     */
    private function holdBatch(AdBatch $batch, array $problems): void
    {
        $batch->update([
            'status' => AdBatch::STATUS_DRAFT,
            'preview_sent_at' => null,
            'notes' => "Could not go live, so it is back to a draft:\n- " . implode("\n- ", $problems),
        ]);

        $this->notify(
            "Ads NOT live: {$batch->displayName()}",
            '<p>' . e($batch->displayName()) . ' did not go live. No ads were switched on.</p><ul>'
            . collect($problems)->map(function ($p) {
                return '<li>' . e($p) . '</li>';
            })->implode('')
            . '</ul><p>Fix it and reschedule here: <a href="' . e($this->adminEditUrl($batch)) . '">'
            . e($this->adminEditUrl($batch)) . '</a></p>'
        );
    }

    private function notify(string $subject, string $html): void
    {
        $result = $this->newsletters->deliver([[
            'to' => $this->previewEmail(),
            'subject' => $subject,
            'html' => $html,
            'text' => trim(strip_tags(str_replace(['</p>', '<br>'], "\n", $html))),
        ]])[0];

        if (!$result['ok']) {
            Log::error("Ads notice \"{$subject}\" failed: {$result['error']}");
        }
    }

    public function eastern(?Carbon $date, string $format): ?string
    {
        return $date ? $date->copy()->setTimezone(AdSettings::TIMEZONE)->format($format) : null;
    }
}
