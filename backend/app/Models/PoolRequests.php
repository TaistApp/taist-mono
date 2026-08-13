<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A customer's open dish request (pool ordering). First chef to claim wins;
 * claiming creates a normal tbl_orders row at the winner's menu price and
 * links it via order_id.
 */
class PoolRequests extends Model
{
    protected $table = 'tbl_pool_requests';

    public $timestamps = false; // unix-int created_at/updated_at, set manually

    protected $fillable = [
        'customer_user_id',
        'category_id',
        'portions',
        'notes',
        'request_date',
        'request_time',
        'timezone',
        'request_timestamp',
        'status',
        'claimed_by_chef_id',
        'claimed_menu_id',
        'order_id',
        'price_min',
        'price_max',
        'expires_at',
        'created_at',
        'updated_at',
    ];

    public function isOpen(?int $now = null): bool
    {
        $now = $now ?? time();
        return $this->status === 'open' && (int) $this->expires_at > $now;
    }
}
