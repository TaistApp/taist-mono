<?php

use Illuminate\Support\Facades\Route;

// Public routes (no admin session; waitlist + newsletter carry a shared secret)
Route::post('login', 'AdminApiV2Controller@login');
Route::post('waitlist', 'AdminApiV2Controller@waitlistStore');
Route::get('newsletter-recipients', 'AdminApiV2Controller@newsletterRecipients');

// Protected routes
Route::group(['middleware' => ['auth:adminapi']], function () {
    Route::post('logout', 'AdminApiV2Controller@logout');
    Route::get('me', 'AdminApiV2Controller@me');
    Route::post('change-password', 'AdminApiV2Controller@changePassword');

    // Per-admin saved table views (column order/visibility/etc.)
    Route::get('table-views', 'AdminApiV2Controller@tableViews');
    Route::put('table-views/{pageKey}', 'AdminApiV2Controller@tableViewSave');
    Route::delete('table-views/{pageKey}', 'AdminApiV2Controller@tableViewDelete');

    Route::get('dashboard', 'AdminApiV2Controller@dashboard');
    Route::get('chefs', 'AdminApiV2Controller@chefs');
    Route::get('pendings', 'AdminApiV2Controller@pendings');
    Route::get('categories', 'AdminApiV2Controller@categories');
    Route::get('customers', 'AdminApiV2Controller@customers');
    Route::get('orders', 'AdminApiV2Controller@orders');
    Route::get('earnings', 'AdminApiV2Controller@earnings');
    Route::get('contacts', 'AdminApiV2Controller@contacts');

    // Phase 5: Menus + Customizations + Profiles
    Route::get('menus', 'AdminApiV2Controller@menus');
    Route::get('menus/{id}', 'AdminApiV2Controller@menuShow');
    Route::put('menus/{id}', 'AdminApiV2Controller@menuUpdate');
    Route::get('customizations', 'AdminApiV2Controller@customizations');
    Route::get('customizations/{id}', 'AdminApiV2Controller@customizationShow');
    Route::put('customizations/{id}', 'AdminApiV2Controller@customizationUpdate');
    Route::get('profiles', 'AdminApiV2Controller@profiles');
    Route::get('profiles/{id}', 'AdminApiV2Controller@profileShow');
    Route::put('profiles/{id}', 'AdminApiV2Controller@profileUpdate');

    // Phase 6: Chats + Reviews + Transactions
    Route::get('chats', 'AdminApiV2Controller@chats');
    Route::get('reviews', 'AdminApiV2Controller@reviews');
    Route::get('transactions', 'AdminApiV2Controller@transactions');

    // Phase 7: Zipcodes + Discount Codes
    Route::get('zipcodes', 'AdminApiV2Controller@zipcodes');
    Route::put('zipcodes', 'AdminApiV2Controller@zipcodesUpdate');
    Route::get('discount-codes', 'AdminApiV2Controller@discountCodes');
    Route::post('discount-codes', 'AdminApiV2Controller@discountCodeCreate');
    Route::put('discount-codes/{id}', 'AdminApiV2Controller@discountCodeUpdate');
    Route::post('discount-codes/{id}/deactivate', 'AdminApiV2Controller@discountCodeDeactivate');
    Route::post('discount-codes/{id}/activate', 'AdminApiV2Controller@discountCodeActivate');
    Route::get('discount-codes/{id}/usage', 'AdminApiV2Controller@discountCodeUsage');

    // Referrals
    Route::get('referral-settings', 'AdminApiV2Controller@referralSettings');
    Route::put('referral-settings', 'AdminApiV2Controller@referralSettingsUpdate');
    Route::get('referrals', 'AdminApiV2Controller@referrals');
    Route::get('referrals/stats', 'AdminApiV2Controller@referralStats');

    // Dish Photos (content management)
    Route::get('dish-photos', 'AdminApiV2Controller@dishPhotos');
    Route::put('dish-photos/{id}', 'AdminApiV2Controller@dishPhotoUpdate');

    // Social Content Queue
    Route::get('content-queue', 'AdminApiV2Controller@contentQueueIndex');
    Route::put('content-queue/{id}', 'AdminApiV2Controller@contentQueueUpdate');
    Route::post('content-queue/{id}/approve', 'AdminApiV2Controller@contentQueueApprove');
    Route::post('content-queue/{id}/reject', 'AdminApiV2Controller@contentQueueReject');
    Route::get('content-queue/export', 'AdminApiV2Controller@contentQueueExport');

    // Waitlist (admin panel)
    Route::get('waitlist', 'AdminApiV2Controller@waitlist');

    // Newsletter preview (admin panel) — recipient count + sample, no sending
    Route::get('newsletter-preview', 'AdminApiV2Controller@newsletterPreview');

    // Newsletter audience filter settings (admin panel) — controls who Make sends to
    Route::get('newsletter-settings', 'AdminApiV2Controller@newsletterSettings');
    Route::put('newsletter-settings', 'AdminApiV2Controller@newsletterSettingsUpdate');

    // Newsletter editions, backlog and automation (sending runs from newsletter:run)
    Route::get('newsletters', 'NewsletterAdminController@index');
    Route::post('newsletters', 'NewsletterAdminController@store');
    Route::post('newsletters/render', 'NewsletterAdminController@render');
    Route::get('newsletters/{id}', 'NewsletterAdminController@show')->where('id', '[0-9]+');
    Route::put('newsletters/{id}', 'NewsletterAdminController@update')->where('id', '[0-9]+');
    Route::delete('newsletters/{id}', 'NewsletterAdminController@destroy')->where('id', '[0-9]+');
    Route::post('newsletters/{id}/schedule', 'NewsletterAdminController@schedule')->where('id', '[0-9]+');
    Route::post('newsletters/{id}/unschedule', 'NewsletterAdminController@unschedule')->where('id', '[0-9]+');
    Route::post('newsletters/{id}/test', 'NewsletterAdminController@sendTest')->where('id', '[0-9]+');
    Route::post('newsletter-backlog', 'NewsletterAdminController@backlogStore');
    Route::put('newsletter-backlog/{id}', 'NewsletterAdminController@backlogUpdate')->where('id', '[0-9]+');
    Route::delete('newsletter-backlog/{id}', 'NewsletterAdminController@backlogDestroy')->where('id', '[0-9]+');
    Route::put('newsletter-automation', 'NewsletterAdminController@automationUpdate');
    Route::get('newsletter-unsubscribes', 'NewsletterAdminController@unsubscribes');

    // Paid Instagram/Facebook ads: weekly batches, idea backlog, automation (previews run from ads:run)
    Route::get('ad-batches', 'AdAdminController@index');
    Route::post('ad-batches', 'AdAdminController@store');
    Route::post('ad-batches/lint', 'AdAdminController@lint');
    Route::get('ad-batches/{id}', 'AdAdminController@show')->where('id', '[0-9]+');
    Route::put('ad-batches/{id}', 'AdAdminController@update')->where('id', '[0-9]+');
    Route::delete('ad-batches/{id}', 'AdAdminController@destroy')->where('id', '[0-9]+');
    Route::post('ad-batches/{id}/schedule', 'AdAdminController@schedule')->where('id', '[0-9]+');
    Route::post('ad-batches/{id}/unschedule', 'AdAdminController@unschedule')->where('id', '[0-9]+');
    Route::post('ad-batches/{id}/launched', 'AdAdminController@launched')->where('id', '[0-9]+');
    Route::post('ad-batches/{id}/end', 'AdAdminController@end')->where('id', '[0-9]+');
    Route::post('ad-batches/{id}/test', 'AdAdminController@sendTest')->where('id', '[0-9]+');
    Route::get('ad-dish-photo', 'AdAdminController@dishPhoto');
    Route::post('ad-backlog', 'AdAdminController@backlogStore');
    Route::put('ad-backlog/{id}', 'AdAdminController@backlogUpdate')->where('id', '[0-9]+');
    Route::delete('ad-backlog/{id}', 'AdAdminController@backlogDestroy')->where('id', '[0-9]+');
    Route::put('ad-settings', 'AdAdminController@settingsUpdate');

    // Proxy legacy mutation endpoints so frontend baseURL (/admin-api-v2) works
    Route::get('adminapi/change_chef_status', 'AdminapiController@changeChefStatus');
    Route::get('adminapi/change_ticket_status', 'AdminapiController@changeTicketStatus');
    Route::get('adminapi/change_category_status', 'AdminapiController@changeCategoryStatus');
    Route::post('adminapi/delete_stripe_accounts', 'AdminapiController@deleteStripeAccounts');
    Route::post('adminapi/orders/{id}/cancel', 'AdminapiController@adminCancelOrder');
    Route::post('adminapi/create-authentic-review', 'AdminapiController@createAuthenticReview');

    // TEMPORARY: one-time timestamp migration — remove after running
    Route::post('run-convert-timestamps', function () {
        $exitCode = \Illuminate\Support\Facades\Artisan::call('availability:convert-timestamps', ['--execute' => true]);
        return response()->json([
            'exit_code' => $exitCode,
            'output' => \Illuminate\Support\Facades\Artisan::output(),
        ]);
    });
});
