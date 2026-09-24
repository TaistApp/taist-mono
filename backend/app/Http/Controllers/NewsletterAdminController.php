<?php

namespace App\Http\Controllers;

use App\Models\NewsletterBacklogItem;
use App\Models\NewsletterEdition;
use App\Models\NewsletterSettings;
use App\Models\NewsletterUnsubscribe;
use App\Services\NewsletterService;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Admin panel API for newsletters (auth:adminapi): editions, the per-audience
 * backlog, automation settings, and the unsubscribe list. Sending itself only
 * ever happens from `php artisan newsletter:run`, apart from test sends.
 */
class NewsletterAdminController extends Controller
{
    private $newsletters;

    public function __construct(NewsletterService $newsletters)
    {
        $this->newsletters = $newsletters;
    }

    public function index()
    {
        $editions = NewsletterEdition::orderByRaw("CASE status WHEN 'sending' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END")
            ->orderByRaw('send_at IS NULL')
            ->orderBy('send_at')
            ->orderByDesc('id')
            ->get()
            ->map(function ($e) {
                return $this->serialize($e);
            });

        $backlog = NewsletterBacklogItem::orderByRaw('used_at IS NOT NULL')
            ->orderBy('sort')->orderBy('id')->get()
            ->groupBy('user_type');

        return response()->json([
            'editions' => $editions,
            'backlog' => [
                1 => $backlog->get(1, collect())->values(),
                2 => $backlog->get(2, collect())->values(),
            ],
            'automation' => [
                1 => NewsletterSettings::automationFor(1),
                2 => NewsletterSettings::automationFor(2),
            ],
            'unsubscribe_count' => NewsletterUnsubscribe::count(),
            'config' => $this->configSummary(),
        ]);
    }

    public function show($id)
    {
        $edition = NewsletterEdition::findOrFail($id);

        return response()->json([
            'edition' => $this->serialize($edition),
            'warnings' => $this->newsletters->warnings($edition),
            'recipient_count' => $edition->status === NewsletterEdition::STATUS_SENT
                ? $edition->recipient_count
                : $this->newsletters->recipients($edition->user_type)->count(),
            'config' => $this->configSummary(),
        ]);
    }

    public function store(Request $request)
    {
        $userType = (int) $request->input('user_type');
        $kind = $request->input('kind', 'regular');
        if (!in_array($userType, [1, 2], true) || !in_array($kind, ['regular', 'special'], true)) {
            return response()->json(['success' => 0, 'error' => 'user_type must be 1 or 2 and kind regular or special'], 422);
        }

        $number = null;
        if ($kind === 'regular') {
            $number = ((int) NewsletterEdition::where('user_type', $userType)->where('kind', 'regular')->max('edition_number')) + 1;
        }

        $edition = NewsletterEdition::create(array_merge(
            $this->newsletters->defaultContent($userType, $kind, $number),
            [
                'user_type' => $userType,
                'kind' => $kind,
                'edition_number' => $number,
                'status' => NewsletterEdition::STATUS_DRAFT,
                'items' => [],
                'created_by' => 'admin',
            ]
        ));

        return response()->json(['success' => 1, 'edition' => $this->serialize($edition)]);
    }

