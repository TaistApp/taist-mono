<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralSettings extends Model
{
    protected $table = 'tbl_referral_settings';

    protected $fillable = [
        'discount_type',
        'discount_value',
        'max_referrals_per_customer',
        'credit_expiration_days',
        'minimum_order_amount',
        'maximum_discount_amount',
        'is_active',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'minimum_order_amount' => 'decimal:2',
        'maximum_discount_amount' => 'decimal:2',
        'max_referrals_per_customer' => 'integer',
        'credit_expiration_days' => 'integer',
        'is_active' => 'boolean',
    ];

    public static function getSettings()
    {
        return static::first();
    }

    public function getFormattedDiscount()
    {
        if ($this->discount_type === 'fixed') {
            return '$' . number_format($this->discount_value, 2) . ' off';
        }
        // Drop trailing decimals for percentages: 50.00 -> "50", 12.50 -> "12.5".
        return rtrim(rtrim(number_format($this->discount_value, 2, '.', ''), '0'), '.') . '% off';
    }
}
