<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsletterSettings extends Model
{
    protected $table = 'tbl_newsletter_settings';

    protected $fillable = [
        'user_type',
        'filter_mode',
        'auto_schedule',
        'cadence_days',
        'send_time',
    ];

    protected $casts = [
        'user_type' => 'integer',
        'auto_schedule' => 'boolean',
        'cadence_days' => 'integer',
    ];

    // Dayne gets the preview this many hours before an edition goes out, and
    // an edition can never be scheduled with less notice than this.
    const NOTICE_HOURS = 48;

    // Send times are entered and shown in Indianapolis (Eastern) time.
    const TIMEZONE = 'America/New_York';

    const DEFAULT_CADENCE_DAYS = 14;
    const DEFAULT_SEND_TIME = '10:00';

    // Allowed filter modes per audience. First entry is the default.
    const MODES = [
        1 => ['service_area', 'all'],
        2 => ['active', 'active_pending', 'all'],
    ];

    /**
     * Return the stored filter_mode for a user_type, falling back to the
     * default (first allowed mode) if no row exists yet.
     */
    public static function modeForType($userType): string
    {
        $userType = (int) $userType;
        $row = static::where('user_type', $userType)->first();
        if ($row && in_array($row->filter_mode, static::MODES[$userType] ?? [], true)) {
            return $row->filter_mode;
        }
        return static::MODES[$userType][0] ?? 'all';
    }

    public static function isValidMode($userType, $mode): bool
    {
        return in_array($mode, static::MODES[(int) $userType] ?? [], true);
    }

    /**
     * Automation settings for one audience, with defaults when the row or the
     * columns are missing.
     */
    public static function automationFor($userType): array
    {
        $row = static::where('user_type', (int) $userType)->first();

        $sendTime = $row->send_time ?? null;
        if (!is_string($sendTime) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $sendTime)) {
            $sendTime = static::DEFAULT_SEND_TIME;
        }

        return [
            'auto_schedule' => $row && $row->auto_schedule !== null ? (bool) $row->auto_schedule : true,
            'cadence_days' => $row && $row->cadence_days ? (int) $row->cadence_days : static::DEFAULT_CADENCE_DAYS,
            'send_time' => $sendTime,
        ];
    }
}
