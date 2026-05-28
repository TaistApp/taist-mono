<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Waitlist extends Model
{
    protected $table = 'waitlist';

    protected $fillable = [
        'email',
        'first_name',
        'zip',
        'user_type',
        'source',
        'household',
        'referral',
        'converted',
        'converted_user_id',
    ];

    protected $casts = [
        'user_type' => 'integer',
        'converted' => 'boolean',
        'converted_user_id' => 'integer',
    ];

    /**
     * The app user this waitlist entry converted to (if any).
     */
    public function convertedUser()
    {
        return $this->belongsTo(\App\Listener::class, 'converted_user_id', 'id');
    }
}