    public function update(Request $request, $id)
    {
        $edition = NewsletterEdition::findOrFail($id);
        if (!$edition->isEditable()) {
            return response()->json(['success' => 0, 'error' => 'Only drafts and scheduled editions can be edited.'], 422);
        }

        $error = $this->applyContent($edition, $request);
        if ($error) {
            return response()->json(['success' => 0, 'error' => $error], 422);
        }

        if ($request->has('send_at_et')) {
            $sendAt = $this->parseEasternTime($request->input('send_at_et'));
            if ($request->input('send_at_et') && !$sendAt) {
                return response()->json(['success' => 0, 'error' => 'Invalid send date.'], 422);
            }
            $changed = !$this->sameMinute($sendAt, $edition->send_at);
            if ($changed && $edition->status === NewsletterEdition::STATUS_SCHEDULED) {
                if (!$sendAt) {
                    return response()->json(['success' => 0, 'error' => 'Unschedule the edition before clearing its send date.'], 422);
                }
                if ($sendAt->lessThan($this->newsletters->earliestSendAt()->subMinute())) {
                    return response()->json(['success' => 0, 'error' => $this->noticeError()], 422);
                }
                // New time, new heads-up: the preview goes out again before it.
                $edition->preview_sent_at = null;
            }
            $edition->send_at = $sendAt;
        }

        $edition->save();

        return response()->json([
            'success' => 1,
            'edition' => $this->serialize($edition->fresh()),
            'warnings' => $this->newsletters->warnings($edition),
        ]);
    }

    public function schedule(Request $request, $id)
    {
        $edition = NewsletterEdition::findOrFail($id);
        if ($edition->status !== NewsletterEdition::STATUS_DRAFT) {
            return response()->json(['success' => 0, 'error' => 'Only drafts can be scheduled.'], 422);
        }

        $sendAt = $request->filled('send_at_et')
            ? $this->parseEasternTime($request->input('send_at_et'))
            : $edition->send_at;
        if (!$sendAt) {
            return response()->json(['success' => 0, 'error' => 'Pick a send date first.'], 422);
        }
        if ($sendAt->lessThan($this->newsletters->earliestSendAt()->subMinute())) {
            return response()->json(['success' => 0, 'error' => $this->noticeError()], 422);
        }
        if (trim((string) $edition->subject) === '') {
            return response()->json(['success' => 0, 'error' => 'Add a subject line first.'], 422);
        }

        $edition->update([
            'status' => NewsletterEdition::STATUS_SCHEDULED,
            'send_at' => $sendAt,
            'preview_sent_at' => null,
        ]);

        return response()->json(['success' => 1, 'edition' => $this->serialize($edition->fresh())]);
    }

    public function unschedule($id)
    {
        $updated = NewsletterEdition::where('id', $id)
            ->where('status', NewsletterEdition::STATUS_SCHEDULED)
            ->update(['status' => NewsletterEdition::STATUS_DRAFT, 'preview_sent_at' => null]);

        if ($updated !== 1) {
            return response()->json(['success' => 0, 'error' => 'Only scheduled editions can be unscheduled.'], 422);
        }

        return response()->json(['success' => 1, 'edition' => $this->serialize(NewsletterEdition::find($id))]);
    }

    public function destroy($id)
    {
        $edition = NewsletterEdition::findOrFail($id);
        if (!in_array($edition->status, [NewsletterEdition::STATUS_DRAFT, NewsletterEdition::STATUS_CANCELLED], true)) {
            return response()->json(['success' => 0, 'error' => 'Unschedule the edition before deleting it. Sent editions are kept.'], 422);
        }

        $edition->delete();

        return response()->json(['success' => 1]);
    }

    /**
     * Render unsaved editor content for the live preview pane.
     */
    public function render(Request $request)
    {
        $edition = $request->filled('id')
            ? NewsletterEdition::findOrFail($request->input('id'))->replicate()
            : new NewsletterEdition(['user_type' => (int) $request->input('user_type', 1), 'kind' => 'regular']);

        $error = $this->applyContent($edition, $request);
        if ($error) {
            return response()->json(['success' => 0, 'error' => $error], 422);
        }

        $sample = $this->newsletters->recipients($edition->user_type)->first();
        $rendered = $this->newsletters->render(
            $edition,
            $sample['first_name'] ?? null,
            $sample['email'] ?? 'friend@example.com'
        );

        return response()->json([
            'subject' => $rendered['subject'],
            'html' => $rendered['html'],
            'sample' => $sample ? ['first_name' => $sample['first_name']] : null,
            'warnings' => $this->newsletters->warnings($edition),
        ]);
    }

