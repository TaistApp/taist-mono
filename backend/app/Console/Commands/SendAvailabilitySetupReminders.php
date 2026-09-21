<?php

namespace App\Console\Commands;

use App\Helpers\TimezoneHelper;
use App\Listener;
use App\Models\Availabilities;
use App\Notification;
use App\Services\TwilioService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Messaging\CloudMessage;
use Exception;

/**
 * Nudge approved chefs who never set weekly availability.
 *
 * Setting hours is the last onboarding step and the one with no reminder of
 * its own: a chef approved by an admin gets the "Chef Account Activated" push
 * and then nothing, so a chef who never opens the availability sheet stays
 * invisible to customers indefinitely with no prompt to finish. Three
 * approved chefs were sitting in exactly that state in September 2026.
 *
 * Send history lives in the `notifications` table under the
 * `availability_setup` category, so the throttle and the lifetime cap need no
 * extra columns and the chef can see the nudge in their in-app inbox.
 */
class SendAvailabilitySetupReminders extends Command
{
    protected $signature = 'chef:send-availability-reminders
                            {--dry-run : List who would be reminded without sending}
                            {--chef= : Only consider this chef id}
                            {--force : Ignore the throttle, the lifetime cap and the local-hours window}
                            {--sms : Also send an SMS fallback (push alone is unreliable for chefs who never granted permission)}';

    protected $description = 'Nudge approved chefs who have never set weekly availability — the last onboarding step';

    /** Notification category used for this nudge's send history. */
    public const CATEGORY = 'availability_setup';

    /** Minimum gap between reminders per chef. */
    public const THROTTLE_SECONDS = 259200; // 72 hours

    /** Stop after this many lifetime reminders — a chef who ignores four is not persuaded by a fifth. */
    public const MAX_REMINDERS = 4;

    /** Local-time window the nudge is allowed to land in (end is exclusive). */
    public const WINDOW_START_HOUR = 10;
    public const WINDOW_END_HOUR = 18;

    /** The seven `*_start` columns on tbl_availabilities. Note the legacy "saterday" spelling. */
    public const DAY_START_COLUMNS = [
        'monday_start', 'tuesday_start', 'wednesday_start', 'thursday_start',
        'friday_start', 'saterday_start', 'sunday_start',
    ];

    /**
     * Whether a chef is an approved, active chef account.
     *
     * Pending and unverified chefs are still in review, and a paused chef has
     * deliberately taken themselves offline — neither wants this nudge.
     *
     * @param object|array $chef row or model with the user flags
     */
    public static function isActiveChef($chef): bool
    {
        $get = static function ($key) use ($chef) {
            return is_array($chef) ? ($chef[$key] ?? null) : ($chef->$key ?? null);
        };

        return (int) $get('user_type') === 2
            && (int) $get('verified') === 1
            && (int) $get('is_pending') === 0
            && (int) $get('is_paused') === 0;
    }

