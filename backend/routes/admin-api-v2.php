<?php

use Illuminate\Support\Facades\Route;

// Public routes (no auth required)
Route::post('login', 'AdminApiV2Controller@login');

// Protected routes
Route::group(['middleware' => ['auth:adminapi']], function () {
    Route::post('logout', 'AdminApiV2Controller@logout');
    Route::get('me', 'AdminApiV2Controller@me');
    Route::post('change-password', 'AdminApiV2Controller@changePassword');
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
