<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Orders extends Model
{
    protected $table = 'tbl_orders';
    
    protected $fillable = [
        'chef_user_id',
        'menu_id',
        'customer_user_id',
        'amount',
        'total_price',
        'addons',
        'address',
        'parking_type',
        'parking_instructions',
        'order_date',
        'status',
        'notes',
        'payment_token',
        'acceptance_deadline',
        'reminder_sent_at',
        // Discount tracking fields
        'discount_code_id',
        'discount_code',
        'discount_amount',
        'subtotal_before_discount',
        // Cancellation tracking fields
        'cancelled_by_user_id',
        'cancelled_by_role',
        'cancellation_reason',
        'cancelled_at',
        'cancellation_type',
        'refund_amount',
        'refund_percentage',
        'refund_processed_at',
        'refund_stripe_id',
        'is_auto_closed',
        'closed_at',
        // DateTime string fields (timezone-safe)
        'order_date_new',
        'order_time',
        'order_timezone',
        'order_timestamp',
    ];

    protected $casts = [
        'order_timestamp' => 'integer',
    ];

    public function getCreatedAtAttribute($date)
    {
        return strtotime($date);
    }

    public function getUpdatedAtAttribute($date)
    {
        return strtotime($date);
    }
    
    /**
     * Relationship to get who cancelled the order
     */
    public function cancelledBy()
    {
        return $this->belongsTo('App\Models\Listener', 'cancelled_by_user_id', 'id');
    }
    
    /**
     * Relationship to discount code used
     */
    public function discountCode()
    {
        return $this->belongsTo(DiscountCodes::class, 'discount_code_id');
    }
    
    /**
     * Get cancellation summary for display
     */
    public function getCancellationSummary()
    {
        if (!$this->cancelled_at) {
            return null;
        }
        
        $cancelledBy = $this->cancelledBy;
        $name = $cancelledBy 
            ? $cancelledBy->first_name . ' ' . $cancelledBy->last_name 
            : 'Unknown';
        
        return [
            'who' => $name,
            'role' => $this->cancelled_by_role,
            'when' => $this->cancelled_at,
            'reason' => $this->cancellation_reason,
            'type' => $this->cancellation_type,
        ];
    }
    
    /**
     * Check if order has discount applied
     * 
     * @return bool
     */
    public function hasDiscount()
    {
        return $this->discount_amount > 0;
    }
    
    /**
     * Get discount summary for display
     *
     * @return array|null
     */
    public function getDiscountSummary()
    {
        if (!$this->hasDiscount()) {
            return null;
        }

        return [
            'code' => $this->discount_code,
            'amount' => $this->discount_amount,
            'original_total' => $this->subtotal_before_discount,
            'final_total' => $this->total_price,
            'savings' => '$' . number_format($this->discount_amount, 2),
        ];
    }

    /**
     * Check if order has exceeded acceptance deadline
     *
     * @return bool
     */
    public function isExpired()
    {
        if (!$this->acceptance_deadline || $this->status != 1) {
            return false;
        }

        return time() > (int)$this->acceptance_deadline;
    }

    /**
     * Get time remaining until acceptance deadline in seconds
     *
     * @return int|null Returns seconds remaining, 0 if expired, null if no deadline
     */
    public function getTimeRemaining()
    {
        if (!$this->acceptance_deadline) {
            return null;
        }

        $remaining = (int)$this->acceptance_deadline - time();
        return max(0, $remaining);
    }

    /**
     * Get acceptance deadline info for API response
     *
     * @return array|null
     */
    public function getDeadlineInfo()
    {
        if (!$this->acceptance_deadline || $this->status != 1) {
            return null;
        }

        $remaining = $this->getTimeRemaining();

        return [
            'deadline_timestamp' => (int)$this->acceptance_deadline,
            'seconds_remaining' => $remaining,
            'minutes_remaining' => floor($remaining / 60),
            'is_expired' => $this->isExpired(),
        ];
    }

    /**
     * Get the order's scheduled datetime in the chef's timezone
     *
     * @return \DateTime|null
     */
    public function getScheduledDateTimeAttribute(): ?\DateTime
    {
        if (!$this->order_date_new || !$this->order_time) {
            return null;
        }
        $tz = $this->order_timezone ?? 'America/Chicago';
        return new \DateTime("{$this->order_date_new} {$this->order_time}", new \DateTimeZone($tz));
    }
}
