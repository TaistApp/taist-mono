<?php

namespace App\Http\Controllers;

use App\Models\Ad;
use App\Models\AdBacklogItem;
use App\Models\AdBatch;
use App\Models\AdSettings;
use App\Services\AdService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Admin panel API for paid ads (auth:adminapi): weekly batches and their ads,
 * the idea backlog, and automation settings. Previews and approvals only ever
 * happen from `php artisan ads:run`, apart from test sends.
 */
class AdAdminController extends Controller
{
    private $ads;

    public function __construct(AdService $ads)
    {
        $this->ads = $ads;
    }

    public function index()
    {
        $batches = AdBatch::with('ads')
            ->orderByRaw("CASE status WHEN 'live' THEN 0 WHEN 'ready' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'draft' THEN 3 ELSE 4 END")
            ->orderByRaw('go_live_at IS NULL')
            ->orderByDesc('go_live_at')
            ->orderByDesc('id')
            ->get()
            ->map(function ($b) {
                return $this->serialize($b);
            });

        return response()->json([
            'batches' => $batches,
            'backlog' => AdBacklogItem::orderByRaw('used_at IS NOT NULL')->orderBy('sort')->orderBy('id')->get(),
            'settings' => AdSettings::current(),
            'config' => $this->configSummary(),
        ]);
    }

    public function show($id)
    {
        $batch = AdBatch::with('ads')->findOrFail($id);

        return response()->json([
            'batch' => $this->serialize($batch),
            'warnings' => $this->ads->warnings($batch),
            'config' => $this->configSummary(),
        ]);
    }

    /**
     * New draft batch, pre-filled from the top of the backlog unless
     * fill=false.
     */
    public function store(Request $request)
    {
        $batch = AdBatch::create([
            'batch_number' => ((int) AdBatch::max('batch_number')) + 1,
            'status' => AdBatch::STATUS_DRAFT,
            'created_by' => 'admin',
        ]);

        if ($request->input('fill', true) !== false) {
            $settings = AdSettings::current();
            $items = AdBacklogItem::available()->orderBy('sort')->orderBy('id')
                ->limit(min($settings['ads_per_batch'], AdBatch::MAX_ADS))->get();
            $usedPhotos = [];
            foreach ($items->values() as $i => $item) {
                $ad = $this->ads->adFromBacklog($item, $usedPhotos);
                $ad->batch_id = $batch->id;
                $ad->sort = $i;
                $ad->save();
                if ($ad->dish_photo_id) {
                    $usedPhotos[] = $ad->dish_photo_id;
                }
            }
        }

        return response()->json(['success' => 1, 'batch' => $this->serialize($batch->fresh('ads'))]);
    }

    public function update(Request $request, $id)
    {
        $batch = AdBatch::with('ads')->findOrFail($id);
        if (!$batch->isEditable()) {
            return response()->json(['success' => 0, 'error' => 'Only draft and scheduled batches can be edited.'], 422);
        }

        $ads = null;
        if ($request->has('ads')) {
            [$ads, $error] = $this->parseAds($request->input('ads'));
            if ($error) {
                return response()->json(['success' => 0, 'error' => $error], 422);
            }
        }

        if ($request->has('go_live_at_et')) {
            $goLive = $this->parseEasternTime($request->input('go_live_at_et'));
            if ($request->input('go_live_at_et') && !$goLive) {
                return response()->json(['success' => 0, 'error' => 'Invalid go-live date.'], 422);
            }
            $changed = !$this->sameMinute($goLive, $batch->go_live_at);
            if ($changed && $batch->status === AdBatch::STATUS_SCHEDULED) {
                if (!$goLive) {
                    return response()->json(['success' => 0, 'error' => 'Unschedule the batch before clearing its go-live date.'], 422);
                }
                if ($goLive->lessThan($this->ads->earliestGoLiveAt()->subMinute())) {
                    return response()->json(['success' => 0, 'error' => $this->noticeError()], 422);
                }
                // New time, new heads-up: the preview goes out again before it.
                $batch->preview_sent_at = null;
            }
            $batch->go_live_at = $goLive;
        }

        if ($request->has('notes')) {
            $batch->notes = trim((string) $request->input('notes'));
        }

        $batch->save();

        if ($ads !== null) {
            Ad::where('batch_id', $batch->id)->delete();
            foreach ($ads->values() as $i => $ad) {
                $ad->batch_id = $batch->id;
                $ad->sort = $i;
                $ad->save();
            }
        }

        $batch = $batch->fresh('ads');

        return response()->json([
            'success' => 1,
            'batch' => $this->serialize($batch),
            'warnings' => $this->ads->warnings($batch),
        ]);
    }

