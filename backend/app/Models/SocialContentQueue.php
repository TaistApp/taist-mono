<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SocialContentQueue extends Model
{
    protected $table = 'social_content_queue';

    protected $fillable = [
        'post_id',
        'scheduled_date',
        'day_of_week',
        'time',
        'platform',
        'pillar',
        'caption',
        'hashtags',
        'image_url',
        'target_audience',
        'queue_status',
        'notes',
        'review_quote',
        'review_attribution',
        'source_photo_id',
        'source_menu_id',
        'generated_by',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
    ];

    public function dishPhoto()
    {
        return $this->belongsTo(DishPhoto::class, 'source_photo_id', 'id');
    }

    public function menu()
    {
        return $this->belongsTo(Menus::class, 'source_menu_id', 'id');
    }
}