    public function sendTest(Request $request, $id)
    {
        $edition = NewsletterEdition::findOrFail($id);
        $to = trim((string) $request->input('email', $this->newsletters->previewEmail()));
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['success' => 0, 'error' => 'Enter a valid email address.'], 422);
        }

        $result = $this->newsletters->sendPreview($edition, $to, true);
        if (!$result['ok']) {
            return response()->json(['success' => 0, 'error' => 'Send failed: ' . $result['error']], 502);
        }

        return response()->json(['success' => 1]);
    }

    // ---- Backlog ----

    public function backlogStore(Request $request)
    {
        $userType = (int) $request->input('user_type');
        $title = trim((string) $request->input('title'));
        if (!in_array($userType, [1, 2], true) || $title === '') {
            return response()->json(['success' => 0, 'error' => 'Audience and title are required.'], 422);
        }

        $item = NewsletterBacklogItem::create([
            'user_type' => $userType,
            'title' => mb_substr($title, 0, 255),
            'body' => trim((string) $request->input('body')),
            'sort' => ((int) NewsletterBacklogItem::where('user_type', $userType)->max('sort')) + 1,
        ]);

        return response()->json(['success' => 1, 'item' => $item]);
    }

    public function backlogUpdate(Request $request, $id)
    {
        $item = NewsletterBacklogItem::findOrFail($id);
        if ($request->has('title')) {
            $title = trim((string) $request->input('title'));
            if ($title === '') {
                return response()->json(['success' => 0, 'error' => 'Title is required.'], 422);
            }
            $item->title = mb_substr($title, 0, 255);
        }
        if ($request->has('body')) {
            $item->body = trim((string) $request->input('body'));
        }
        if ($request->has('sort')) {
            $item->sort = (int) $request->input('sort');
        }
        $item->save();

        return response()->json(['success' => 1, 'item' => $item]);
    }

    public function backlogDestroy($id)
    {
        NewsletterBacklogItem::findOrFail($id)->delete();

        return response()->json(['success' => 1]);
    }

    // ---- Automation + unsubscribes ----

    public function automationUpdate(Request $request)
    {
        $userType = (int) $request->input('user_type');
        if (!in_array($userType, [1, 2], true)) {
            return response()->json(['success' => 0, 'error' => 'user_type must be 1 or 2'], 422);
        }

        $values = [];
        if ($request->has('auto_schedule')) {
            $values['auto_schedule'] = filter_var($request->input('auto_schedule'), FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('cadence_days')) {
            $cadence = (int) $request->input('cadence_days');
            if ($cadence < 3 || $cadence > 90) {
                return response()->json(['success' => 0, 'error' => 'Cadence must be 3 to 90 days.'], 422);
            }
            $values['cadence_days'] = $cadence;
        }
        if ($request->has('send_time')) {
            $time = (string) $request->input('send_time');
            if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) {
                return response()->json(['success' => 0, 'error' => 'Send time must be HH:MM.'], 422);
            }
            $values['send_time'] = $time;
        }

        $row = NewsletterSettings::firstOrNew(['user_type' => $userType]);
        if (!$row->exists) {
            $row->filter_mode = NewsletterSettings::modeForType($userType);
        }
        $row->fill($values)->save();

        return response()->json(['success' => 1, 'automation' => NewsletterSettings::automationFor($userType)]);
    }

    public function unsubscribes()
    {
        return response()->json([
            'unsubscribes' => NewsletterUnsubscribe::orderByDesc('created_at')->limit(500)->get(),
            'count' => NewsletterUnsubscribe::count(),
        ]);
    }

    // ---- Helpers ----

    /**
     * Copy editable content from the request onto the edition (unsaved).
     * Returns an error message, or null.
     */
    private function applyContent(NewsletterEdition $edition, Request $request): ?string
    {
        foreach (NewsletterEdition::CONTENT_FIELDS as $field) {
            if (!$request->has($field) || $field === 'items') {
                continue;
            }
            $value = $request->input($field);
            $edition->{$field} = is_string($value) ? trim($value) : $value;
        }

        if ($request->has('kind') && !in_array($edition->kind, ['regular', 'special'], true)) {
            return 'kind must be regular or special.';
        }

        if ($request->has('cta_url') && $edition->cta_url && !preg_match('#^(https?://|mailto:)#i', $edition->cta_url)) {
            return 'Button link must start with https://, http:// or mailto:.';
        }

        if ($request->has('items')) {
            $items = $request->input('items');
            if (!is_array($items)) {
                return 'items must be a list.';
            }
            if (count($items) > NewsletterEdition::MAX_ITEMS) {
                return 'Up to ' . NewsletterEdition::MAX_ITEMS . ' update items per edition.';
            }
            $edition->items = collect($items)->map(function ($item) {
                $clean = [
                    'title' => trim((string) ($item['title'] ?? '')),
                    'body' => trim((string) ($item['body'] ?? '')),
                ];
                if (!empty($item['backlog_id'])) {
                    $clean['backlog_id'] = (int) $item['backlog_id'];
                }
                return $clean;
            })->values()->all();
        }

        return null;
    }

    private function serialize(NewsletterEdition $e): array
    {
        $toEastern = function ($date, $format) {
            return $date ? $date->copy()->setTimezone(NewsletterSettings::TIMEZONE)->format($format) : null;
        };

        return array_merge($e->toArray(), [
            'items' => $e->items ?? [],
            'display_name' => $e->displayName(),
            'send_at_et' => $toEastern($e->send_at, 'Y-m-d\TH:i'),
            'send_at_label' => $toEastern($e->send_at, 'D, M j, Y g:i A') ? $toEastern($e->send_at, 'D, M j, Y g:i A') . ' ET' : null,
            'effective_send_at_label' => $toEastern($e->effectiveSendAt(), 'D, M j, Y g:i A') ? $toEastern($e->effectiveSendAt(), 'D, M j, Y g:i A') . ' ET' : null,
            'preview_at_label' => $e->send_at && $e->status === NewsletterEdition::STATUS_SCHEDULED && !$e->preview_sent_at
                ? $toEastern($e->send_at->copy()->subHours(NewsletterSettings::NOTICE_HOURS), 'D, M j g:i A') . ' ET'
                : null,
            'preview_sent_at_label' => $toEastern($e->preview_sent_at, 'D, M j g:i A') ? $toEastern($e->preview_sent_at, 'D, M j g:i A') . ' ET' : null,
            'sent_at_label' => $toEastern($e->sent_at, 'D, M j, Y g:i A') ? $toEastern($e->sent_at, 'D, M j, Y g:i A') . ' ET' : null,
        ]);
    }

    private function configSummary(): array
    {
        return [
            'notice_hours' => NewsletterSettings::NOTICE_HOURS,
            'preview_email' => $this->newsletters->previewEmail(),
            'autosend_enabled' => $this->newsletters->autosendEnabled(),
            'mailing_address' => $this->newsletters->mailingAddress(),
            'mailing_address_configured' => $this->newsletters->mailingAddressConfigured(),
            'earliest_send_at_et' => $this->newsletters->earliestSendAt()
                ->addMinutes(5)->setTimezone(NewsletterSettings::TIMEZONE)->format('Y-m-d\TH:i'),
            'max_items' => NewsletterEdition::MAX_ITEMS,
        ];
    }

    private function parseEasternTime($value): ?Carbon
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $value)) {
            return null;
        }
        try {
            return Carbon::createFromFormat('Y-m-d\TH:i', $value, NewsletterSettings::TIMEZONE)->setTimezone('UTC');
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
        return 'Send time must be at least ' . NewsletterSettings::NOTICE_HOURS
            . ' hours from now so the preview goes out first.';
    }
}
