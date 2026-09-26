<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdBacklogItem extends Model
{
    protected $table = 'tbl_ad_backlog';

    protected $fillable = [
        'angle',
        'primary_text',
        'headline',
        'description',
        'cta',
        'link_url',
        'image_url',
        'sort',
        'used_in_batch_id',
        'used_at',
    ];

    protected $casts = [
        'sort' => 'integer',
        'used_in_batch_id' => 'integer',
        'used_at' => 'datetime',
    ];

    public function scopeAvailable($query)
    {
        return $query->whereNull('used_at');
    }
}
