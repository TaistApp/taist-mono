<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsletterBacklogItem extends Model
{
    protected $table = 'tbl_newsletter_backlog';

    protected $fillable = [
        'user_type',
        'title',
        'body',
        'sort',
        'used_in_edition_id',
        'used_at',
    ];

    protected $casts = [
        'user_type' => 'integer',
        'sort' => 'integer',
        'used_in_edition_id' => 'integer',
        'used_at' => 'datetime',
    ];

    public function scopeAvailable($query)
    {
        return $query->whereNull('used_at');
    }
}
