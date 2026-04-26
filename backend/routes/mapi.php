<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ============== mobile api routes ================

Route::post('register', 'MapiController@register');
Route::post('login', 'MapiController@login');
Route::post('forgot', 'MapiController@forgot');
Route::post('reset_password', 'MapiController@resetpassword');
Route::post('verify_phone', 'MapiController@verifyPhone');
Route::post('complete_chef_quiz', 'MapiController@completeChefQuiz');
Route::get('background_check_order_status', 'MapiController@backgroundCheckOrderStatus');
Route::get('get-version', 'MapiController@getVersion');

// Social-media automation endpoints (taist-social on Vercel + Make.com).
// Auth: `apiKey` request header — validated inside SocialController, same
// pattern as MapiController::getAvailableTimeslots. See SocialController
// docblock for the full flow.
Route::get('social/menu-items/random', 'SocialController@menuItemsRandom');
Route::get('social/menu-lookup', 'SocialController@menuLookup');
Route::get('social/posted-ids', 'SocialController@postedIds');
Route::post('social/posted-receipt', 'SocialController@postedReceipt');

Route::group(['middleware' => ['auth:mapi']], function () {

	Route::get('logout', 'MapiController@logout');

	// CRUD functions
	Route::get('get_allergens', 'MapiController@getAllergens');
	Route::get('get_allergen/{id}', 'MapiController@getAllergen');
	Route::post('create_allergen', 'MapiController@createAllergen');
	Route::post('update_allergen/{id}', 'MapiController@updateAllergen');
	Route::post('remove_allergen/{id}', 'MapiController@removeAllergen');

	Route::get('get_appliances', 'MapiController@getAppliances');
	Route::get('get_appliance/{id}', 'MapiController@getAppliance');
	Route::post('create_appliance', 'MapiController@createAppliance');
	Route::post('update_appliance/{id}', 'MapiController@updateAppliance');
	Route::post('remove_appliance/{id}', 'MapiController@removeAppliance');

	Route::get('get_availabilities', 'MapiController@getAvailabilities');
	Route::get('get_availability/{id}', 'MapiController@getAvailability');
	Route::post('create_availability', 'MapiController@createAvailability');
	Route::post('update_availability/{id}', 'MapiController@updateAvailability');
	Route::post('remove_availability/{id}', 'MapiController@removeAvailability');

	Route::get('get_categories', 'MapiController@getCategories');
	Route::get('get_category/{id}', 'MapiController@getCategory');
	Route::post('create_category', 'MapiController@createCategory');
	Route::post('update_category/{id}', 'MapiController@updateCategory');
	Route::post('remove_category/{id}', 'MapiController@removeCategory');

	Route::get('get_conversations', 'MapiController@getConversations');
	Route::get('get_conversation/{id}', 'MapiController@getConversation');
	Route::post('create_conversation', 'MapiController@createConversation');
	Route::post('update_conversation/{id}', 'MapiController@updateConversation');
	Route::post('remove_conversation/{id}', 'MapiController@removeConversation');

	Route::get('get_customizations', 'MapiController@getCustomizations');
	Route::get('get_customization/{id}', 'MapiController@getCustomization');
	Route::post('create_customization', 'MapiController@createCustomization');
	Route::post('update_customization/{id}', 'MapiController@updateCustomization');
	Route::post('remove_customization/{id}', 'MapiController@removeCustomization');

	Route::get('get_menus', 'MapiController@getMenus');
	Route::get('get_menu/{id}', 'MapiController@getMenu');
	Route::post('create_menu', 'MapiController@createMenu');
	Route::post('update_menu/{id}', 'MapiController@updateMenu');
	Route::post('remove_menu/{id}', 'MapiController@removeMenu');

	// AI-powered menu helpers
	Route::post('generate-menu-description', 'MapiController@generateMenuDescription');
	Route::post('enhance-menu-description', 'MapiController@enhanceMenuDescription');
	Route::post('analyze-menu-metadata', 'MapiController@analyzeMenuMetadata');

	Route::get('get_orders', 'MapiController@getOrders');
	Route::get('get_order/{id}', 'MapiController@getOrder');
	Route::get('get_order_data/{id}', 'MapiController@getOrderData');
	Route::post('create_order', 'MapiController@createOrder');
	Route::post('update_order/{id}', 'MapiController@updateOrder');
	Route::post('remove_order/{id}', 'MapiController@removeOrder');
	
	// Discount Codes
	Route::post('discount-codes/validate', 'MapiController@validateDiscountCode');

	Route::get('get_reviews', 'MapiController@getReviews');
	Route::get('get_review/{id}', 'MapiController@getReview');
	Route::post('create_review', 'MapiController@createReview');
	Route::post('update_review/{id}', 'MapiController@updateReview');
	Route::post('remove_review/{id}', 'MapiController@removeReview');
	Route::post('generate-ai-reviews', 'MapiController@generateAIReviews');

	Route::get('get_tickets', 'MapiController@getTickets');
	Route::get('get_ticket/{id}', 'MapiController@getTicket');
	Route::post('create_ticket', 'MapiController@createTicket');
	Route::post('update_ticket/{id}', 'MapiController@updateTicket');
	Route::post('remove_ticket/{id}', 'MapiController@removeTicket');
	
	Route::get('get_transactions', 'MapiController@getTransactions');
	Route::get('get_transaction/{id}', 'MapiController@getTransaction');
	Route::post('create_transaction', 'MapiController@createTransaction');
	Route::post('update_transaction/{id}', 'MapiController@updateTransaction');
	Route::post('remove_transaction/{id}', 'MapiController@removeTransaction');

	Route::get('get_users', 'MapiController@getUsers');
	Route::get('get_user/{id}', 'MapiController@getUser');
	Route::post('create_user', 'MapiController@createUser');
	Route::post('update_user/{id}', 'MapiController@updateUser');
	Route::post('remove_user/{id}', 'MapiController@removeUser');

	// Chef online status management (OLD - to be deprecated)
	Route::post('toggle_online', 'MapiController@toggleOnline');
	Route::get('get_online_status', 'MapiController@getOnlineStatus');

	// Chef availability override management (REVISED TMA-011)
	Route::post('set_availability_override', 'MapiController@setAvailabilityOverride');
	Route::get('get_availability_overrides', 'MapiController@getAvailabilityOverrides');
	Route::get('get_available_timeslots', 'MapiController@getAvailableTimeslots'); // PUBLIC - for customers

	// Special functions
	Route::get('get_search_chefs/{id}', 'MapiController@getSearchChefs');
	Route::get('get_chef_menus', 'MapiController@getChefMenus');
	Route::get('get_customizations_by_menu_id', 'MapiController@getCustomizationsByMenuID');
	Route::get('get_orders_by_chef', 'MapiController@getOrdersByChef');
	Route::get('get_orders_by_customer', 'MapiController@getOrdersByCustomer');
	Route::get('get_conversation_list_by_user_id', 'MapiController@getConversationListByUserID');
	Route::get('get_conversations_by_user_id', 'MapiController@getConversationsByUserID');
	Route::get('get_conversations_by_order_id', 'MapiController@getConversationsByOrderID');
	Route::get('get_reviews_by_user_id', 'MapiController@getReviewsByUserID');
	Route::get('get_earnings', 'MapiController@getEarnings');
	Route::get('get_order_count', 'MapiController@getOrderCount');
	Route::get('get_avg_rating', 'MapiController@getAVGRating');
	Route::get('get_availability_by_user_id', 'MapiController@getAvailabilityByUserID');
	Route::get('get_zipcodes', 'MapiController@getZipcodes');

	Route::post('update_order_status/{id}', 'MapiController@updateOrderStatus');
	Route::post('background_check/{id}', 'MapiController@backgroundCheck');

	Route::post('add_payment_method', 'MapiController@addPaymentMethod');
	Route::post('get_payment_methods', 'MapiController@getPaymentMethods');
	Route::post('delete_payment_method', 'MapiController@deletePaymentMethod');
	Route::post('add_stripe_account', 'MapiController@addStripeAccount');
	Route::post('create_payment_intent', 'MapiController@createPaymentIntent');
	Route::post('cancel_order_payment', 'MapiController@cancelOrderPayment');
	Route::post('reject_order_payment', 'MapiController@rejectOrderPayment');
	Route::post('complete_order_payment', 'MapiController@completeOrderPayment');
	Route::post('tip_order_payment', 'MapiController@tipOrderPayment');

	Route::post('update_fcm_token', 'MapiController@updateFCMToken');

	Route::get('get_notifications_by_id/{id}', 'API\NotificationController@getNotificationById');
	

});