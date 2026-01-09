<?php

namespace App\Services;

use App\Listener;
use App\Models\Availabilities;
use App\Models\AvailabilityOverride;
use App\Notification;
use App\Helpers\TimezoneHelper;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Messaging\CloudMessage;
use Carbon\Carbon;
use Exception;

/**
 * ChefConfirmationReminderService
 *
 * Sends reminders to chefs 24 hours before their scheduled availability
 * to prompt them to confirm/modify/cancel for that specific day
 * TMA-011 REVISED Phase 6
 */
class ChefConfirmationReminderService
{
    protected $twilioService;
    protected $firebaseMessaging;

    public function __construct(TwilioService $twilioService)
    {
        $this->twilioService = $twilioService;

        try {
            $this->firebaseMessaging = app('firebase.messaging');
        } catch (\Exception $e) {
            $this->firebaseMessaging = null;
            Log::warning('Firebase not configured: ' . $e->getMessage());
        }
    }

    /**
     * Send reminder to chef to confirm tomorrow's availability
     *
     * @param int $chefId
     * @param string $tomorrowDate Date in Y-m-d format
     * @param string $scheduledStart Time in H:i format (e.g., "14:00")
     * @param string $scheduledEnd Time in H:i format
     * @return bool
     */
    public function sendConfirmationReminder($chefId, $tomorrowDate, $scheduledStart, $scheduledEnd)
    {
        $chef = app(Listener::class)->where('id', $chefId)->first();

        if (!$chef) {
            Log::warning("Chef not found for confirmation reminder", ['chef_id' => $chefId]);
            return false;
        }

        // Check if there's already an override for tomorrow
        $existingOverride = AvailabilityOverride::forChef($chefId)
            ->forDate($tomorrowDate)
            ->first();

        if ($existingOverride) {
            Log::info("Chef already has override for tomorrow, skipping reminder", [
                'chef_id' => $chefId,
                'date' => $tomorrowDate,
                'override_status' => $existingOverride->status
            ]);
            return false;
        }

        // Check if we recently sent a reminder (prevent spam)
        if ($chef->last_online_reminder_sent_at) {
            $lastReminderTime = strtotime($chef->last_online_reminder_sent_at);
            $timeSinceLastReminder = time() - $lastReminderTime;

            // Don't send more than once per 12 hours
            if ($timeSinceLastReminder < 43200) { // 12 hours
                Log::info("Recently sent reminder, skipping", [
                    'chef_id' => $chefId,
                    'hours_since_last' => round($timeSinceLastReminder / 3600, 1)
                ]);
                return false;
            }
        }

        $tomorrowFormatted = date('l, M j', strtotime($tomorrowDate)); // "Tuesday, Dec 3"
        $timeRange = date('g:i A', strtotime($scheduledStart)) . ' - ' . date('g:i A', strtotime($scheduledEnd));

        $title = "Confirm tomorrow's availability";
        $body = "You're scheduled for {$tomorrowFormatted} from {$timeRange}. Tap the Live button to check in.";

        $sent = false;

        // 1. Push notification (if available)
        if ($chef->fcm_token && $this->firebaseMessaging) {
            try {
                $this->sendPushNotification($chef, $title, $body, $tomorrowDate);
                $sent = true;
                Log::info("Sent push notification", ['chef_id' => $chefId]);
            } catch (Exception $e) {
                Log::error("Failed to send push notification", [
                    'chef_id' => $chefId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        // 2. SMS notification (primary method for time-sensitive reminders)
        if ($chef->phone) {
            try {
                $this->sendSmsReminder($chef, $tomorrowFormatted, $timeRange);
                $sent = true;
                Log::info("Sent SMS reminder", ['chef_id' => $chefId]);
            } catch (Exception $e) {
                Log::error("Failed to send SMS reminder", [
                    'chef_id' => $chefId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Update reminder timestamp
        if ($sent) {
            app(Listener::class)->where('id', $chefId)->update([
                'last_online_reminder_sent_at' => now()
            ]);
        }

        return $sent;
    }

    /**
     * Send push notification via Firebase
     */
    private function sendPushNotification($chef, $title, $body, $tomorrowDate)
    {
        if (!$this->firebaseMessaging) {
            return;
        }

        $message = CloudMessage::withTarget('token', $chef->fcm_token)
            ->withNotification([
                'title' => $title,
                'body' => $body,
            ])
            ->withData([
                'type' => 'availability_confirmation',
                'action' => 'confirm_availability',
                'chef_id' => (string)$chef->id,
                'date' => $tomorrowDate,
            ]);

        $this->firebaseMessaging->send($message);

        // Save to notifications table
        Notification::create([
            'title' => $title,
            'body' => $body,
            'image' => $chef->photo ?? 'N/A',
            'fcm_token' => $chef->fcm_token,
            'user_id' => $chef->id,
            'role' => 'chef',
        ]);
    }

    /**
     * Send SMS reminder via Twilio
     */
    private function sendSmsReminder($chef, $tomorrowFormatted, $timeRange)
    {
        $message = "Taist: You're scheduled {$tomorrowFormatted}, {$timeRange}. Open app and tap Live button to check in.";

        $result = $this->twilioService->sendSMS(
            $chef->phone,
            $message,
            [
                'chef_id' => $chef->id,
                'notification_type' => 'availability_confirmation',
                'date' => $tomorrowFormatted
            ]
        );

        if (!$result['success']) {
            throw new Exception($result['error'] ?? 'Failed to send SMS');
        }
    }

    /**
     * Find chefs who should receive reminders right now
     * (24 hours before their scheduled availability)
     *
     * @return array Array of reminder data
     */
    public function findChefsNeedingReminders()
    {
        Log::info('findChefsNeedingReminders: Starting search');

        // Get all availabilities
        $availabilities = app(Availabilities::class)->get();
        Log::info('findChefsNeedingReminders: Found ' . $availabilities->count() . ' availability records');

        $remindersToSend = [];

        foreach ($availabilities as $availability) {
            $chef = app(Listener::class)->where('id', $availability->user_id)->first();

            if (!$chef || $chef->user_type != 2) {
                continue;
            }

            // Get chef's timezone based on their state
            $chefTimezone = TimezoneHelper::getTimezoneForState($chef->state);
            $chefNow = new Carbon('now', $chefTimezone);
            $chefTomorrow = $chefNow->copy()->addDay();
            $tomorrowDate = $chefTomorrow->format('Y-m-d');
            $tomorrowDayOfWeek = strtolower($chefTomorrow->format('l')); // monday, tuesday, etc.

            // Handle typo in database column name (saterday instead of saturday)
            $dayField = ($tomorrowDayOfWeek === 'saturday') ? 'saterday' : $tomorrowDayOfWeek;
            $startField = $dayField . '_start';
            $endField = $dayField . '_end';

            $scheduledStart = $availability->$startField;
            $scheduledEnd = $availability->$endField;

            if (!$scheduledStart || !$scheduledEnd) {
                continue; // Not scheduled for tomorrow in weekly schedule
            }

            // Check if they already have an override for tomorrow
            $existingOverride = AvailabilityOverride::forChef($chef->id)
                ->forDate($tomorrowDate)
                ->first();

            if ($existingOverride) {
                Log::info('findChefsNeedingReminders: Chef has override, skipping', [
                    'chef_id' => $chef->id,
                    'date' => $tomorrowDate,
                    'status' => $existingOverride->status
                ]);
                continue; // Already confirmed/modified/cancelled
            }

            // Check if we're within the reminder window (around 24 hours before)
            // Calculate in chef's local timezone
            $tomorrowStart = Carbon::parse("$tomorrowDate $scheduledStart", $chefTimezone);
            $reminderTime = $tomorrowStart->copy()->subDay();
            $diffSeconds = abs($chefNow->timestamp - $reminderTime->timestamp);
            $diffMinutes = round($diffSeconds / 60);

            Log::info('findChefsNeedingReminders: Checking chef', [
                'chef_id' => $chef->id,
                'timezone' => $chefTimezone,
                'chef_now' => $chefNow->format('Y-m-d H:i:s'),
                'tomorrow' => $tomorrowDayOfWeek,
                'scheduled' => "$scheduledStart - $scheduledEnd",
                'reminder_time' => $reminderTime->format('Y-m-d H:i:s'),
                'diff_minutes' => $diffMinutes,
                'in_window' => $diffSeconds <= 1800
            ]);

            // Send reminder if we're within 30 minutes of the reminder time
            // This gives a wider window for cron job execution
            if ($diffSeconds <= 1800) { // 30 minute window
                Log::info('findChefsNeedingReminders: Chef IN WINDOW, adding to reminders', [
                    'chef_id' => $chef->id
                ]);
                $remindersToSend[] = [
                    'chef_id' => $chef->id,
                    'tomorrow_date' => $tomorrowDate,
                    'scheduled_start' => $scheduledStart,
                    'scheduled_end' => $scheduledEnd,
                ];
            }
        }

        Log::info('findChefsNeedingReminders: Complete', [
            'reminders_to_send' => count($remindersToSend)
        ]);

        return $remindersToSend;
    }
}
