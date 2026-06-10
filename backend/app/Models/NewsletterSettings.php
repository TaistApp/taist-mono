<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsletterSettings extends Model
{
    protected $table = 'tbl_newsletter_settings';

    protected $fillable = [
        'user_type',
        'filter_mode',
    ];

    protected $casts = [
        'user_type' => 'integer',
    ];

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
}
