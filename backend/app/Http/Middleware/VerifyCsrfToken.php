<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array
     */
    protected $except = [
        // Newsletter unsubscribe/pause links carry their own HMAC token, and
        // one-click unsubscribes arrive from mail providers without a session.
        'newsletter/*',
        // Same for the ads preview's pause link.
        'ads/pause/*',
    ];
}