    /**
     * Whether a chef has no usable weekly availability.
     *
     * Two states count as "not set": no row at all (never opened the sheet),
     * and a row whose every day start is blank (opened it, saved nothing).
     *
     * @param object|array|null $availability tbl_availabilities row, or null
     */
    public static function hasNoAvailability($availability): bool
    {
        if ($availability === null) {
            return true;
        }

        foreach (self::DAY_START_COLUMNS as $column) {
            $value = is_array($availability) ? ($availability[$column] ?? null) : ($availability->$column ?? null);
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * Whether a chef reminded at $lastSentAt is still inside the throttle window.
     *
     * @param string|null $lastSentAt datetime string, or null if never reminded
     */
    public static function shouldThrottle($lastSentAt, ?int $now = null): bool
    {
        if (empty($lastSentAt)) {
            return false;
        }

        return (($now ?? time()) - strtotime($lastSentAt)) < self::THROTTLE_SECONDS;
    }

    /**
     * Whether the chef's local time is inside the allowed send window.
     *
     * Without this the every-15-minutes schedule would happily push at 4am.
     */
    public static function isInsideLocalWindow(?string $state, ?Carbon $nowUtc = null): bool
    {
        $timezone = TimezoneHelper::getTimezoneForState($state);
        $localHour = (int) ($nowUtc ? $nowUtc->copy() : Carbon::now('UTC'))
            ->setTimezone($timezone)
            ->format('G');

        return $localHour >= self::WINDOW_START_HOUR && $localHour < self::WINDOW_END_HOUR;
    }

    public function handle(TwilioService $twilioService)
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $withSms = (bool) $this->option('sms');
        $chefId = $this->option('chef');
        $now = time();
        $nowUtc = Carbon::now('UTC');

        $query = app(Listener::class)->where('user_type', 2);
        if ($chefId) {
            $query->where('id', (int) $chefId);
        }

        $sent = 0;
        $skipped = 0;

        foreach ($query->get() as $chef) {
            if (!self::isActiveChef($chef)) {
                $skipped++;
                continue;
            }

            $availability = app(Availabilities::class)->where('user_id', $chef->id)->first();
            if (!self::hasNoAvailability($availability)) {
                $skipped++;
                continue;
            }

            $history = Notification::where('user_id', $chef->id)
                ->where('category', self::CATEGORY)
                ->orderBy('id', 'desc');
            $alreadySent = (clone $history)->count();
            $lastSentAt = (clone $history)->value('created_at');

            if (!$force) {
                if ($alreadySent >= self::MAX_REMINDERS) {
                    $this->line("skip #{$chef->id} {$chef->first_name}: already reminded {$alreadySent}x");
                    $skipped++;
                    continue;
                }
                if (self::shouldThrottle($lastSentAt, $now)) {
                    $this->line("skip #{$chef->id} {$chef->first_name}: reminded at {$lastSentAt}");
                    $skipped++;
                    continue;
                }
                if (!self::isInsideLocalWindow($chef->state, $nowUtc)) {
                    $skipped++;
                    continue;
                }
            }

            if ($dryRun) {
                $token = empty($chef->fcm_token) ? 'NO TOKEN' : 'has token';
                $this->info("would remind #{$chef->id} {$chef->first_name} {$chef->last_name} ({$token}, sent {$alreadySent}x)");
                $sent++;
                continue;
            }

            if ($this->remind($chef, $twilioService, $withSms)) {
                $sent++;
            } else {
                $skipped++;
            }
        }

        $verb = $dryRun ? 'would send' : 'sent';
        $this->info("Availability setup reminders {$verb}: {$sent}, skipped: {$skipped}.");

        return 0;
    }

    /**
     * Push (and optionally SMS) one chef, recording the send in `notifications`.
     */
    private function remind($chef, TwilioService $twilioService, bool $withSms): bool
    {
        $title = '⏰ One step left — set your hours';
        $body = "You're approved to cook on Taist! Customers can't book you until you set your weekly availability. Tap to add your hours — it takes a minute.";

        $delivered = false;

        if (!empty($chef->fcm_token)) {
            try {
                // Reuse the shipped `availability_confirmation` type: installed
                // app versions route it to the chef profile and auto-open the
                // GoLive sheet, which is exactly where hours are set. A new
                // type would need an app release before any tap went anywhere.
                $message = CloudMessage::withTarget('token', $chef->fcm_token)
                    ->withNotification(['title' => $title, 'body' => $body])
                    ->withData([
                        'type' => 'availability_confirmation',
                        'action' => 'confirm_availability',
                        'reason' => self::CATEGORY,
                        'role' => 'chef',
                        'chef_id' => (string) $chef->id,
                    ]);

                app('firebase.messaging')->send($message);
                $delivered = true;
                $this->info("pushed #{$chef->id} {$chef->first_name}");
            } catch (Exception $e) {
                Log::error('SendAvailabilitySetupReminders: push failed', [
                    'chef_id' => $chef->id,
                    'error' => $e->getMessage(),
                ]);
                $this->warn("push failed #{$chef->id}: {$e->getMessage()}");
            }
        } else {
            $this->warn("no fcm token for #{$chef->id} {$chef->first_name}");
        }

        if ($withSms && !empty($chef->phone)) {
            $result = $twilioService->sendSMS(
                $chef->phone,
                "Taist: you're approved to cook! One step left — open the app and set your weekly availability so customers can book you.",
                ['chef_id' => $chef->id, 'notification_type' => self::CATEGORY]
            );

            if (!empty($result['success'])) {
                $delivered = true;
                $this->info("texted #{$chef->id} {$chef->first_name}");
            } else {
                Log::error('SendAvailabilitySetupReminders: SMS failed', [
                    'chef_id' => $chef->id,
                    'error' => $result['error'] ?? 'unknown',
                ]);
                $this->warn("sms failed #{$chef->id}: " . ($result['error'] ?? 'unknown'));
            }
        }

        if (!$delivered) {
            return false;
        }

        // The inbox row doubles as the send log the throttle and cap read back,
        // so it is only written once something actually went out.
        Notification::create([
            'title' => $title,
            'body' => $body,
            'image' => $chef->photo ?: 'N/A',
            'fcm_token' => $chef->fcm_token ?: 'N/A',
            'user_id' => $chef->id,
            'navigation_id' => 0,
            'role' => 'chef',
            'category' => self::CATEGORY,
        ]);

        Log::info('Availability setup reminder sent', ['chef_id' => $chef->id]);

        return true;
    }
}