    /**
     * Warnings for unsaved editor content, for the live checks panel.
     */
    public function lint(Request $request)
    {
        [$ads, $error] = $this->parseAds($request->input('ads', []));
        if ($error) {
            return response()->json(['warnings' => [$error]]);
        }

        return response()->json(['warnings' => $this->ads->warnings(new AdBatch(), $ads)]);
    }

    public function schedule(Request $request, $id)
    {
        $batch = AdBatch::with('ads')->findOrFail($id);
        if ($batch->status !== AdBatch::STATUS_DRAFT) {
            return response()->json(['success' => 0, 'error' => 'Only drafts can be scheduled.'], 422);
        }

        $goLive = $request->filled('go_live_at_et')
            ? $this->parseEasternTime($request->input('go_live_at_et'))
            : $batch->go_live_at;
        if (!$goLive) {
            return response()->json(['success' => 0, 'error' => 'Pick a go-live date first.'], 422);
        }
        if ($goLive->lessThan($this->ads->earliestGoLiveAt()->subMinute())) {
            return response()->json(['success' => 0, 'error' => $this->noticeError()], 422);
        }
        if ($batch->ads->isEmpty()) {
            return response()->json(['success' => 0, 'error' => 'Add at least one ad first.'], 422);
        }

        $batch->update([
            'status' => AdBatch::STATUS_SCHEDULED,
            'go_live_at' => $goLive,
            'preview_sent_at' => null,
        ]);

        return response()->json(['success' => 1, 'batch' => $this->serialize($batch->fresh('ads'))]);
    }

    public function unschedule($id)
    {
        $updated = AdBatch::where('id', $id)
            ->where('status', AdBatch::STATUS_SCHEDULED)
            ->update(['status' => AdBatch::STATUS_DRAFT, 'preview_sent_at' => null]);

        if ($updated !== 1) {
            return response()->json(['success' => 0, 'error' => 'Only scheduled batches can be unscheduled.'], 422);
        }

        return response()->json(['success' => 1, 'batch' => $this->serialize(AdBatch::with('ads')->find($id))]);
    }

    /**
     * Dayne created the ads in Ads Manager. Optionally records each ad's
     * Meta ad ID: meta_ad_ids = {ad id: meta id}.
     */
    public function launched(Request $request, $id)
    {
        $batch = AdBatch::with('ads')->findOrFail($id);
        if ($batch->status !== AdBatch::STATUS_READY) {
            return response()->json(['success' => 0, 'error' => 'Only batches that are ready to launch can be marked launched.'], 422);
        }

        $metaIds = (array) $request->input('meta_ad_ids', []);
        foreach ($batch->ads as $ad) {
            $metaId = trim((string) ($metaIds[$ad->id] ?? ''));
            if ($metaId !== '') {
                $ad->update(['meta_ad_id' => mb_substr($metaId, 0, 64)]);
            }
        }

        $batch->update(['status' => AdBatch::STATUS_LIVE, 'launched_at' => Carbon::now()]);

        return response()->json(['success' => 1, 'batch' => $this->serialize($batch->fresh('ads'))]);
    }

    public function end($id)
    {
        $updated = AdBatch::where('id', $id)
            ->whereIn('status', [AdBatch::STATUS_READY, AdBatch::STATUS_LIVE])
            ->update(['status' => AdBatch::STATUS_ENDED, 'ended_at' => Carbon::now()]);

        if ($updated !== 1) {
            return response()->json(['success' => 0, 'error' => 'Only ready or live batches can be ended.'], 422);
        }

        return response()->json(['success' => 1, 'batch' => $this->serialize(AdBatch::with('ads')->find($id))]);
    }

    public function destroy($id)
    {
        $batch = AdBatch::findOrFail($id);
        if (!in_array($batch->status, [AdBatch::STATUS_DRAFT, AdBatch::STATUS_CANCELLED], true)) {
            return response()->json(['success' => 0, 'error' => 'Unschedule the batch before deleting it. Approved batches are kept.'], 422);
        }

        Ad::where('batch_id', $batch->id)->delete();
        $batch->delete();

        return response()->json(['success' => 1]);
    }

