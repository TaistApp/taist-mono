<?php

namespace App\Services;

use App\Listener;
use App\Models\DiscountCodes;
use App\Models\NewsletterBacklogItem;
use App\Models\NewsletterEdition;
use App\Models\NewsletterSend;
use App\Models\NewsletterSettings;
use App\Models\NewsletterUnsubscribe;
use App\Models\Waitlist;
use App\Models\Zipcodes;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Everything the chef and customer newsletters need: who receives them, how an
 * edition renders, unsubscribe links, delivery through Resend, and the
 * automation that runs from `php artisan newsletter:run`.
 *
 * Lifecycle of an edition:
 *   draft -> scheduled -> (preview emailed 48h before) -> sending -> sent
 *
 * After an audience's regular edition is sent, the planner drafts and schedules
 * the next one (cadence_days later) from that audience's backlog. The first
 * edition for each audience is always scheduled by hand.
 */
class NewsletterService
{
    const FROM = 'Taist <contact@taist.app>';
    const REPLY_TO = 'contact@taist.app';
    const DEFAULT_MAILING_ADDRESS = 'Taist, Inc. · 7701 Creekside Dr, Fishers, IN 46038';
    const APP_STORE_URL = 'https://apps.apple.com/app/1598624809';
    const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.taist.app';

    // Resend's batch endpoint takes up to 100 messages per call.
    const BATCH_SIZE = 100;

    // ------------------------------------------------------------------
    // Audience
    // ------------------------------------------------------------------

    /**
     * Merged recipient list for a user_type, applying the audience filter.
     * Combines waitlist contacts and app users, deduped by email (app users
     * take priority), and drops anyone who unsubscribed.
     *
     * Filter modes:
     *   Customers (user_type 1):
     *     - service_area : only zips listed in tbl_zipcodes (waitlist + app users)
     *     - all          : every customer, no zip filter
     *   Chefs (user_type 2):
     *     - active         : approved app chefs only (verified=1, is_pending=0); no leads
     *     - active_pending : app chefs only, approved or mid-application (verified 0/1); no leads
     *     - all            : app chefs (verified 0/1) plus waitlist leads
     *
     * If $mode is null the stored setting for the user_type is used.
     */
    public function recipients($userType, $mode = null, bool $excludeUnsubscribed = true): Collection
    {
        if ($mode === null) {
            $mode = NewsletterSettings::modeForType($userType);
        }

        $isChef = ((int) $userType) === 2;

        // ---- Waitlist contacts (leads) ----
        // Chef "active"/"active_pending" modes exclude waitlist leads entirely.
        $includeWaitlist = !($isChef && in_array($mode, ['active', 'active_pending'], true));

        $waitlistContacts = collect([]);
        if ($includeWaitlist) {
            $waitlistQuery = Waitlist::where('user_type', $userType);
            if (!$isChef && $mode === 'service_area') {
                $waitlistQuery->whereIn('zip', $this->serviceAreaZips());
            }
            $waitlistContacts = $waitlistQuery
                ->select('email', 'first_name')
                ->get()
                ->map(function ($w) {
                    return [
                        'email' => strtolower(trim((string) $w->email)),
                        'first_name' => $w->first_name,
                        'last_name' => null, // waitlist has no last name
                        'source' => 'waitlist',
                    ];
                });
        }

        // ---- App users ----
        $appQuery = app(Listener::class)->where('user_type', $userType);

        if ($isChef) {
            // Chef status via verified/is_pending.
            if ($mode === 'active') {
                $appQuery->where('verified', 1)->where('is_pending', 0);
            } else {
                // active_pending + all: approved or mid-application, never rejected/suspended.
                $appQuery->whereIn('verified', [0, 1]);
            }
        } else {
            $appQuery->whereIn('verified', [0, 1]); // pending or active customer
            if ($mode === 'service_area') {
                $appQuery->whereIn('zip', $this->serviceAreaZips());
            }
        }

        $appContacts = $appQuery
            ->select('email', 'first_name', 'last_name')
            ->get()
            ->map(function ($u) {
                return [
                    'email' => strtolower(trim((string) $u->email)),
                    'first_name' => $u->first_name,
                    'last_name' => $u->last_name,
                    'source' => 'app',
                ];
            });

        $merged = $appContacts->concat($waitlistContacts)
            ->filter(function ($r) {
                return filter_var($r['email'], FILTER_VALIDATE_EMAIL) !== false;
            })
            ->unique('email');

        if ($excludeUnsubscribed) {
            $unsubscribed = array_flip($this->unsubscribedEmails());
            $merged = $merged->reject(function ($r) use ($unsubscribed) {
                return isset($unsubscribed[$r['email']]);
            });
        }

        return $merged->values();
    }

