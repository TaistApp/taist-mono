<?php

/**
 * Laravel - A PHP Framework For Web Artisans
 *
 * @package  Laravel
 * @author   Taylor Otwell <taylor@laravel.com>
 */

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
);

// This file allows us to emulate Apache's "mod_rewrite" functionality from the
// built-in PHP web server. This provides a convenient way to test a Laravel
// application without having installed a "real" web server software here.

// Admin panel SPA: serve static assets (JS/CSS) directly, everything else gets index.html.
// PHP's built-in server + artisan serve mangles $_SERVER vars when a directory matches
// under the document root, so we handle it here instead of in Laravel routes.
if (preg_match('#^/admin-new(/|$)#', $uri)) {
    $publicPath = __DIR__.'/public'.$uri;
    if (is_file($publicPath)) {
        return false;
    }
    $indexPath = __DIR__.'/public/admin-new/index.html';
    if (file_exists($indexPath)) {
        header('Content-Type: text/html');
        echo file_get_contents($indexPath);
        return;
    }
}

if ($uri !== '/' && file_exists(__DIR__.'/public'.$uri)) {
    return false;
}

require_once __DIR__.'/public/index.php';
