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
//
// IMPORTANT: the HTML is built INLINE in each closure (not via a global helper
// defined in this file). With `route:cache` on deploy, route closures are
// serialized and this file is NOT re-loaded at request time, so any helper
// function defined here would be undefined when the cached route runs
// ("Call to undefined function ..."). Self-contained closures are cache-safe.
Route::get('/stripe/complete', function () {
    $deepLink = 'taistexpo://stripe-complete?status=success';
    return \App\Helpers\AppHelper::stripeReturnPage($deepLink);
});

Route::get('/stripe/refresh', function () {
    $deepLink = 'taistexpo://stripe-refresh?status=incomplete';
    return \App\Helpers\AppHelper::stripeReturnPage($deepLink);
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

// Referral invite landing page — the target of the SMS invite link
// (https://taist.app/r/{code}). Previously this 404'd because no route existed.
// Referral credit is matched by the recipient's PHONE at signup, so the code in
// the URL is only used here to personalize the offer; we never 404 on an unknown
// code because these links live in people's texts indefinitely.
Route::get('/r/{code}', function ($code) {
    $referrer = \App\Listener::where('referral_code', $code)->first();
    $referrerName = $referrer ? ($referrer->first_name ?: 'A friend') : null;

    $settings = \App\Models\ReferralSettings::getSettings();
    $discountText = ($settings && $settings->is_active) ? $settings->getFormattedDiscount() : null;

    $chefId = request()->query('chef');
    $chef = $chefId
        ? \App\Listener::where('id', $chefId)->where('user_type', 2)->where('is_pending', 0)->first()
        : null;

    return view('referral-landing', compact('referrerName', 'discountText', 'code', 'chef'));
})->where('code', '[A-Za-z0-9\-]+');

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
