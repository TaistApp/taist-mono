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
        $orderTimestamp = strtotime($orderDate);
        $orderDateOnly = date('Y-m-d', $orderTimestamp);
        $orderTime = date('H:i', $orderTimestamp);

        // Check for override first
        $override = \App\Models\AvailabilityOverride::forChef($this->id)
            ->forDate($orderDateOnly)
            ->first();

        if ($override) {
            // Override exists - use it instead of weekly schedule
            return $override->isAvailableAt($orderTime);
        }

        // No override - fall back to weekly recurring schedule
        return $this->hasScheduleForDateTime($orderDate, $orderTime);
    }

    /**
     * Check if chef has availability for a specific date/time in weekly schedule
     * TMA-011 REVISED - Checks both day AND time
     *
     * @param string $dateTime The date/time to check
     * @param string $time Time in H:i format
     * @return bool
     */
    private function hasScheduleForDateTime($dateTime, $time)
    {
        $dayOfWeek = strtolower(date('l', strtotime($dateTime)));

        // Get the chef's availability record
        $availability = \App\Models\Availabilities::where('user_id', $this->id)->first();

        if (!$availability) {
            return false;
        }

        $startField = $dayOfWeek . '_start';
        $endField = $dayOfWeek . '_end';

        $scheduledStart = $availability->$startField;
        $scheduledEnd = $availability->$endField;

        // Check if both start and end times are set for this day
        if (empty($scheduledStart) || empty($scheduledEnd)) {
            return false;
        }

        // Check if the requested time falls within the scheduled hours
        $checkTime = strtotime($time);
        $startTime = strtotime($scheduledStart);
        $endTime = strtotime($scheduledEnd);

        return $checkTime >= $startTime && $checkTime <= $endTime;
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
