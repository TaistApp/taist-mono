<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Admin Panel Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration values for the Taist admin dashboard
    |
    */

    'title' => env('APP_NAME', 'Taist') . ' - Admin Panel',

    'timezone' => env('ADMIN_TIMEZONE', 'America/Los_Angeles'),

    'pagination_limit' => env('ADMIN_PAGINATION_LIMIT', 10),

    // Server URL for JavaScript (legacy compatibility)
    'server_url' => '/',
];







