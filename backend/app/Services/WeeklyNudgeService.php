<?php

namespace App\Services;

use App\Helpers\TimezoneHelper;
use App\Listener;
use App\Notification;
use App\Models\WeeklyNudgeLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Exception\Messaging\NotFound;
use Kreait\Firebase\Exception\Messaging\InvalidMessage;

class WeeklyNudgeService
{
    protected $firebaseMessaging;

    public function __construct($firebaseMessaging = null)
    {
        if ($firebaseMessaging) {
            $this->firebaseMessaging = $firebaseMessaging;
            return;
        }

        try {
            $this->firebaseMessaging = app('firebase.messaging');
        } catch (\Exception $e) {
            $this->firebaseMessaging = null;
            Log::warning('Firebase not configured: ' . $e->getMessage());
        }
    }

    public function sendWeeklyNudges(bool $dryRun = false, ?Carbon $nowUtc = null): array
    {
        $stats = [
            'scanned' => 0,
            'eligible_window' => 0,
            'sent' => 0,
            'skipped_disabled' => 0,
            'skipped_missing_token' => 0,
            'skipped_window' => 0,
            'skipped_slot' => 0,
            'skipped_cap' => 0,
            'skipped_duplicate_slot' => 0,
            'errors' => 0,
        ];

        $rawEnabled = env('WEEKLY_NUDGE_ENABLED');
        $enabled = ($rawEnabled === null || $rawEnabled === '')
            ? true
            : filter_var($rawEnabled, FILTER_VALIDATE_BOOLEAN);
        if (!$enabled) {
            $stats['skipped_disabled'] = 1;
            return $stats;
        }

        $messages = $this->getMessages();
        if (empty($messages)) {
            Log::warning('No weekly nudge messages configured, skipping run.');
            return $stats;
        }

        $maxPerWeek = max((int) env('WEEKLY_NUDGE_MAX_PER_WEEK', 2), 1);
        $startHour = (int) env('WEEKLY_NUDGE_START_HOUR', 10);
        $endHour = (int) env('WEEKLY_NUDGE_END_HOUR', 16); // exclusive upper bound
        $weekdaySet = $this->getWeekdaySet();
        $referenceUtc = $nowUtc ? $nowUtc->copy() : Carbon::now('UTC');

        $customers = app(Listener::class)
            ->where('user_type', 1)
            ->where('verified', 1)
            ->whereNotNull('fcm_token')
            ->where('fcm_token', '!=', '')
            ->get();

        foreach ($customers as $customer) {
            $stats['scanned']++;

            if (empty($customer->fcm_token)) {
                $stats['skipped_missing_token']++;
                continue;
            }

            $timezone = TimezoneHelper::getTimezoneForState($customer->state);
            $nowLocal = $referenceUtc->copy()->setTimezone($timezone);

            $weekday = (int) $nowLocal->isoWeekday(); // 1=Mon ... 7=Sun
            $hour = (int) $nowLocal->format('G');
            if (!in_array($weekday, $weekdaySet, true) || $hour < $startHour || $hour >= $endHour) {
                $stats['skipped_window']++;
                continue;
            }
            $stats['eligible_window']++;

            $weekKey = $nowLocal->format('o-\WW');
            $slotKeys = $this->getWeeklySlotKeysForUser((int) $customer->id, $weekKey);
            $currentSlotKey = $this->getCurrentSlotKey($weekday, $nowLocal, $startHour, $endHour);

            if (!in_array($currentSlotKey, $slotKeys, true)) {
                $stats['skipped_slot']++;
                continue;
            }

            $sentThisWeek = WeeklyNudgeLog::where('user_id', $customer->id)
                ->where('week_key', $weekKey)
                ->count();
            if ($sentThisWeek >= $maxPerWeek) {
                $stats['skipped_cap']++;
                continue;
            }

            $alreadySentThisSlot = WeeklyNudgeLog::where('user_id', $customer->id)
                ->where('week_key', $weekKey)
                ->where('slot_key', $currentSlotKey)
                ->exists();
            if ($alreadySentThisSlot) {
                $stats['skipped_duplicate_slot']++;
                continue;
            }

            $title = env('WEEKLY_NUDGE_TITLE', 'Taist');
            [$messageBody, $messageIndex] = $this->pickMessage($customer, $messages);

            if ($dryRun) {
                $stats['sent']++;
                continue;
            }

            try {
                $sent = $this->sendPush($customer->fcm_token, $title, $messageBody);
                if (!$sent) {
                    continue;
                }

                Notification::create([
                    'title' => $title,
                    'body' => $messageBody,
                    'image' => $customer->photo ?? '',
                    'fcm_token' => $customer->fcm_token,
                    'user_id' => $customer->id,
                    'navigation_id' => 'weekly_nudge',
                    'role' => 'customer',
                ]);

                WeeklyNudgeLog::create([
                    'user_id' => $customer->id,
                    'week_key' => $weekKey,
                    'slot_key' => $currentSlotKey,
                    'message_index' => $messageIndex,
                    'timezone' => $timezone,
                    'sent_at_utc' => $referenceUtc->copy(),
                    'sent_at_local' => $nowLocal->format('Y-m-d H:i:s'),
                ]);

                $stats['sent']++;
            } catch (\Throwable $e) {
                if ($this->isStaleTokenError($e)) {
                    $customer->update(['fcm_token' => null]);
                    Log::info('Cleared stale FCM token', ['user_id' => $customer->id]);
                } else {
                    $stats['errors']++;
                    Log::error('Weekly nudge send failed', [
                        'user_id' => $customer->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        return $stats;
    }

    public function getWeeklySlotKeysForUser(int $userId, string $weekKey): array
    {
        $weekdaySet = $this->getWeekdaySet();
        sort($weekdaySet);
        $weekdayCount = count($weekdaySet);
        $slotsPerDay = 24; // 10:00 -> 15:45 in 15-minute steps
        $totalSlots = $weekdayCount * $slotsPerDay;

        $slotA = $this->deterministicIndex($userId . '|' . $weekKey . '|A', $totalSlots);
        $dayA = intdiv($slotA, $slotsPerDay);

        // Slot B must land on a different day than slot A
        $remainingDays = array_values(array_diff(range(0, $weekdayCount - 1), [$dayA]));
        $dayBIdx = $this->deterministicIndex($userId . '|' . $weekKey . '|B-day', count($remainingDays));
        $dayB = $remainingDays[$dayBIdx];
        $timeB = $this->deterministicIndex($userId . '|' . $weekKey . '|B-time', $slotsPerDay);
        $slotB = $dayB * $slotsPerDay + $timeB;

        return [
            $this->slotIndexToKey($slotA, $weekdaySet, $slotsPerDay),
            $this->slotIndexToKey($slotB, $weekdaySet, $slotsPerDay),
        ];
    }

    private function pickMessage($customer, array $messages): array
    {
        $retireeAge = (int) env('WEEKLY_NUDGE_RETIREE_AGE', 60);
        $retireeMessage = env(
            'WEEKLY_NUDGE_RETIREE_MESSAGE',
            'You deserve a great meal without the hassle. Browse Taist chefs and treat yourself tonight.'
        );

        if (!empty($customer->birthday) && $customer->birthday != 0) {
            $age = (int) Carbon::createFromTimestamp($customer->birthday)->diffInYears(Carbon::now());
            if ($age >= $retireeAge) {
                return [$retireeMessage, -1];
            }
        }

        $allTimeCount = WeeklyNudgeLog::where('user_id', $customer->id)->count();
        $index = $allTimeCount % count($messages);
        return [$messages[$index], $index];
    }

    private function sendPush(string $token, string $title, string $body): bool
    {
        if (!$this->firebaseMessaging) {
            Log::warning('Skipping weekly nudge push - Firebase not configured');
            return false;
        }

        $message = CloudMessage::withTarget('token', $token)
            ->withNotification([
                'title' => $title,
                'body' => $body,
            ])
            ->withData([
                'type' => 'weekly_nudge',
                'action' => 'open_inbox',
            ]);

        $this->firebaseMessaging->send($message);
        return true;
    }

    private function isStaleTokenError(\Throwable $e): bool
    {
        if ($e instanceof NotFound || $e instanceof InvalidMessage) {
            return true;
        }

        $msg = $e->getMessage();
        return str_contains($msg, 'not known to the Firebase project')
            || str_contains($msg, 'not a valid FCM registration token')
            || str_contains($msg, 'Requested entity was not found');
    }

    private function getCurrentSlotKey(int $weekday, Carbon $nowLocal, int $startHour, int $endHour): string
    {
        $minutesFromStart = (((int) $nowLocal->format('G')) - $startHour) * 60 + (int) $nowLocal->format('i');
        if ($minutesFromStart < 0 || ((int) $nowLocal->format('G')) >= $endHour) {
            return $weekday . ':-1';
        }

        $slotInDay = intdiv($minutesFromStart, 15); // 0..23
        return $weekday . ':' . $slotInDay;
    }

    private function slotIndexToKey(int $slotIndex, array $weekdaySet, int $slotsPerDay): string
    {
        $weekdayIdx = intdiv($slotIndex, $slotsPerDay);
        $slotInDay = $slotIndex % $slotsPerDay;
        $weekday = $weekdaySet[$weekdayIdx];

        return $weekday . ':' . $slotInDay;
    }

    private function deterministicIndex(string $seed, int $maxExclusive): int
    {
        if ($maxExclusive <= 0) {
            return 0;
        }

        $hash = sprintf('%u', crc32($seed));
        return ((int) $hash) % $maxExclusive;
    }

    private function getWeekdaySet(): array
    {
        $raw = (string) env('WEEKLY_NUDGE_WEEKDAYS', '1,2,3,4');
        $parts = array_filter(array_map('trim', explode(',', $raw)));
        $days = [];

        foreach ($parts as $part) {
            $day = (int) $part;
            if ($day >= 1 && $day <= 7) {
                $days[] = $day;
            }
        }

        if (empty($days)) {
            return [1, 2, 3, 4];
        }

        return array_values(array_unique($days));
    }

    private function getMessages(): array
    {
        $defaultMessages = [
            'Feeling behind? Order Taist and get ahead on other stuff tonight. See chefs now.',
            'Skip the cooking stress. Open Taist and book a local chef in minutes.',
            'Give your evening back. Browse Taist chefs and plan dinner fast.',
            'Dinner does not have to derail your night. Check Taist chefs now.',
        ];

        $raw = env('WEEKLY_NUDGE_MESSAGES');
        if (empty($raw)) {
            return $defaultMessages;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return $defaultMessages;
        }

        $messages = array_values(array_filter(array_map(static function ($m) {
            return is_string($m) ? trim($m) : '';
        }, $decoded)));

        return !empty($messages) ? $messages : $defaultMessages;
    }
}
