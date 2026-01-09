<?php

namespace App;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
// use Laravel\Passport\HasApiTokens;
// use Carbon;

class Listener extends Authenticatable
{
    protected $table = 'tbl_users';

    use Notifiable;//, HasApiTokens;
    
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'first_name', 'last_name', 'email', 'password', 'phone', 'birthday', 'address', 'city', 'state', 'zip', 'user_type', 'is_pending', 'quiz_completed', 'verified', 'photo', 'api_token', 'code', 'token_date', 'applicant_guid', 'order_guid', 'fcm_token', 'latitude', 'longitude', 'is_online', 'online_start', 'online_until', 'last_toggled_online_at', 'last_toggled_offline_at', 'last_online_reminder_sent_at'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password', 'api_token', 'code'
    ];

    /**
     * Add a mutator to ensure hashed passwords
     */
    public function setPasswordAttribute($password)
    {
        $this->attributes['password'] = bcrypt($password);
    }

    public function getCreatedAtAttribute($date)
    {
        return strtotime($date);
    }

    public function getUpdatedAtAttribute($date)
    {
        return strtotime($date);
    }

    function notifications()
    {
        return $this->hasMany(Notification::class,'user_id');
    }

    /**
     * Route notifications for the Firebase channel.
     *
     * @return string|null
     */
    public function routeNotificationForFirebase()
    {
        return $this->fcm_token;
    }

    /**
     * Get chef's availability overrides
     * TMA-011 REVISED
     */
    public function availabilityOverrides()
    {
        return $this->hasMany(\App\Models\AvailabilityOverride::class, 'chef_id', 'id');
    }

    /**
     * Get chef's weekly availability schedule
     */
    public function availability()
    {
        return $this->hasOne(\App\Models\Availabilities::class, 'user_id', 'id');
    }

    /**
     * Get chef's menu items
     */
    public function menus()
    {
        return $this->hasMany(\App\Models\Menus::class, 'user_id', 'id');
    }

    /**
     * Check if chef is currently online
     *
     * @return bool
     */
    public function isOnline()
    {
        return (bool)($this->is_online ?? false);
    }

    /**
     * Check if chef is available for a specific order date/time
     * TMA-011 REVISED - Uses override logic
     *
     * Logic:
     * 1. Check if there's an override for this specific date
     * 2. If override exists and is cancelled -> NOT available
     * 3. If override exists and is active -> check time against override
     * 4. If NO override -> fall back to weekly recurring schedule
     *
     * @param string $orderDate The order date/time
     * @return bool
     */
    public function isAvailableForOrder($orderDate)
    {
        // Handle both Unix timestamp (number) and date string formats
        $orderTimestamp = is_numeric($orderDate) ? (int)$orderDate : strtotime($orderDate);

        if (!$orderTimestamp || $orderTimestamp <= 0) {
            \Log::warning("[AVAILABILITY] Invalid order date received: " . var_export($orderDate, true));
            return false;
        }

        $orderDateOnly = date('Y-m-d', $orderTimestamp);
        $orderTime = date('H:i', $orderTimestamp);
        $today = date('Y-m-d');

        // Check for override first
        $override = \App\Models\AvailabilityOverride::forChef($this->id)
            ->forDate($orderDateOnly)
            ->first();

        if ($override) {
            // Override exists - use it instead of weekly schedule
            return $override->isAvailableAt($orderTime);
        }

        // Today with no override = NOT available (chef must toggle on)
        if ($orderDateOnly === $today) {
            return false;
        }

        // Tomorrow and beyond - fall back to weekly recurring schedule
        return $this->hasScheduleForDateTime($orderTimestamp, $orderTime);
    }

    /**
     * Check if chef has availability for a specific date/time in weekly schedule
     * TMA-011 REVISED - Checks both day AND time
     *
     * @param int|string $dateTime The date/time to check (Unix timestamp or date string)
     * @param string $time Time in H:i format
     * @return bool
     */
    private function hasScheduleForDateTime($dateTime, $time)
    {
        // Handle both Unix timestamp and date string
        $timestamp = is_numeric($dateTime) ? (int)$dateTime : strtotime($dateTime);
        $dayOfWeek = strtolower(date('l', $timestamp));

        // Get the chef's availability record
        $availability = \App\Models\Availabilities::where('user_id', $this->id)->first();

        if (!$availability) {
            \Log::debug("[TIMESLOTS] No availability record found for chef {$this->id}");
            return false;
        }

        $startField = $dayOfWeek . '_start';
        $endField = $dayOfWeek . '_end';

        $scheduledStart = $availability->$startField;
        $scheduledEnd = $availability->$endField;

        \Log::debug("[TIMESLOTS] Chef {$this->id} {$dayOfWeek}: start={$scheduledStart}, end={$scheduledEnd}");

        // Check if both start and end times are set for this day
        // Values are stored as Unix timestamps, 0 means not available
        if (empty($scheduledStart) || empty($scheduledEnd) || $scheduledStart == 0 || $scheduledEnd == 0) {
            \Log::debug("[TIMESLOTS] Day not available (empty or 0)");
            return false;
        }

        // Normalize time values - handles both "HH:MM" strings (new format) and legacy Unix timestamps
        $scheduledStartTime = $this->normalizeTimeValue($scheduledStart);
        $scheduledEndTime = $this->normalizeTimeValue($scheduledEnd);

        if (!$scheduledStartTime || !$scheduledEndTime) {
            \Log::debug("[TIMESLOTS] Invalid time values");
            return false;
        }

        \Log::debug("[TIMESLOTS] Converted times: start={$scheduledStartTime}, end={$scheduledEndTime}, checking time={$time}");

        // Handle "00:00" end time as midnight (end of day) - treat as "24:00" for comparison
        $endTimeForComparison = ($scheduledEndTime === '00:00') ? '24:00' : $scheduledEndTime;

        // Compare time strings (HH:MM format)
        // Note: End time is EXCLUSIVE - chef is available UNTIL end time, not AT it
        // See docs/features/chef-availability-system.md for details on switching to inclusive
        $isAvailable = $time >= $scheduledStartTime && $time < $endTimeForComparison;
        \Log::debug("[TIMESLOTS] Time {$time} available: " . ($isAvailable ? 'yes' : 'no'));

        return $isAvailable;
    }

    /**
     * Check if chef has a schedule for today (any time)
     * TMA-011 REVISED - Simple day check
     *
     * @return bool
     */
    private function hasScheduleForToday()
    {
        $dayOfWeek = strtolower(date('l'));
        return $this->hasScheduleForDay($dayOfWeek);
    }

    /**
     * Check if chef has a schedule for a specific date (any time)
     * TMA-011 REVISED - Simple day check
     *
     * @param string $date The date to check
     * @return bool
     */
    private function hasScheduleForDate($date)
    {
        $dayOfWeek = strtolower(date('l', strtotime($date)));
        return $this->hasScheduleForDay($dayOfWeek);
    }

    /**
     * Check if chef has availability for a specific day of week (any time)
     * TMA-011 REVISED
     *
     * @param string $dayOfWeek monday, tuesday, etc.
     * @return bool
     */
    private function hasScheduleForDay($dayOfWeek)
    {
        // Get the chef's availability record
        $availability = \App\Models\Availabilities::where('user_id', $this->id)->first();

        if (!$availability) {
            return false;
        }

        $startField = $dayOfWeek . '_start';
        $endField = $dayOfWeek . '_end';

        // Check if both start and end times are set for this day
        return !empty($availability->$startField) && !empty($availability->$endField);
    }

    /**
     * Normalize a time value to "HH:MM" format.
     * Handles both new "HH:MM" string format and legacy Unix timestamps.
     *
     * @param mixed $value Time value (string "HH:MM" or numeric timestamp)
     * @return string|null "HH:MM" format or null if invalid
     */
    private function normalizeTimeValue($value): ?string
    {
        if (empty($value) || $value === '0' || $value === 0) {
            return null;
        }

        // Already a time string "HH:MM" - return as-is
        if (is_string($value) && preg_match('/^\d{2}:\d{2}$/', $value)) {
            return $value;
        }

        // Legacy Unix timestamp (9+ digits)
        if (is_numeric($value) && strlen((string)$value) >= 9) {
            return date('H:i', (int)$value);
        }

        return null;
    }

    // public function setCreatedAtAttribute($date)
    // {
    //     $this->attributes['created_at'] = time();
    // }

    // public function setUpdatedAtAttribute($date)
    // {
    //     $this->attributes['updated_at'] = time();
    // }
    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    // protected $casts = [
    //     'email_verified_at' => 'datetime',
    // ];
}
