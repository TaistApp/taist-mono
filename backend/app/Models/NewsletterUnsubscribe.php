<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsletterUnsubscribe extends Model
{
    protected $table = 'tbl_newsletter_unsubscribes';

    protected $fillable = [
        'email',
        'user_type',
        'source',
        'edition_id',
    ];

    protected $casts = [
        'user_type' => 'integer',
        'edition_id' => 'integer',
    ];
}
