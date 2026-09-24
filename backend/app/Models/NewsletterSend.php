<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsletterSend extends Model
{
    protected $table = 'tbl_newsletter_sends';

    protected $fillable = [
        'edition_id',
        'email',
        'first_name',
        'status',
        'provider_id',
        'error',
    ];

    protected $casts = [
        'edition_id' => 'integer',
    ];
}
