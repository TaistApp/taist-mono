<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/
/*
Route::get('/', function () {
    return view('home');
});
Route::get('/home', function () {
    return view('home');
});
Route::get('/api_doc', function () {
    return view('api_doc');
});
*/

// Stripe Connect redirect endpoints - these redirect back to the app
Route::get('/stripe/complete', function () {
    return redirect('taistexpo://stripe-complete?status=success');
});

Route::get('/stripe/refresh', function () {
    return redirect('taistexpo://stripe-refresh?status=incomplete');
});

// SMS link target for chat alerts - opens app inbox
Route::get('/open/inbox', function () {
    return redirect('taistexpo://screens/common/inbox');
});

// Public account deletion info page required for Google Play Data Safety policy.
Route::view('/account-deletion', 'account-deletion')->name('account-deletion');

// Backward-compatible contact endpoint used in Play Console declaration.
Route::redirect('/contact', '/account-deletion', 302);

// Explicit trailing-slash variant so local/testing servers behave like production.
Route::redirect('/contact/', '/account-deletion', 302);

// Legal pages served as Blade views so they deploy with the app (not dependent on Railway volume).
// The frontend opens these via WebBrowser.openBrowserAsync at the same URL paths.
Route::view('/assets/uploads/html/privacy.html', 'legal.privacy');
Route::view('/assets/uploads/html/terms.html', 'legal.terms');

// Admin panel SPA catch-all — serves the React app for all /admin-new/* routes.
// Locally: server.php handles this (PHP built-in server quirk with directory paths).
// Production: Nginx try_files serves index.html for non-asset paths.
// This Laravel route is a fallback for any server that routes through index.php normally.
Route::get('/admin-new/{any?}', function () {
    return response(file_get_contents(public_path('admin-new/index.html')), 200)
        ->header('Content-Type', 'text/html');
})->where('any', '.*');
