<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Listener;

class DiscountCodeUsage extends Model
{
    protected $table = 'tbl_discount_code_usage';
    
    public $timestamps = false; // Using custom used_at field instead
    
    protected $fillable = [
        'discount_code_id',
        'order_id',
        'customer_user_id',
        'discount_amount',
        'order_total_before_discount',
        'order_total_after_discount',
    ];

    protected $casts = [
        'discount_amount' => 'decimal:2',
        'order_total_before_discount' => 'decimal:2',
        'order_total_after_discount' => 'decimal:2',
        'used_at' => 'datetime',
    ];

    /**
     * Relationship to discount code
     */
    public function discountCode()
    {
        return $this->belongsTo(DiscountCodes::class, 'discount_code_id');
    }

    /**
     * Relationship to order
     */
    public function order()
    {
        return $this->belongsTo(Orders::class, 'order_id');
    }

    /**
     * Relationship to customer
     */
    public function customer()
    {
        return $this->belongsTo(Listener::class, 'customer_user_id');
    }

    /**
     * Get formatted savings amount
     * 
     * @return string
     */
    public function getFormattedSavings()
    {
        return '$' . number_format($this->discount_amount, 2);
    }

    /**
     * Get usage summary for display
     * 
     * @return array
     */
    public function getUsageSummary()
    {
        $customer = $this->customer;
        
        return [
            'customer_name' => $customer ? $customer->first_name . ' ' . $customer->last_name : 'Unknown',
            'customer_email' => $customer ? $customer->email : 'N/A',
            'order_id' => $this->order_id,
            'discount_amount' => $this->discount_amount,
            'original_total' => $this->order_total_before_discount,
            'final_total' => $this->order_total_after_discount,
            'used_at' => $this->used_at,
        ];
    }
}





