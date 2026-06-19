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

// Stripe Connect redirect endpoints - these bounce back into the app.
// A bare 302 redirect to a custom scheme (taistexpo://) is unreliable in
// Safari, so we serve a tiny HTML page that JS-redirects immediately and also
// offers a manual tap link as a fallback — this returns the chef to the app
// cleanly after Stripe onboarding.
if (!function_exists('stripeReturnPage')) {
    function stripeReturnPage(string $deepLink): \Illuminate\Http\Response
    {
        $json = json_encode($deepLink);
        $safe = htmlspecialchars($deepLink, ENT_QUOTES);
        $html = '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<title>Returning to Taist…</title>'
            . '<script>window.location.replace(' . $json . ');'
            . 'setTimeout(function(){window.location.href=' . $json . ';},600);</script>'
            . '</head><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;'
            . 'text-align:center;padding:48px 24px;color:#1a1a1a;">'
            . '<p style="font-size:18px;font-weight:600;">Returning you to Taist…</p>'
            . '<p style="margin-top:24px;"><a href="' . $safe . '" '
            . 'style="display:inline-block;background:#fa4616;color:#fff;text-decoration:none;'
            . 'font-weight:700;padding:14px 28px;border-radius:24px;">Open the Taist app</a></p>'
            . '</body></html>';
        return response($html)->header('Content-Type', 'text/html');
    }
}

Route::get('/stripe/complete', function () {
    return stripeReturnPage('taistexpo://stripe-complete?status=success');
});

Route::get('/stripe/refresh', function () {
    return stripeReturnPage('taistexpo://stripe-refresh?status=incomplete');
});

// SMS link target for chat alerts - opens app inbox
Route::get('/open/inbox', function () {
    return redirect('taistexpo://screens/common/inbox');
});

// Shareable chef profile landing page — renders OG tags for social previews
// and redirects mobile users into the app via deep link.
Route::get('/chef/{id}', function ($id) {
    $chef = \App\Listener::where('id', $id)
        ->where('user_type', 2)
        ->where('is_pending', 0)
        ->first();

    if (!$chef) {
        abort(404);
    }

    $reviews = \App\Models\Reviews::where('to_user_id', $chef->id)->get();
    $menus = \App\Models\Menus::where('user_id', $chef->id)->where('is_live', 1)->get();
    $availability = \App\Models\Availabilities::where('user_id', $chef->id)->first();

    $reviewCount = $reviews->count();
    $avgRating = $reviewCount > 0 ? $reviews->avg('rating') : 0;
    $bio = $availability->bio ?? null;

    $menuNames = $menus->pluck('name')->take(3)->implode(', ');
    $ogDescription = $bio
        ? \Illuminate\Support\Str::limit($bio, 120)
        : ($menuNames ? "Try " . $menuNames . " and more on Taist." : "Order homemade food on Taist.");

    $photoBaseUrl = config('app.url') . '/assets/uploads/images/';

    return view('chef-profile', compact(
        'chef', 'menus', 'reviews', 'reviewCount', 'avgRating', 'bio', 'ogDescription', 'photoBaseUrl'
    ));
})->where('id', '[0-9]+');

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