    public function sendTest(Request $request, $id)
    {
        $batch = AdBatch::with('ads')->findOrFail($id);
        $to = trim((string) $request->input('email', $this->ads->previewEmail()));
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['success' => 0, 'error' => 'Enter a valid email address.'], 422);
        }

        $result = $this->ads->sendPreview($batch, $to, true);
        if (!$result['ok']) {
            return response()->json(['success' => 0, 'error' => 'Send failed: ' . $result['error']], 502);
        }

        return response()->json(['success' => 1]);
    }

    /**
     * A random approved chef dish photo for the editor's "Use a dish photo".
     */
    public function dishPhoto(Request $request)
    {
        $exclude = array_map('intval', array_filter(explode(',', (string) $request->query('exclude', ''))));
        $photo = $this->ads->pickDishPhoto($exclude);

        if (!$photo) {
            return response()->json(['success' => 0, 'error' => 'No approved dish photos queued for social are left to use.'], 404);
        }

        return response()->json(['success' => 1, 'photo' => $photo]);
    }

    // ---- Backlog ----

    public function backlogStore(Request $request)
    {
        $angle = trim((string) $request->input('angle'));
        if ($angle === '') {
            return response()->json(['success' => 0, 'error' => 'Give the idea a name.'], 422);
        }
        $error = $this->validateBacklogInput($request);
        if ($error) {
            return response()->json(['success' => 0, 'error' => $error], 422);
        }

        $item = AdBacklogItem::create(array_merge($this->backlogFields($request), [
            'angle' => mb_substr($angle, 0, 255),
            'sort' => ((int) AdBacklogItem::max('sort')) + 1,
        ]));

        return response()->json(['success' => 1, 'item' => $item]);
    }

    public function backlogUpdate(Request $request, $id)
    {
        $item = AdBacklogItem::findOrFail($id);
        if ($request->has('angle')) {
            $angle = trim((string) $request->input('angle'));
            if ($angle === '') {
                return response()->json(['success' => 0, 'error' => 'Give the idea a name.'], 422);
            }
            $item->angle = mb_substr($angle, 0, 255);
        }
        $error = $this->validateBacklogInput($request);
        if ($error) {
            return response()->json(['success' => 0, 'error' => $error], 422);
        }
        $item->fill($this->backlogFields($request));
        if ($request->has('sort')) {
            $item->sort = (int) $request->input('sort');
        }
        $item->save();

        return response()->json(['success' => 1, 'item' => $item]);
    }

    public function backlogDestroy($id)
    {
        AdBacklogItem::findOrFail($id)->delete();

        return response()->json(['success' => 1]);
    }

    // ---- Settings ----

    public function settingsUpdate(Request $request)
    {
        $values = [];
        if ($request->has('auto_schedule')) {
            $values['auto_schedule'] = filter_var($request->input('auto_schedule'), FILTER_VALIDATE_BOOLEAN);
        }
        foreach ([
            'cadence_days' => [3, 60, 'New batch every 3 to 60 days.'],
            'ads_per_batch' => [1, AdBatch::MAX_ADS, 'Ads per batch must be 1 to ' . AdBatch::MAX_ADS . '.'],
            'run_days' => [3, 90, 'Run length must be 3 to 90 days.'],
        ] as $field => [$min, $max, $error]) {
            if ($request->has($field)) {
                $value = (int) $request->input($field);
                if ($value < $min || $value > $max) {
                    return response()->json(['success' => 0, 'error' => $error], 422);
                }
                $values[$field] = $value;
            }
        }
        if ($request->has('go_live_time')) {
            $time = (string) $request->input('go_live_time');
            if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) {
                return response()->json(['success' => 0, 'error' => 'Go-live time must be HH:MM.'], 422);
            }
            $values['go_live_time'] = $time;
        }

        $row = AdSettings::query()->orderBy('id')->first() ?: new AdSettings(AdSettings::DEFAULTS);
        $row->fill($values)->save();

        return response()->json(['success' => 1, 'settings' => AdSettings::current()]);
    }

    // ---- Helpers ----

    /**
     * Unsaved Ad models from editor input.
     *
     * @return array [Collection|null, error|null]
     */
    private function parseAds($input): array
    {
        if (!is_array($input)) {
            return [null, 'ads must be a list.'];
        }
        if (count($input) > AdBatch::MAX_ADS) {
            return [null, 'Up to ' . AdBatch::MAX_ADS . ' ads per batch.'];
        }

        $ads = collect();
        foreach (array_values($input) as $i => $row) {
            $row = is_array($row) ? $row : [];
            $ad = new Ad();
            foreach (Ad::CONTENT_FIELDS as $field) {
                $value = $row[$field] ?? null;
                $ad->{$field} = is_string($value) ? trim($value) : $value;
            }
            $ad->cta = $ad->cta ?: 'LEARN_MORE';
            if (!isset(Ad::CTAS[$ad->cta])) {
                return [null, 'Ad ' . ($i + 1) . ': unknown button type.'];
            }
            $ad->link_url = $ad->link_url ?: AdService::DEFAULT_LINK_URL;
            if (!preg_match('#^https://#i', $ad->link_url)) {
                return [null, 'Ad ' . ($i + 1) . ': the link must start with https://.'];
            }
            if ($ad->image_url && !preg_match('#^https?://#i', $ad->image_url)) {
                return [null, 'Ad ' . ($i + 1) . ': the image must be a web link (https://...).'];
            }
            $ad->dish_photo_id = $ad->dish_photo_id ? (int) $ad->dish_photo_id : null;
            $ad->backlog_id = $ad->backlog_id ? (int) $ad->backlog_id : null;
            $ads->push($ad);
        }

        return [$ads, null];
    }

    private function validateBacklogInput(Request $request): ?string
    {
        if ($request->filled('cta') && !isset(Ad::CTAS[$request->input('cta')])) {
            return 'Unknown button type.';
        }
        if ($request->filled('link_url') && !preg_match('#^https://#i', (string) $request->input('link_url'))) {
            return 'The link must start with https://.';
        }
        if ($request->filled('image_url') && !preg_match('#^https?://#i', (string) $request->input('image_url'))) {
            return 'The image must be a web link (https://...).';
        }
        return null;
    }

    private function backlogFields(Request $request): array
    {
        $fields = [];
        foreach (['primary_text', 'headline', 'description', 'cta', 'link_url', 'image_url'] as $field) {
            if ($request->has($field)) {
                $value = trim((string) $request->input($field));
                $fields[$field] = $value === '' ? null : $value;
            }
        }
        return $fields;
    }

    private function serialize(AdBatch $b): array
    {
        $label = function ($date, $format) {
            $formatted = $this->ads->eastern($date, $format);
            return $formatted ? $formatted . ' ET' : null;
        };

        return array_merge($b->toArray(), [
            'ads' => $b->ads->map(function (Ad $ad) {
                return array_merge($ad->toArray(), ['cta_label' => $ad->ctaLabel()]);
            })->values(),
            'display_name' => $b->displayName(),
            'go_live_at_et' => $this->ads->eastern($b->go_live_at, 'Y-m-d\TH:i'),
            'go_live_at_label' => $label($b->go_live_at, 'D, M j, Y g:i A'),
            'effective_go_live_at_label' => $label($b->effectiveGoLiveAt(), 'D, M j, Y g:i A'),
            'preview_at_label' => $b->go_live_at && $b->status === AdBatch::STATUS_SCHEDULED && !$b->preview_sent_at
                ? $label($b->go_live_at->copy()->subMinutes(AdSettings::noticeMinutes()), 'D, M j g:i A')
                : null,
            'preview_sent_at_label' => $label($b->preview_sent_at, 'D, M j g:i A'),
            'launched_at_label' => $label($b->launched_at, 'D, M j, Y g:i A'),
            'ends_at_label' => $label($b->ends_at, 'D, M j, Y'),
        ]);
    }

    private function configSummary(): array
    {
        return [
            'notice_hours' => AdSettings::NOTICE_HOURS,
            'notice_label' => AdSettings::noticeLabel(),
            'preview_email' => $this->ads->previewEmail(),
            'automation_enabled' => $this->ads->automationEnabled(),
            'earliest_go_live_at_et' => $this->ads->eastern($this->ads->earliestGoLiveAt()->addMinutes(5), 'Y-m-d\TH:i'),
            'max_ads' => AdBatch::MAX_ADS,
            'ctas' => Ad::CTAS,
            'limits' => [
                'primary_text' => Ad::PRIMARY_TEXT_LIMIT,
                'headline' => Ad::HEADLINE_LIMIT,
                'description' => Ad::DESCRIPTION_LIMIT,
            ],
            'default_link_url' => AdService::DEFAULT_LINK_URL,
        ];
    }

    private function parseEasternTime($value): ?Carbon
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $value)) {
            return null;
        }
        try {
            return Carbon::createFromFormat('Y-m-d\TH:i', $value, AdSettings::TIMEZONE)->setTimezone('UTC');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function sameMinute(?Carbon $a, ?Carbon $b): bool
    {
        if (!$a || !$b) {
            return $a === $b;
        }
        return $a->format('Y-m-d H:i') === $b->copy()->setTimezone('UTC')->format('Y-m-d H:i');
    }

    private function noticeError(): string
    {
        return 'Go-live must be at least ' . AdSettings::noticeLabel() . ' from now so the preview goes out first.';
    }
}
