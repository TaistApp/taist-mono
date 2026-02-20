#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "[1/3] Checking routes are registered"
(
  cd public
  php ../artisan route:list | rg "account-deletion|contact" || true
)

echo "[2/3] Checking route responses via Laravel kernel (no web server needed)"
APP_ROOT="$ROOT_DIR" php <<'PHP'
<?php
$root = getenv('APP_ROOT');
require $root . '/vendor/autoload.php';
$app = require_once $root . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$checks = [
    '/contact' => 302,
    '/contact/' => 302,
    '/account-deletion' => 200,
];

foreach ($checks as $uri => $expectedStatus) {
    $request = Illuminate\Http\Request::create($uri, 'GET');
    $response = $kernel->handle($request);
    $actual = $response->getStatusCode();

    if ($actual !== $expectedStatus) {
        fwrite(STDERR, "FAIL: {$uri} returned {$actual} (expected {$expectedStatus})\n");
        exit(1);
    }

    echo "PASS: {$uri} -> HTTP {$actual}\n";

    if ($uri === '/account-deletion') {
        $body = (string) $response->getContent();
        if (stripos($body, 'Taist Account Deletion') === false) {
            fwrite(STDERR, "FAIL: Expected page content not found on {$uri}\n");
            exit(1);
        }
        echo "PASS: {$uri} contains expected page heading\n";
    }

    $kernel->terminate($request, $response);
}
PHP

echo "[3/3] Success: local account deletion URLs are valid"
echo "Production check after deploy:"
echo "  curl -sS -I https://taist.app/contact/"
echo "  curl -sS -I https://taist.app/account-deletion"
