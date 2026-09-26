<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdSettings extends Model
{
    protected $table = 'tbl_ad_settings';

    protected $fillable = [
        'auto_schedule',
        'cadence_days',
        'ads_per_batch',
        'go_live_time',
        'run_days',
    ];

    protected $casts = [
        'auto_schedule' => 'boolean',
        'cadence_days' => 'integer',
        'ads_per_batch' => 'integer',
        'run_days' => 'integer',
    ];

    // Same notice as newsletters: Dayne sees every batch 48 hours before it
    // goes live, and a batch can never be scheduled with less notice.
    const NOTICE_HOURS = 48;

    const TIMEZONE = 'America/New_York';

    const DEFAULTS = [
        'auto_schedule' => true,
        'cadence_days' => 7,
        'ads_per_batch' => 3,
        'go_live_time' => '10:00',
        'run_days' => 14,
    ];

    /**
     * Current settings with defaults when the row or a value is missing.
     */
    public static function current(): array
    {
        $row = static::query()->orderBy('id')->first();
        if (!$row) {
            return static::DEFAULTS;
        }

        $time = $row->go_live_time;
        if (!is_string($time) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) {
            $time = static::DEFAULTS['go_live_time'];
        }

        return [
            'auto_schedule' => $row->auto_schedule !== null ? (bool) $row->auto_schedule : true,
            'cadence_days' => $row->cadence_days ?: static::DEFAULTS['cadence_days'],
            'ads_per_batch' => $row->ads_per_batch ?: static::DEFAULTS['ads_per_batch'],
            'go_live_time' => $time,
            'run_days' => $row->run_days ?: static::DEFAULTS['run_days'],
        ];
    }

    /**
     * The preview-to-go-live window in minutes. Always 48 hours in
     * production; ADS_NOTICE_MINUTES can shorten it elsewhere for testing.
     */
    public static function noticeMinutes(): int
    {
        $default = static::NOTICE_HOURS * 60;
        if (app()->environment('production')) {
            return $default;
        }
        $override = (int) config('app.ads_notice_minutes');
        return $override > 0 ? $override : $default;
    }

    public static function noticeLabel(): string
    {
        $minutes = static::noticeMinutes();
        if ($minutes % 60 === 0) {
            $hours = intdiv($minutes, 60);
            return $hours . ' hour' . ($hours === 1 ? '' : 's');
        }
        return $minutes . ' minute' . ($minutes === 1 ? '' : 's');
    }
}
