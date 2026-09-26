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
 *   draft -> scheduled -> (preview emailed 48h before) -> ready -> live -> ended
 *
 * Nothing here calls Meta yet. At the go-live time a batch becomes "ready"
 * and Dayne is emailed the copy to create in Ads Manager, then marks it
 * launched in the admin panel. After a batch goes ready the planner drafts
 * and schedules the next one (cadence_days later) from the backlog. The first
 * batch is always scheduled by hand.
 */
class AdService
{
    const DEFAULT_LINK_URL = 'https://taist.app';

    // A chef dish photo is not reused in another ad within this many days.
    const DISH_PHOTO_REUSE_DAYS = 60;

    const COMPETITORS = ['doordash', 'door dash', 'uber eats', 'ubereats', 'grubhub', 'instacart', 'postmates', 'hellofresh', 'hello fresh'];

    private $newsletters;

    public function __construct(NewsletterService $newsletters)
    {
        // Email delivery and discount-code checks are shared with newsletters.
        $this->newsletters = $newsletters;
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
    public function sendPreview(AdBatch $batch, ?string $to = null, bool $isTest = false): array
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
            $lines[] = 'No action needed if they look good. They are approved automatically at go-live.';
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
     * Draft (and schedule, when the backlog has ideas) the next batch once
     * the latest one has gone ready and nothing newer is in the pipeline.
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

        // The chain only starts once an admin-scheduled batch has gone ready.
        $last = AdBatch::whereIn('status', [AdBatch::STATUS_READY, AdBatch::STATUS_LIVE, AdBatch::STATUS_ENDED])
            ->whereNotNull('go_live_at')
            ->orderByDesc('go_live_at')
            ->first();
        if (!$last) {
            return null;
        }

        $goLiveAt = $this->nextSlot($last->effectiveGoLiveAt()->copy()->addDays($settings['cadence_days']), $now);
        $backlog = AdBacklogItem::available()->orderBy('sort')->orderBy('id')
            ->limit(min($settings['ads_per_batch'], AdBatch::MAX_ADS))->get();
        $number = ((int) AdBatch::max('batch_number')) + 1;
        $status = $backlog->isEmpty() ? AdBatch::STATUS_DRAFT : AdBatch::STATUS_SCHEDULED;

        if ($dryRun) {
            return new AdBatch(['batch_number' => $number, 'status' => $status, 'go_live_at' => $goLiveAt]);
        }

        $batch = AdBatch::create([
            'batch_number' => $number,
            'status' => $status,
            'go_live_at' => $goLiveAt,
            'created_by' => 'auto',
            'notes' => $backlog->isEmpty()
                ? 'Auto-drafted with an empty backlog, so it is NOT scheduled. Add ads and schedule it.'
                : 'Auto-drafted from the backlog.',
        ]);

        $usedPhotos = [];
        foreach ($backlog->values() as $i => $item) {
            $ad = $this->adFromBacklog($item, $usedPhotos);
            $ad->batch_id = $batch->id;
            $ad->sort = $i;
            $ad->save();
            if ($ad->dish_photo_id) {
                $usedPhotos[] = $ad->dish_photo_id;
            }
        }

        if ($backlog->isEmpty()) {
            $this->notify(
                "Ads need content: {$batch->displayName()}",
                '<p>' . e($batch->displayName()) . ' was auto-drafted, but the ad backlog is empty, so it is '
                . '<strong>not scheduled</strong>.</p><p>Add ads and schedule it here: '
                . '<a href="' . e($this->adminEditUrl($batch)) . '">' . e($this->adminEditUrl($batch)) . '</a></p>'
            );
        }

        return $batch;
    }

    /**
     * An unsaved ad built from a backlog idea. Ideas without an image get an
     * approved chef dish photo.
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

    /**
     * Email previews for scheduled batches entering the notice window.
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
            $result = $this->sendPreview($batch);
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
     * Approve batches whose go-live time has come: mark them ready, retire
     * their backlog ideas, and email Dayne the copy to launch.
     *
     * @return AdBatch[]
     */
    public function approveDueBatches(Carbon $now, bool $dryRun = false): array
    {
        $candidates = AdBatch::where('status', AdBatch::STATUS_SCHEDULED)->whereNotNull('preview_sent_at')->get();
        $runDays = AdSettings::current()['run_days'];

        $approved = [];
        foreach ($candidates as $batch) {
            $goLive = $batch->effectiveGoLiveAt();
            if (!$goLive || $goLive->greaterThan($now)) {
                continue;
            }
            if ($dryRun) {
                $approved[] = $batch;
                continue;
            }

            // Claim it; a concurrent run (or a pause) that wins the race skips it.
            $claimed = AdBatch::where('id', $batch->id)->where('status', AdBatch::STATUS_SCHEDULED)->update([
                'status' => AdBatch::STATUS_READY,
                'ready_at' => $now,
                'ends_at' => $goLive->copy()->addDays($runDays),
            ]);
            if ($claimed !== 1) {
                continue;
            }
            $batch->refresh();

            $backlogIds = $batch->ads->pluck('backlog_id')->filter()->all();
            if ($backlogIds) {
                AdBacklogItem::whereIn('id', $backlogIds)->whereNull('used_at')->update([
                    'used_at' => $now,
                    'used_in_batch_id' => $batch->id,
                ]);
            }

            $this->sendReadyEmail($batch);
            $approved[] = $batch;
        }

        return $approved;
    }

    /**
     * End batches past their run length and remind Dayne to turn them off.
     *
     * @return AdBatch[]
     */
    public function endExpiredBatches(Carbon $now, bool $dryRun = false): array
    {
        $expired = AdBatch::whereIn('status', [AdBatch::STATUS_READY, AdBatch::STATUS_LIVE])
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', $now)
            ->get();

        if ($dryRun) {
            return $expired->all();
        }

        foreach ($expired as $batch) {
            $wasLive = $batch->status === AdBatch::STATUS_LIVE;
            $batch->update(['status' => AdBatch::STATUS_ENDED, 'ended_at' => $now]);

            if ($wasLive) {
                $this->notify(
                    "Turn off ads: {$batch->displayName()}",
                    '<p>' . e($batch->displayName()) . ' has run its ' . AdSettings::current()['run_days']
                    . ' days. Turn its ads off in Ads Manager (keep any clear winner running if you like).</p>'
                    . '<p><a href="' . e($this->adminEditUrl($batch)) . '">' . e($this->adminEditUrl($batch)) . '</a></p>'
                );
            }
        }

        return $expired->all();
    }

    private function sendReadyEmail(AdBatch $batch): void
    {
        $lines = [
            'The 48-hour preview passed without a pause, so these are approved.',
            'Create them in Ads Manager in the customer ad set (copy below), then click "Mark launched" in the admin panel.',
            'Run them until ' . $this->eastern($batch->ends_at, 'l, M j') . '. You will get a reminder to turn them off.',
        ];
        foreach ($this->warnings($batch) as $warning) {
            $lines[] = 'Warning: ' . $warning;
        }

        $rendered = $this->renderEmail($batch, 'Ready to launch: ' . $batch->displayName(), [
            'title' => 'Ready to launch: ' . $batch->displayName(),
            'lines' => $lines,
            'links' => [['Open in admin', $this->adminEditUrl($batch)]],
        ]);

        $result = $this->newsletters->deliver([[
            'to' => $this->previewEmail(),
            'subject' => $rendered['subject'],
            'html' => $rendered['html'],
            'text' => $rendered['text'],
        ]])[0];

        if (!$result['ok']) {
            Log::error("Ads ready email for batch {$batch->id} failed: {$result['error']}");
        }
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
