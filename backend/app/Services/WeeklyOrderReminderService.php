<?php

namespace App\Services;

use App\Helpers\TimezoneHelper;
use App\Listener;
use App\Notification;
use App\Models\WeeklyOrderReminderLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Messaging\CloudMessage;

class WeeklyOrderReminderService
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

    public function sendWeeklyReminders(bool $dryRun = false, ?Carbon $nowUtc = null): array
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

        $rawEnabled = env('WEEKLY_ORDER_REMINDERS_ENABLED');
        $enabled = ($rawEnabled === null || $rawEnabled === '')
            ? true
            : filter_var($rawEnabled, FILTER_VALIDATE_BOOLEAN);
        if (!$enabled) {
            $stats['skipped_disabled'] = 1;
            return $stats;
        }

        $messages = $this->getMessages();
        if (empty($messages)) {
            Log::warning('No weekly reminder messages configured, skipping run.');
            return $stats;
        }

        $maxPerWeek = max((int) env('WEEKLY_ORDER_REMINDERS_MAX_PER_WEEK', 2), 1);
        $startHour = (int) env('WEEKLY_ORDER_REMINDERS_START_HOUR', 10);
        $endHour = (int) env('WEEKLY_ORDER_REMINDERS_END_HOUR', 16); // exclusive upper bound
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

            $sentThisWeek = WeeklyOrderReminderLog::where('user_id', $customer->id)
                ->where('week_key', $weekKey)
                ->count();
            if ($sentThisWeek >= $maxPerWeek) {
                $stats['skipped_cap']++;
                continue;
            }

            $alreadySentThisSlot = WeeklyOrderReminderLog::where('user_id', $customer->id)
                ->where('week_key', $weekKey)
                ->where('slot_key', $currentSlotKey)
                ->exists();
            if ($alreadySentThisSlot) {
                $stats['skipped_duplicate_slot']++;
                continue;
            }

            $allTimeCount = WeeklyOrderReminderLog::where('user_id', $customer->id)->count();
            $messageIndex = $allTimeCount % count($messages);
            $messageBody = $messages[$messageIndex];
            $title = env('WEEKLY_ORDER_REMINDER_TITLE', 'Taist');

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
                    'navigation_id' => 'weekly_order_reminder',
                    'role' => 'customer',
                ]);

                WeeklyOrderReminderLog::create([
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
                $stats['errors']++;
                Log::error('Weekly order reminder send failed', [
                    'user_id' => $customer->id,
                    'error' => $e->getMessage(),
                ]);
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
        $slotB = $this->deterministicIndex($userId . '|' . $weekKey . '|B', $totalSlots);
        if ($slotB === $slotA) {
            $slotB = ($slotB + 1) % $totalSlots;
        }

        return [
            $this->slotIndexToKey($slotA, $weekdaySet, $slotsPerDay),
            $this->slotIndexToKey($slotB, $weekdaySet, $slotsPerDay),
        ];
    }

    private function sendPush(string $token, string $title, string $body): bool
    {
        if (!$this->firebaseMessaging) {
            Log::warning('Skipping weekly reminder push - Firebase not configured');
            return false;
        }

        $message = CloudMessage::withTarget('token', $token)
            ->withNotification([
                'title' => $title,
                'body' => $body,
            ])
            ->withData([
                'type' => 'weekly_order_reminder',
                'action' => 'open_inbox',
            ]);

        $this->firebaseMessaging->send($message);
        return true;
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
        $raw = (string) env('WEEKLY_ORDER_REMINDERS_WEEKDAYS', '1,2,3,4');
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

        $raw = env('WEEKLY_ORDER_REMINDERS_MESSAGES');
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
