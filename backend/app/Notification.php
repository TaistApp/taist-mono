<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'title',
        'body',
        'image',
        'dish_image',
        'fcm_token',
        'user_id',
        'navigation_id',
        'role',
        'is_read',
        'category',
    ];


    public function user()
    {
        return $this->belongsTo(Listener::class);
    }
}


