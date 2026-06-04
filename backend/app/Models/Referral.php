<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Listener;

class Referral extends Model
{
    protected $table = 'tbl_referrals';

    protected $fillable = [
        'referrer_user_id',
        'referral_code',
        'referral_type',
        'chef_user_id',
        'referred_phone',
        'referred_user_id',
        'status',
        'referrer_discount_code_id',
        'referred_discount_code_id',
        'qualifying_order_id',
        'sms_sent_at',
        'signed_up_at',
        'completed_at',
        'expired_at',
    ];

    protected $casts = [
        'sms_sent_at' => 'datetime',
        'signed_up_at' => 'datetime',
        'completed_at' => 'datetime',
        'expired_at' => 'datetime',
    ];

    public function referrer()
    {
        return $this->belongsTo(Listener::class, 'referrer_user_id');
    }

    public function referredUser()
    {
        return $this->belongsTo(Listener::class, 'referred_user_id');
    }

    public function chef()
    {
        return $this->belongsTo(Listener::class, 'chef_user_id');
    }

    public function referrerDiscountCode()
    {
        return $this->belongsTo(DiscountCodes::class, 'referrer_discount_code_id');
    }

    public function referredDiscountCode()
    {
        return $this->belongsTo(DiscountCodes::class, 'referred_discount_code_id');
    }

    public function qualifyingOrder()
    {
        return $this->belongsTo(Orders::class, 'qualifying_order_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeByReferrer($query, $userId)
    {
        return $query->where('referrer_user_id', $userId);
    }
}
