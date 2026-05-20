<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DishPhoto extends Model
{
    protected $table = 'tbl_dish_photos';

    protected $fillable = [
        'order_id',
        'chef_user_id',
        'menu_id',
        'filename',
        'status',
        'admin_notes',
    ];

    public function chef()
    {
        return $this->belongsTo(Listener::class, 'chef_user_id', 'id');
    }

    public function menu()
    {
        return $this->belongsTo(Menus::class, 'menu_id', 'id');
    }

    public function order()
    {
        return $this->belongsTo(Orders::class, 'order_id', 'id');
    }
}
