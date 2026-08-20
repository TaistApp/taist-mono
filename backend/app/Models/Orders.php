<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Orders extends Model
{
    /**
     * Statuses eligible for the 24-hour upcoming-order reminder SMS.
     * Requested (1) is deliberately excluded: the chef hasn't accepted yet,
     * so reminding the customer would promise a meal that may still be
     * declined. Skipped orders keep reminder_sent_at null, so the reminder
     * goes out on a later scheduler run once the chef accepts.
     */
    public const REMINDER_ELIGIBLE_STATUSES = [2, 7]; // Accepted, OnTheWay

    /**
     * Platform commission taken from each order (Stripe application fee).
     */
    public const PLATFORM_COMMISSION = 0.30;

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
        'omw_reminder_sent_at',
        'completion_reminder_sent_at',
        'ingredients_reminder_sent_at',
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
     * Amount to charge the customer for this order, in cents (the
     * post-discount total).
     *
     * @return int
     */
    public function chargeAmountCents()
    {
        return (int) round($this->total_price * 100);
    }

    /**
     * Stripe application fee (the platform's cut) in cents for this order's
     * charge. The chef's payout must always be 70% of the pre-discount
     * subtotal — discount codes are funded out of the platform's 30%
     * commission, never out of the chef's share. Clamped at zero because a
     * destination charge cannot transfer more than the amount charged, so a
     * discount deeper than the commission still shorts the chef by the
     * difference.
     *
     * @return int
     */
    public function applicationFeeCents()
    {
        $chargeCents = $this->chargeAmountCents();
        $discountCents = (int) round(max(0, (float) $this->discount_amount) * 100);
        $chefShareCents = (int) round(($chargeCents + $discountCents) * (1 - self::PLATFORM_COMMISSION));

        return max(0, $chargeCents - $chefShareCents);
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
     * How long before the arrival time the "On My Way" nudge fires (seconds).
     */
    public const OMW_REMINDER_LEAD_SECONDS = 3600;

    /**
     * The "ingredients bought?" nudge window: opens 24h before arrival and
     * closes 3h before (late-accepted orders still get it, but it never
     * stacks onto the On-My-Way hour).
     */
    public const INGREDIENTS_REMINDER_LEAD_SECONDS = 86400;
    public const INGREDIENTS_REMINDER_FLOOR_SECONDS = 10800;

    /**
     * The completion nudge fires this long BEFORE the estimated done time,
     * in case the chef finishes quicker than the menu's estimate.
     */
    public const COMPLETION_REMINDER_EARLY_SECONDS = 600;

    /**
     * OMW/completion nudges repeat on this interval until the chef acts
     * (status advances) or the window closes. Compared against a floor 30s
     * lower so 5-minute scheduler jitter can't skip a whole cycle.
     */
    public const PROGRESSION_REMINDER_REPEAT_SECONDS = 600;
    private const PROGRESSION_REPEAT_JITTER_FLOOR = 570;

    /**
     * The nudges stop firing this long after their trigger moment, so a
     * backlog of stale orders doesn't get blasted when the scheduler catches
     * up (e.g. after a deploy pause).
     */
    public const PROGRESSION_REMINDER_GRACE_SECONDS = 3600;

    /**
     * Whether to nudge the chef to confirm ingredients are bought: order is
     * Accepted, we're 24h (down to 3h) out from arrival, and no nudge has
     * been sent yet.
     *
     * @param int|null $now Unix timestamp to evaluate against (defaults to now)
     * @return bool
     */
    public function shouldSendIngredientsReminder(?int $now = null)
    {
        $now = $now ?? time();
        $arrival = (int) $this->order_date;

        if ((int) $this->status !== 2 || !$arrival) {
            return false;
        }
        if (!empty($this->ingredients_reminder_sent_at)) {
            return false;
        }

        return $now >= $arrival - self::INGREDIENTS_REMINDER_LEAD_SECONDS
            && $now <= $arrival - self::INGREDIENTS_REMINDER_FLOOR_SECONDS;
    }

    /**
     * Whether to nudge the chef to tap "On My Way": order is Accepted, we're
     * inside the hour-to-arrival window (with a 1h grace past arrival for
     * late starts), and no nudge has been sent yet.
     *
     * @param int|null $now Unix timestamp to evaluate against (defaults to now)
     * @return bool
     */
    public function shouldSendOnMyWayReminder(?int $now = null)
    {
        $now = $now ?? time();
        $arrival = (int) $this->order_date;

        if ((int) $this->status !== 2 || !$arrival) {
            return false;
        }
        // Repeats every 10 min until the chef taps "On My Way" (status
        // leaves 2) or the window closes.
        $lastSent = (int) ($this->omw_reminder_sent_at ?? 0);
        if ($lastSent && ($now - $lastSent) < self::PROGRESSION_REPEAT_JITTER_FLOOR) {
            return false;
        }

        return $now >= $arrival - self::OMW_REMINDER_LEAD_SECONDS
            && $now <= $arrival + self::PROGRESSION_REMINDER_GRACE_SECONDS;
    }

    /**
     * Whether to nudge the chef to complete the order (and snap a dish photo
     * before leaving): order is OnMyWay and we're within 10 minutes of the
     * estimated done time (arrival + the menu item's estimated cook time) —
     * early, in case the chef finishes quicker than the estimate. Stops
     * after the grace window so ancient stuck orders stay quiet.
     *
     * @param int $estimatedMinutes The menu item's estimated_time in minutes
     * @param int|null $now Unix timestamp to evaluate against (defaults to now)
     * @return bool
     */
    public function shouldSendCompletionReminder($estimatedMinutes, ?int $now = null)
    {
        $now = $now ?? time();
        $arrival = (int) $this->order_date;

        if ((int) $this->status !== 7 || !$arrival) {
            return false;
        }
        // Repeats every 10 min until the chef marks Complete (status leaves
        // 7) or the window closes.
        $lastSent = (int) ($this->completion_reminder_sent_at ?? 0);
        if ($lastSent && ($now - $lastSent) < self::PROGRESSION_REPEAT_JITTER_FLOOR) {
            return false;
        }

        $expectedDone = $arrival + max(0, (int) $estimatedMinutes) * 60;

        return $now >= $expectedDone - self::COMPLETION_REMINDER_EARLY_SECONDS
            && $now <= $expectedDone + self::PROGRESSION_REMINDER_GRACE_SECONDS;
    }

    /**
     * Whether this order should get the 24-hour upcoming-order reminder.
     * Only chef-accepted, still-active orders qualify — see
     * REMINDER_ELIGIBLE_STATUSES.
     *
     * @return bool
     */
    public function isEligibleForUpcomingReminder()
    {
        return in_array((int)$this->status, self::REMINDER_ELIGIBLE_STATUSES, true);
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
