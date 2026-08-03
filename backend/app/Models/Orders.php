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
        'acceptance_reminder_sent_at',
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
     * Whether the chef should get a 5-minute acceptance reminder push right
     * now. True only while the order is still awaiting acceptance (status 1,
     * deadline in the future), at least 5 minutes have passed since the
     * request was created, and no reminder went out in the current 5-minute
     * cycle.
     *
     * @param int|null $now Unix timestamp to evaluate against (defaults to now)
     * @return bool
     */
    public function shouldSendAcceptanceReminder(?int $now = null)
    {
        $now = $now ?? time();

        if ($this->status != 1 || !$this->acceptance_deadline) {
            return false;
        }

        $deadline = (int)$this->acceptance_deadline;
        if ($now >= $deadline) {
            return false; // Window closed — expiry processing takes over
        }

        // The request was created 30 minutes before its deadline
        $requestedAt = $deadline - 1800;
        if ($now - $requestedAt < 300) {
            return false; // First reminder comes 5 minutes after the request
        }

        // 270s instead of 300s so scheduler jitter can't skip a whole cycle
        $lastSent = (int)($this->acceptance_reminder_sent_at ?? 0);
        return ($now - $lastSent) >= 270;
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

    /**
     * The order's calendar day (YYYY-MM-DD) in its own timezone. Prefers the
     * stored date string; falls back to deriving it from the legacy unix
     * order_date timestamp.
     */
    public function getOrderDayString(?string $fallbackTimezone = null): ?string
    {
        $tz = $this->order_timezone ?: ($fallbackTimezone ?: 'America/Chicago');

        if ($this->order_date_new) {
            return $this->order_date_new;
        }
        if ($this->order_date) {
            return (new \DateTime('@' . (int) $this->order_date))
                ->setTimezone(new \DateTimeZone($tz))
                ->format('Y-m-d');
        }
        return null;
    }

    /**
     * Whether "now" is on or after the order's calendar day in the order's
     * timezone. The chef may only mark "On My Way" once this is true, so they
     * can't go en route days early. Compares YYYY-MM-DD strings, which order
     * correctly lexicographically. Returns true when no date info exists, so a
     * malformed order is never hard-blocked.
     */
    public function isOnOrAfterOrderDay(?string $fallbackTimezone = null): bool
    {
        $orderDay = $this->getOrderDayString($fallbackTimezone);
        if (!$orderDay) {
            return true;
        }
        $tz = $this->order_timezone ?: ($fallbackTimezone ?: 'America/Chicago');
        $today = \App\Helpers\TimezoneHelper::getTodayInTimezone($tz);
        return $today >= $orderDay;
    }
}
