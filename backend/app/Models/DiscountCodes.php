<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class DiscountCodes extends Model
{
    protected $table = 'tbl_discount_codes';
    
    protected $fillable = [
        'code',
        'description',
        'discount_type',
        'discount_value',
        'max_uses',
        'max_uses_per_customer',
        'current_uses',
        'valid_from',
        'valid_until',
        'minimum_order_amount',
        'maximum_discount_amount',
        'is_active',
        'created_by_admin_id',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'minimum_order_amount' => 'decimal:2',
        'maximum_discount_amount' => 'decimal:2',
        'is_active' => 'boolean',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
        'max_uses' => 'integer',
        'max_uses_per_customer' => 'integer',
        'current_uses' => 'integer',
    ];

    /**
     * Relationship to usage records
     */
    public function usages()
    {
        return $this->hasMany(DiscountCodeUsage::class, 'discount_code_id');
    }

    /**
     * Relationship to admin who created it
     */
    public function createdBy()
    {
        return $this->belongsTo(Admins::class, 'created_by_admin_id');
    }

    /**
     * Relationship to orders that used this code
     */
    public function orders()
    {
        return $this->hasMany(Orders::class, 'discount_code_id');
    }

    /**
     * Check if code is currently valid
     * 
     * @return array ['valid' => bool, 'reason' => string|null]
     */
    public function isValid()
    {
        // Check if active
        if (!$this->is_active) {
            return ['valid' => false, 'reason' => 'This code is no longer active'];
        }

        $now = Carbon::now();

        // Check if code is active yet
        if ($this->valid_from && $now->lt($this->valid_from)) {
            return ['valid' => false, 'reason' => 'This code is not yet active'];
        }

        // Check if code has expired
        if ($this->valid_until && $now->gt($this->valid_until)) {
            return ['valid' => false, 'reason' => 'This code has expired'];
        }

        // Check if max uses reached
        if ($this->max_uses && $this->current_uses >= $this->max_uses) {
            return ['valid' => false, 'reason' => 'This code has reached its maximum number of uses'];
        }

        return ['valid' => true];
    }

    /**
     * Check if a specific customer can use this code
     * 
     * @param int $customerId
     * @return array ['valid' => bool, 'reason' => string|null]
     */
    public function canCustomerUse($customerId)
    {
        // First check if code itself is valid
        $codeValidation = $this->isValid();
        if (!$codeValidation['valid']) {
            return $codeValidation;
        }

        // Check customer-specific usage limit
        $customerUses = $this->usages()
            ->where('customer_user_id', $customerId)
            ->count();

        if ($customerUses >= $this->max_uses_per_customer) {
            return ['valid' => false, 'reason' => 'You have already used this code the maximum number of times'];
        }

        return ['valid' => true];
    }

    /**
     * Calculate discount for given order amount
     * 
     * @param float $orderAmount
     * @return array ['valid' => bool, 'discount_amount' => float, 'final_amount' => float, 'reason' => string|null]
     */
    public function calculateDiscount($orderAmount)
    {
        // Check minimum order requirement
        if ($this->minimum_order_amount && $orderAmount < $this->minimum_order_amount) {
            return [
                'valid' => false, 
                'reason' => 'Minimum order of $' . number_format($this->minimum_order_amount, 2) . ' required to use this code'
            ];
        }

        $discountAmount = 0;

        // Calculate based on discount type
        if ($this->discount_type === 'fixed') {
            // Fixed dollar amount
            $discountAmount = $this->discount_value;
            
            // Don't allow discount to exceed order amount
            if ($discountAmount > $orderAmount) {
                $discountAmount = $orderAmount;
            }
        } 
        else if ($this->discount_type === 'percentage') {
            // Percentage discount
            $discountAmount = ($orderAmount * $this->discount_value) / 100;
            
            // Apply maximum discount cap if set
            if ($this->maximum_discount_amount && $discountAmount > $this->maximum_discount_amount) {
                $discountAmount = $this->maximum_discount_amount;
            }
            
            // Don't allow discount to exceed order amount
            if ($discountAmount > $orderAmount) {
                $discountAmount = $orderAmount;
            }
        }

        $finalAmount = $orderAmount - $discountAmount;

        return [
            'valid' => true,
            'discount_amount' => round($discountAmount, 2),
            'final_amount' => round($finalAmount, 2)
        ];
    }

    /**
     * Increment usage counter
     * 
     * @return void
     */
    public function incrementUsage()
    {
        $this->increment('current_uses');
    }

    /**
     * Get formatted discount display string
     * 
     * @return string
     */
    public function getFormattedDiscount()
    {
        if ($this->discount_type === 'fixed') {
            return '$' . number_format($this->discount_value, 2) . ' off';
        } else {
            return $this->discount_value . '% off';
        }
    }

    /**
     * Scope to get only active codes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get only currently valid codes (active + within date range)
     */
    public function scopeCurrentlyValid($query)
    {
        $now = Carbon::now();
        
        return $query->where('is_active', true)
            ->where(function($q) use ($now) {
                $q->whereNull('valid_from')
                  ->orWhere('valid_from', '<=', $now);
            })
            ->where(function($q) use ($now) {
                $q->whereNull('valid_until')
                  ->orWhere('valid_until', '>=', $now);
            });
    }
}