    /**
     * Who an edition is actually delivered to. In production that is the real
     * audience. Everywhere else it is ONLY the NEWSLETTER_TEST_RECIPIENTS
     * addresses (nobody when unset), so a staging database that holds real
     * chef or customer emails can never be mailed by a test run.
     */
    public function sendAudience($userType): Collection
    {
        if (!$this->isTestMode()) {
            return $this->recipients($userType);
        }

        $unsubscribed = array_flip($this->unsubscribedEmails());
        $known = $this->recipients($userType, 'all', false)->keyBy('email');

        return collect($this->testRecipients())
            ->reject(function ($email) use ($unsubscribed) {
                return isset($unsubscribed[$email]);
            })
            ->map(function ($email) use ($known) {
                return [
                    'email' => $email,
                    'first_name' => $known[$email]['first_name'] ?? ucfirst(strtok($email, '@')),
                    'last_name' => $known[$email]['last_name'] ?? null,
                    'source' => 'test',
                ];
            })
            ->values();
    }

    public function isTestMode(): bool
    {
        return !app()->environment('production');
    }

    /**
     * NEWSLETTER_TEST_RECIPIENTS, comma separated. Ignored in production.
     */
    public function testRecipients(): array
    {
        return collect(explode(',', (string) config('app.newsletter_test_recipients')))
            ->map(function ($email) {
                return $this->normalizeEmail($email);
            })
            ->filter(function ($email) {
                return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
            })
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Parsed list of served zip codes from tbl_zipcodes (the Service Areas
     * setting). Returns [] if unset — callers should treat that as "no match".
     */
    public function serviceAreaZips(): array
    {
        $record = app(Zipcodes::class)->first();
        if (!$record || !$record->zipcodes) {
            return [];
        }
        return array_values(array_filter(array_map('trim', explode(',', $record->zipcodes))));
    }

    // ------------------------------------------------------------------
    // Unsubscribe
    // ------------------------------------------------------------------

    public function unsubscribedEmails(): array
    {
        return NewsletterUnsubscribe::pluck('email')->map(function ($e) {
            return strtolower($e);
        })->all();
    }

    public function isUnsubscribed(string $email): bool
    {
        return NewsletterUnsubscribe::where('email', $this->normalizeEmail($email))->exists();
    }

    public function unsubscribe(string $email, $userType = null, string $source = 'link', $editionId = null): void
    {
        NewsletterUnsubscribe::firstOrCreate(
            ['email' => $this->normalizeEmail($email)],
            ['user_type' => $userType, 'source' => $source, 'edition_id' => $editionId]
        );
    }

    public function resubscribe(string $email): void
    {
        NewsletterUnsubscribe::where('email', $this->normalizeEmail($email))->delete();
    }

    public function unsubscribeToken(string $email): string
    {
        return hash_hmac('sha256', 'newsletter-unsubscribe|' . $this->normalizeEmail($email), $this->secret());
    }

    public function verifyUnsubscribeToken($email, $token): bool
    {
        if (!is_string($email) || !is_string($token) || $email === '' || $token === '') {
            return false;
        }
        return hash_equals($this->unsubscribeToken($email), $token);
    }

    public function unsubscribeUrl(string $email): string
    {
        return $this->publicBaseUrl() . '/newsletter/unsubscribe?' . http_build_query([
            'e' => $this->normalizeEmail($email),
            't' => $this->unsubscribeToken($email),
        ]);
    }

    // Lets Dayne unschedule an edition straight from the preview email.
    public function pauseToken(NewsletterEdition $edition): string
    {
        return hash_hmac('sha256', 'newsletter-pause|' . $edition->id, $this->secret());
    }

    public function verifyPauseToken(NewsletterEdition $edition, $token): bool
    {
        return is_string($token) && $token !== '' && hash_equals($this->pauseToken($edition), $token);
    }

    public function pauseUrl(NewsletterEdition $edition): string
    {
        return $this->publicBaseUrl() . '/newsletter/pause/' . $edition->id . '?t=' . $this->pauseToken($edition);
    }

    public function adminEditUrl(NewsletterEdition $edition): string
    {
        return $this->publicBaseUrl() . '/admin-new/newsletters/' . $edition->id;
    }

    // ------------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------------

    public function previewEmail(): string
    {
        return config('app.newsletter_preview_email') ?: 'dayne@taist.app';
    }

    public function autosendEnabled(): bool
    {
        return (bool) config('app.newsletter_autosend');
    }

    public function mailingAddressConfigured(): bool
    {
        return trim((string) config('app.newsletter_mailing_address')) !== '';
    }

    public function mailingAddress(): string
    {
        $configured = trim((string) config('app.newsletter_mailing_address'));
        return $configured !== '' ? $configured : self::DEFAULT_MAILING_ADDRESS;
    }

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    /**
     * Render an edition for one recipient.
     *
     * @param  array|null  $banner  Preview/test banner: ['title' => ..., 'lines' => [...], 'links' => [[label, url], ...]]
     * @return array ['subject' => string, 'html' => string, 'text' => string]
     */
    public function render(NewsletterEdition $edition, ?string $firstName, string $email, ?array $banner = null): array
    {
        $name = $this->displayFirstName($edition->user_type, $firstName);
        $p = function ($value) use ($name) {
            return str_replace('{first_name}', $name, (string) $value);
        };

        $items = collect($edition->items ?? [])
            ->filter(function ($item) {
                return trim((string) ($item['title'] ?? '')) !== '' || trim((string) ($item['body'] ?? '')) !== '';
            })
            ->take(NewsletterEdition::MAX_ITEMS)
            ->map(function ($item) use ($p) {
                return [
                    'title' => $p(trim((string) ($item['title'] ?? ''))),
                    'body' => $p(trim((string) ($item['body'] ?? ''))),
                ];
            })
            ->values()
            ->all();

        $data = [
            'subject' => $p($edition->subject),
            'preheader' => $p($edition->preheader),
            'eyebrow' => $p($edition->eyebrow),
            'headline' => $p($edition->headline),
            'intro' => $this->paragraphs($p($edition->intro)),
            'calloutTitle' => $p($edition->callout_title),
            'calloutSubtitle' => $p($edition->callout_subtitle),
            'itemsHeading' => $p($edition->items_heading),
            'items' => $items,
            'closing' => $this->paragraphs($p($edition->closing)),
            'signoff' => $p($edition->signoff),
            'ctaLabel' => $p($edition->cta_label),
            'ctaUrl' => $this->safeUrl($edition->cta_url),
            'showPlayLink' => $this->safeUrl($edition->cta_url) === self::APP_STORE_URL,
            'playStoreUrl' => self::PLAY_STORE_URL,
            'isChef' => $edition->user_type === 2,
            'unsubscribeUrl' => $this->unsubscribeUrl($email),
            'mailingAddress' => $this->mailingAddress(),
            'banner' => $banner,
        ];

        return [
            'subject' => $data['subject'],
            'html' => view('emails.newsletter', $data)->render(),
            'text' => $this->renderText($data),
        ];
    }

    /**
     * Problems worth surfacing before an edition goes out. Shown in the admin
     * editor and in the preview email.
     */
    public function warnings(NewsletterEdition $edition): array
    {
        $warnings = [];

        if (trim((string) $edition->subject) === '') {
            $warnings[] = 'The subject line is empty.';
        }

        $hasItems = collect($edition->items ?? [])->contains(function ($item) {
            return trim((string) ($item['title'] ?? '')) !== '';
        });
        if (!$hasItems && trim((string) $edition->intro) === '') {
            $warnings[] = 'This edition has no intro and no update items.';
        }

        foreach ($this->mentionedDiscountCodes($edition) as $code) {
            $problem = $this->discountCodeProblem($code);
            if ($problem !== null) {
                $warnings[] = $problem;
            }
        }

        if ($this->isTestMode()) {
            $test = $this->testRecipients();
            $warnings[] = $test
                ? 'Test mode (' . app()->environment() . '): sends go only to ' . implode(', ', $test) . ', not the real audience.'
                : 'Test mode (' . app()->environment() . '): NEWSLETTER_TEST_RECIPIENTS is empty, so a scheduled send reaches nobody. Test sends still work.';
        }

        if (!$this->mailingAddressConfigured()) {
            $warnings[] = 'NEWSLETTER_MAILING_ADDRESS is not set in Railway, so the footer shows "'
                . self::DEFAULT_MAILING_ADDRESS . '". CAN-SPAM requires a full postal address (street address or PO box).';
        }

        return $warnings;
    }

    /**
     * Codes written as "code XYZ" / "promo code XYZ" anywhere in the edition.
     */
    public function mentionedDiscountCodes(NewsletterEdition $edition): array
    {
        $text = implode("\n", array_merge(
            [$edition->subject, $edition->preheader, $edition->headline, $edition->intro,
             $edition->callout_title, $edition->callout_subtitle, $edition->closing],
            collect($edition->items ?? [])->flatMap(function ($item) {
                return [(string) ($item['title'] ?? ''), (string) ($item['body'] ?? '')];
            })->all()
        ));

        preg_match_all('/\bcode\s+([A-Z0-9][A-Z0-9_-]{2,})\b/i', $text, $matches);

        return collect($matches[1] ?? [])
            ->map(function ($c) {
                return strtoupper($c);
            })
            // Ignore ordinary words that happen to follow "code" ("code for", "code at").
            ->filter(function ($c) {
                return preg_match('/[0-9]/', $c) || strlen($c) >= 5;
            })
            ->unique()
            ->values()
            ->all();
    }

    private function discountCodeProblem(string $code): ?string
    {
        try {
            $record = DiscountCodes::whereRaw('UPPER(code) = ?', [$code])->first();
        } catch (\Throwable $e) {
            return null; // table unavailable (e.g. tests) — nothing to check against
        }

        if (!$record) {
            return "Discount code {$code} is mentioned but does not exist in Discount Codes.";
        }

        $validity = $record->isValid();
        if (!$validity['valid']) {
            return "Discount code {$code} will not work: " . ($validity['reason'] ?? 'invalid') . '.';
        }

        return null;
    }

    public function displayFirstName($userType, ?string $firstName): string
    {
        $name = trim((string) $firstName);
        // Some chefs registered with "Chef" as part of their first name.
        if ((int) $userType === 2) {
            $name = trim(preg_replace('/^chef\s+/i', '', $name));
        }
        return $name !== '' ? $name : 'there';
    }

    private function paragraphs(?string $text): array
    {
        $text = trim(str_replace("\r\n", "\n", (string) $text));
        if ($text === '') {
            return [];
        }
        return array_values(array_filter(array_map('trim', preg_split("/\n\s*\n/", $text))));
    }

    private function safeUrl($url): ?string
    {
        $url = trim((string) $url);
        if ($url === '' || !preg_match('#^(https?://|mailto:)#i', $url)) {
            return null;
        }
        return $url;
    }

    private function renderText(array $d): string
    {
        $lines = [];
        if ($d['banner']) {
            $lines[] = '*** ' . $d['banner']['title'] . ' ***';
            foreach ($d['banner']['lines'] ?? [] as $line) {
                $lines[] = $line;
            }
            foreach ($d['banner']['links'] ?? [] as [$label, $url]) {
                $lines[] = "{$label}: {$url}";
            }
            $lines[] = '';
        }
        if ($d['headline']) {
            $lines[] = $d['headline'];
            $lines[] = '';
        }
        foreach ($d['intro'] as $para) {
            $lines[] = $para;
            $lines[] = '';
        }
        if ($d['calloutTitle']) {
            $lines[] = $d['calloutTitle'] . ($d['calloutSubtitle'] ? ' - ' . $d['calloutSubtitle'] : '');
            $lines[] = '';
        }
        if ($d['itemsHeading']) {
            $lines[] = $d['itemsHeading'];
        }
        foreach ($d['items'] as $i => $item) {
            $lines[] = ($i + 1) . '. ' . trim($item['title'] . ' ' . $item['body']);
        }
        if ($d['items']) {
            $lines[] = '';
        }
        foreach ($d['closing'] as $para) {
            $lines[] = $para;
            $lines[] = '';
        }
        if ($d['signoff']) {
            $lines[] = $d['signoff'];
            $lines[] = '';
        }
        if ($d['ctaLabel'] && $d['ctaUrl']) {
            $lines[] = "{$d['ctaLabel']}: {$d['ctaUrl']}";
            $lines[] = '';
        }
        $lines[] = '--';
        $lines[] = $d['mailingAddress'];
        $lines[] = 'Unsubscribe: ' . $d['unsubscribeUrl'];

        return implode("\n", $lines);
    }

    // ------------------------------------------------------------------
    // Delivery
    // ------------------------------------------------------------------

    /**
     * Send up to BATCH_SIZE messages in one Resend call.
     *
     * @param  array  $messages  each ['to' => email, 'subject', 'html', 'text', 'headers' => []]
     * @return array  aligned with $messages: ['ok' => bool, 'id' => ?string, 'error' => ?string]
     */
    public function deliver(array $messages, ?string $idempotencyKey = null): array
    {
        $failAll = function ($error) use ($messages) {
            return array_map(function () use ($error) {
                return ['ok' => false, 'id' => null, 'error' => $error];
            }, $messages);
        };

        $apiKey = trim((string) env('RESEND_API_KEY'));
        if ($apiKey === '') {
            return $failAll('RESEND_API_KEY is not set');
        }

        $payload = array_map(function ($m) {
            $message = [
                'from' => self::FROM,
                'to' => [$m['to']],
                'reply_to' => self::REPLY_TO,
                'subject' => $m['subject'],
                'html' => $m['html'],
                'text' => $m['text'],
            ];
            if (!empty($m['headers'])) {
                $message['headers'] = $m['headers'];
            }
            return $message;
        }, $messages);

        try {
            $request = Http::withToken($apiKey)->timeout(60)->acceptJson();
            if ($idempotencyKey) {
                $request = $request->withHeaders(['Idempotency-Key' => $idempotencyKey]);
            }
            $response = $request->post('https://api.resend.com/emails/batch', $payload);
        } catch (\Throwable $e) {
            Log::error('Newsletter delivery error: ' . $e->getMessage());
            return $failAll(substr($e->getMessage(), 0, 480));
        }

        if (!$response->successful()) {
            $error = 'HTTP ' . $response->status() . ': ' . substr($response->body(), 0, 400);
            Log::error('Newsletter delivery failed: ' . $error);
            return $failAll($error);
        }

        $ids = $response->json('data') ?? [];
        $results = [];
        foreach ($messages as $i => $m) {
            $results[] = ['ok' => true, 'id' => $ids[$i]['id'] ?? null, 'error' => null];
        }
        return $results;
    }

    /**
     * Email the preview to Dayne (or a test copy to any address). Rendered
     * exactly as the first real recipient would see it, plus a banner with
     * the schedule, audience size, and edit/pause links.
     */
    public function sendPreview(NewsletterEdition $edition, ?string $to = null, bool $isTest = false): array
    {
        $to = $to ?: $this->previewEmail();
        $recipients = $this->sendAudience($edition->user_type);
        // Render as a real audience member would see it, even in test mode.
        $sample = $this->recipients($edition->user_type)->first() ?: $recipients->first();

        $when = $edition->send_at
            ? $edition->send_at->copy()->setTimezone(NewsletterSettings::TIMEZONE)->format('l, M j \a\t g:i A') . ' ET'
            : 'not scheduled yet';
        $audience = $recipients->count() . ' ' . ($edition->user_type === 2 ? 'chef' : 'customer')
            . ($recipients->count() === 1 ? '' : 's');

        $lines = [
            $edition->displayName() . ' goes to ' . $audience . ' on ' . $when . '.',
            'Shown as ' . ($sample ? $this->displayFirstName($edition->user_type, $sample['first_name']) : 'a sample recipient')
                . ' would see it.',
        ];
        if (!$isTest && $edition->status === NewsletterEdition::STATUS_SCHEDULED) {
            $lines[] = 'No action needed if it looks good. It sends automatically.';
        }
        foreach ($this->warnings($edition) as $warning) {
            $lines[] = 'Warning: ' . $warning;
        }

        $links = [['Edit in admin', $this->adminEditUrl($edition)]];
        if ($edition->status === NewsletterEdition::STATUS_SCHEDULED) {
            $links[] = ['Pause this send', $this->pauseUrl($edition)];
        }

        $banner = [
            'title' => $isTest ? 'Test send' : 'Newsletter preview: sends in ' . NewsletterSettings::noticeLabel(),
            'lines' => $lines,
            'links' => $links,
        ];

        $rendered = $this->render($edition, $sample['first_name'] ?? null, $to, $banner);
        $prefix = $isTest ? '[Test] ' : '[Preview, sends ' . ($edition->send_at
            ? $edition->send_at->copy()->setTimezone(NewsletterSettings::TIMEZONE)->format('D M j')
            : 'unscheduled') . '] ';

        return $this->deliver([[
            'to' => $to,
            'subject' => $prefix . $rendered['subject'],
            'html' => $rendered['html'],
            'text' => $rendered['text'],
        ]])[0];
    }

    // ------------------------------------------------------------------
    // Automation (newsletter:run)
    // ------------------------------------------------------------------

    /**
     * Earliest allowed send time for an edition scheduled right now.
     */
    public function earliestSendAt(?Carbon $now = null): Carbon
    {
        return ($now ?: Carbon::now())->copy()->addMinutes(NewsletterSettings::noticeMinutes());
    }

    /**
     * Next send slot at the audience's send time (Eastern) on or after
     * $target, and never inside the notice window.
     */
    public function nextSlot($userType, Carbon $target, Carbon $now): Carbon
    {
        $sendTime = NewsletterSettings::automationFor($userType)['send_time'];
        [$h, $m] = array_map('intval', explode(':', $sendTime));

        $earliest = $this->earliestSendAt($now)->addMinutes(15);
        $base = $target->greaterThan($earliest) ? $target : $earliest;

        $slot = $base->copy()->setTimezone(NewsletterSettings::TIMEZONE)->setTime($h, $m);
        if ($slot->lessThan($base)) {
            $slot->addDay();
        }

        return $slot->setTimezone('UTC');
    }

    /**
     * Draft (and schedule, when there is content) the next regular edition for
     * every audience with auto-schedule on whose last regular edition was sent
     * and nothing newer is in the pipeline.
     *
     * @return NewsletterEdition[] created editions
     */
    public function planNextEditions(Carbon $now, bool $dryRun = false): array
    {
        $created = [];

        foreach ([1, 2] as $userType) {
            $automation = NewsletterSettings::automationFor($userType);
            if (!$automation['auto_schedule']) {
                continue;
            }

            $regular = NewsletterEdition::where('user_type', $userType)->where('kind', 'regular');

            $open = (clone $regular)->whereIn('status', [
                NewsletterEdition::STATUS_DRAFT,
                NewsletterEdition::STATUS_SCHEDULED,
                NewsletterEdition::STATUS_SENDING,
            ])->exists();
            if ($open) {
                continue;
            }

            // The chain only starts once an admin has sent the first edition.
            $last = (clone $regular)->where('status', NewsletterEdition::STATUS_SENT)
                ->orderByDesc('sent_at')->first();
            if (!$last) {
                continue;
            }

            $sendAt = $this->nextSlot(
                $userType,
                $last->sent_at->copy()->addDays($automation['cadence_days']),
                $now
            );

            $backlog = NewsletterBacklogItem::where('user_type', $userType)->available()
                ->orderBy('sort')->orderBy('id')
                ->limit(NewsletterEdition::MAX_ITEMS)->get();

            $number = ((int) (clone $regular)->max('edition_number')) + 1;

            if ($dryRun) {
                $created[] = new NewsletterEdition([
                    'user_type' => $userType,
                    'edition_number' => $number,
                    'status' => $backlog->isEmpty() ? 'draft' : 'scheduled',
                    'send_at' => $sendAt,
                ]);
                continue;
            }

            $edition = NewsletterEdition::create(array_merge(
                $this->defaultContent($userType, 'regular', $number),
                [
                    'user_type' => $userType,
                    'kind' => 'regular',
                    'edition_number' => $number,
                    'status' => $backlog->isEmpty() ? NewsletterEdition::STATUS_DRAFT : NewsletterEdition::STATUS_SCHEDULED,
                    'items' => $backlog->map(function ($b) {
                        return ['title' => $b->title, 'body' => (string) $b->body, 'backlog_id' => $b->id];
                    })->values()->all(),
                    'preheader' => $backlog->isEmpty() ? null : $backlog->first()->title,
                    'send_at' => $sendAt,
                    'created_by' => 'auto',
                    'notes' => $backlog->isEmpty()
                        ? 'Auto-drafted with an empty backlog, so it is NOT scheduled. Add updates and schedule it.'
                        : 'Auto-drafted from the backlog.',
                ]
            ));

            if ($backlog->isEmpty()) {
                $this->notifyEmptyBacklog($edition);
            }

            $created[] = $edition;
        }

        return $created;
    }

    /**
     * Email previews for scheduled editions entering the notice window.
     *
     * @return int previews sent
     */
    public function sendDuePreviews(Carbon $now, bool $dryRun = false): int
    {
        $due = NewsletterEdition::where('status', NewsletterEdition::STATUS_SCHEDULED)
            ->whereNull('preview_sent_at')
            ->whereNotNull('send_at')
            ->where('send_at', '<=', $now->copy()->addMinutes(NewsletterSettings::noticeMinutes()))
            ->orderBy('send_at')
            ->get();

        $sent = 0;
        foreach ($due as $edition) {
            if ($dryRun) {
                $sent++;
                continue;
            }
            $result = $this->sendPreview($edition);
            if ($result['ok']) {
                // The send is held until the full notice window after this moment.
                $edition->update(['preview_sent_at' => $now]);
                $sent++;
            } else {
                Log::error("Newsletter preview for edition {$edition->id} failed: {$result['error']}");
            }
        }

        return $sent;
    }

    /**
     * Send every edition whose time has come (and resume any interrupted send).
     *
     * @return NewsletterEdition[] editions processed
     */
    public function sendDueEditions(Carbon $now, bool $dryRun = false): array
    {
        $candidates = NewsletterEdition::whereIn('status', [
            NewsletterEdition::STATUS_SCHEDULED,
            NewsletterEdition::STATUS_SENDING,
        ])->whereNotNull('preview_sent_at')->get();

        $processed = [];
        foreach ($candidates as $edition) {
            $isResume = $edition->status === NewsletterEdition::STATUS_SENDING;
            $sendAt = $edition->effectiveSendAt();
            if (!$isResume && (!$sendAt || $sendAt->greaterThan($now))) {
                continue;
            }
            if ($dryRun) {
                $processed[] = $edition;
                continue;
            }
            if (!$isResume) {
                // Claim it; a concurrent run that loses the race skips it.
                $claimed = NewsletterEdition::where('id', $edition->id)
                    ->where('status', NewsletterEdition::STATUS_SCHEDULED)
                    ->update(['status' => NewsletterEdition::STATUS_SENDING]);
                if ($claimed !== 1) {
                    continue;
                }
                $edition->refresh();
            }
            $this->sendEdition($edition, $now);
            $processed[] = $edition->fresh();
        }

        return $processed;
    }

    public function sendEdition(NewsletterEdition $edition, Carbon $now): void
    {
        // Snapshot the audience once so a resumed send never adds or repeats anyone.
        if (!NewsletterSend::where('edition_id', $edition->id)->exists()) {
            $rows = $this->sendAudience($edition->user_type)->map(function ($r) use ($edition, $now) {
                return [
                    'edition_id' => $edition->id,
                    'email' => $r['email'],
                    'first_name' => $r['first_name'],
                    'status' => 'pending',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            })->all();
            foreach (array_chunk($rows, 500) as $chunk) {
                NewsletterSend::insertOrIgnore($chunk);
            }
            $edition->update(['recipient_count' => count($rows)]);
        }

        while (true) {
            $batch = NewsletterSend::where('edition_id', $edition->id)
                ->where('status', 'pending')
                ->orderBy('id')
                ->limit(self::BATCH_SIZE)
                ->get();
            if ($batch->isEmpty()) {
                break;
            }

            $messages = $batch->map(function ($row) use ($edition) {
                $rendered = $this->render($edition, $row->first_name, $row->email);
                $unsubscribeUrl = $this->unsubscribeUrl($row->email);
                return [
                    'to' => $row->email,
                    'subject' => $rendered['subject'],
                    'html' => $rendered['html'],
                    'text' => $rendered['text'],
                    'headers' => [
                        'List-Unsubscribe' => '<' . $unsubscribeUrl . '>',
                        'List-Unsubscribe-Post' => 'List-Unsubscribe=One-Click',
                    ],
                ];
            })->all();

            $key = 'newsletter-' . $edition->id . '-' . $batch->first()->id . '-' . $batch->last()->id;
            $results = $this->deliver($messages, $key);

            foreach ($batch->values() as $i => $row) {
                $result = $results[$i];
                $row->update([
                    'status' => $result['ok'] ? 'sent' : 'failed',
                    'provider_id' => $result['id'],
                    'error' => $result['error'] ? substr($result['error'], 0, 500) : null,
                ]);
            }

            // Resend's default rate limit is 2 requests/sec.
            if (!app()->runningUnitTests()) {
                usleep(600000);
            }
        }

        $sentCount = NewsletterSend::where('edition_id', $edition->id)->where('status', 'sent')->count();
        $failedCount = NewsletterSend::where('edition_id', $edition->id)->where('status', 'failed')->count();

        $edition->update([
            'status' => NewsletterEdition::STATUS_SENT,
            'sent_at' => $now,
            'sent_count' => $sentCount,
            'failed_count' => $failedCount,
        ]);

        // Mark featured backlog items used so they never repeat.
        $backlogIds = collect($edition->items ?? [])->pluck('backlog_id')->filter()->all();
        if ($backlogIds) {
            NewsletterBacklogItem::whereIn('id', $backlogIds)->whereNull('used_at')->update([
                'used_at' => $now,
                'used_in_edition_id' => $edition->id,
            ]);
        }

        $this->notifySent($edition->fresh());
    }

    /**
     * Starting content for a new edition. Auto-drafts and "New edition" in
     * the admin panel both begin here.
     */
    public function defaultContent(int $userType, string $kind, ?int $number): array
    {
        $isChef = $userType === 2;

        if ($kind === 'special') {
            return [
                'subject' => $isChef ? 'Chef {first_name}, ' : '{first_name}, ',
                'eyebrow' => "You're Invited",
                'headline' => $isChef ? 'Hey Chef {first_name}, ' : 'Hey {first_name}, ',
                'intro' => '',
                'items_heading' => null,
                'closing' => 'Just hit reply with any questions, we read every one.',
                'signoff' => '- Dayne & Daryl',
                'cta_label' => $isChef ? 'Open Taist' : 'Order on Taist',
                'cta_url' => self::APP_STORE_URL,
            ];
        }

        if ($isChef) {
            return [
                'subject' => 'Taist Digest' . ($number ? " #{$number}" : '') . ": what's new for you, Chef {first_name}",
                'eyebrow' => "What's New",
                'headline' => "Hey Chef {first_name}, here's what's new.",
                'intro' => "Here's what we've shipped on your side of the app since our last update:",
                'items_heading' => null,
                'closing' => 'Questions, or something you need to get cooking? Just hit reply, we read every one.',
                'signoff' => '- Dayne & Daryl',
                'cta_label' => 'Open Taist',
                'cta_url' => self::APP_STORE_URL,
            ];
        }

        return [
            'subject' => "What's new on Taist, {first_name}",
            'eyebrow' => "What's New",
            'headline' => "Hey {first_name}, here's what's new on Taist.",
            'intro' => "Here's what we've been cooking up since our last update:",
            'items_heading' => null,
            'closing' => "Got a question, or a chef you'd love to see? Just hit reply, we read every one.",
            'signoff' => '- Dayne & Daryl',
            'cta_label' => 'Order on Taist',
            'cta_url' => self::APP_STORE_URL,
        ];
    }

    private function notifyEmptyBacklog(NewsletterEdition $edition): void
    {
        $name = e($edition->displayName());
        $url = e($this->adminEditUrl($edition));
        $html = "<p>{$name} was auto-drafted, but the " . e($edition->audienceLabel())
            . " backlog is empty, so it is <strong>not scheduled</strong> and will not go out on its own.</p>"
            . "<p>Add updates to it and schedule it here: <a href=\"{$url}\">{$url}</a></p>";

        $this->deliverNotice("Newsletter needs content: {$edition->displayName()}", $html);
    }

    private function notifySent(NewsletterEdition $edition): void
    {
        $name = e($edition->displayName());
        $html = "<p>{$name} (\"" . e($this->displaySubject($edition)) . "\") was sent to "
            . "{$edition->sent_count} of {$edition->recipient_count} recipients.</p>";
        if ($edition->failed_count > 0) {
            $html .= "<p><strong>{$edition->failed_count} failed.</strong> Check the Railway logs for Resend errors.</p>";
        }

        $this->deliverNotice("Newsletter sent: {$edition->displayName()}", $html);
    }

    private function displaySubject(NewsletterEdition $edition): string
    {
        return str_replace('{first_name}', '[first name]', (string) $edition->subject);
    }

    private function deliverNotice(string $subject, string $html): void
    {
        $result = $this->deliver([[
            'to' => $this->previewEmail(),
            'subject' => $subject,
            'html' => $html,
            'text' => trim(strip_tags(str_replace(['</p>', '<br>'], "\n", $html))),
        ]])[0];

        if (!$result['ok']) {
            Log::error("Newsletter notice \"{$subject}\" failed: {$result['error']}");
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    public function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private function secret(): string
    {
        $key = (string) config('app.key');
        if ($key === '') {
            throw new \RuntimeException('APP_KEY must be set to sign newsletter links.');
        }
        return $key;
    }

    /**
     * Public host for links in emails. An artisan run has no request context,
     * so an unset or localhost APP_URL falls back to the live API host.
     */
    public function publicBaseUrl(): string
    {
        $base = rtrim((string) config('app.url'), '/');
        if ($base === '' || strpos($base, 'localhost') !== false || strpos($base, '127.0.0.1') !== false) {
            $base = 'https://api.taist.app';
        }
        return $base;
    }
}
