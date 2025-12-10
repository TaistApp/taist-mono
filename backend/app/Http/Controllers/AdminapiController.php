<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Hash;
use Validator;

use App\Listener;
use App\Models\Admins;
use App\Models\Allergens;
use App\Models\Appliances;
use App\Models\Availabilities;
use App\Models\Categories;
use App\Models\Conversations;
use App\Models\Customizations;
use App\Models\Meals;
use App\Models\Menus;
use App\Models\Orders;
use App\Models\Reviews;
use App\Models\Tickets;
use App\Models\Transactions;
use App\Models\NotificationTemplates;
use App\Models\PaymentMethodListener;
use App\Notification;
use Illuminate\Support\Str;
use DB;
//require 'api/vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\Reader\Xlsx; 
use Kreait\Laravel\Firebase\Facades\Firebase;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Exception\FirebaseException;


class AdminapiController extends Controller
{
    protected $request; // request as an attribute of the controllers
    protected $notification; // Push Notification

    public function __construct(Request $request)
    {
        $this->request = $request;
        $this->notification = Firebase::messaging();
    }

    private function notification($token, $title, $body, $role)
    {
        $message = CloudMessage::fromArray([
            'token' => $token,
            'notification' => [
                'title' => $title,
                'body' => $body,
                'role' => $role
            ]
        ]);

        $this->notification->send($message);
    }

    public function resetPassword(Request $request) {
        $auser = app(Admins::class)->where(['id'=>$request->id])->first();
        if (isset($request->oldpassword)) {
            if (Hash::check($request->oldpassword, $auser->password)) {
                app(Admins::class)->where(['id'=>$request->id])->update(['password'=>bcrypt($request->password)]);
                return response()->json(['success' => 1]);
            } else {
                return response()->json(['success' => 0, 'error'=>"Current password doesn't match."]);
            }
        } else {
            app(Admins::class)->where(['id'=>$request->id])->update(['password'=>bcrypt($request->password)]);
            return response()->json(['success' => 1]);
        }
    }
    
    public function changeChefStatus(Request $request) {
        $ids = explode(',', $request->ids);
        $auser = app(Listener::class)->whereIn('id',$ids)->get();
        if (isset($auser)) {
            if ($request->status == 0) {
                app(Listener::class)->whereIn('id',$ids)->update(['is_pending'=>1]);
            } else {
                if ($request->status == 4) {
                    app(Listener::class)->whereIn('id',$ids)->delete();
                } else {
                    app(Listener::class)->whereIn('id',$ids)->update(['verified'=>$request->status, 'is_pending'=>0]);
                    if ($request->status == 1) {
                        foreach($ids as $uid) {
                            $approved_user = app(Listener::class)->where('id',$uid)->first();
                            if ($approved_user->fcm_token) {
                                $notification = app(NotificationTemplates::class)->where(['id'=>1])->first();
                                if ($notification) {
                                    try {
                                        $this->notification($approved_user->fcm_token, $notification->subject, $notification->push, $role = 'chef');
                                        Notification::create([
                                            'title' => $notification->template_name,
                                            'body' => $notification->push,
                                            'image' => $approved_user->photo ?? 'N/A',
                                            'fcm_token' => $approved_user->fcm_token,
                                            'user_id' => $approved_user->id,
                                            'navigation_id' => $approved_user->id,
                                            'role' => $role,
                                        ]);
                                    }  catch(FirebaseException $e) {
                                        $errorMsg = $e->getMessage();
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return response()->json(['success' => 1]);
        } else {
            return response()->json(['success' => 0, 'error'=>"No chef user with the provided ID."]);
        }
    }

    public function changeTicketStatus(Request $request) {
        $ids = explode(',', $request->ids);
        $tickets = app(Tickets::class)->whereIn('id',$ids)->get();
        if (isset($tickets)) {
            app(Tickets::class)->whereIn('id',$ids)->update(['status'=>$request->status]);
            return response()->json(['success' => 1]);
        } else {
            return response()->json(['success' => 0, 'error'=>"No ticket with the provided ID."]);
        }
    }
    
    public function changeCategoryStatus(Request $request) {
        $ids = explode(',', $request->ids);
        $tickets = app(Categories::class)->whereIn('id',$ids)->get();
        if (isset($tickets)) {
            app(Categories::class)->whereIn('id',$ids)->update(['status'=>$request->status]);
            return response()->json(['success' => 1]);
        } else {
            return response()->json(['success' => 0, 'error'=>"No category with the provided ID."]);
        }
    }

    public function deleteStripeAccounts(Request $request)
    {
        include $_SERVER['DOCUMENT_ROOT'] . '/include/config.php';
        require_once('../stripe-php/init.php');

        $ids = explode(',', $request->input('ids'));

        if (empty($ids)) {
            return response()->json(['error' => 'No IDs provided.'], 400);
        }

        $chefs = PaymentMethodListener::query()
            ->join('tbl_users', 'tbl_payment_method_listener.user_id', '=', 'tbl_users.id')
            ->whereIn('tbl_payment_method_listener.user_id', $ids)
            ->whereNotNull('tbl_users.email')
            ->select(
                'tbl_payment_method_listener.*',
                'tbl_users.email'
            )
            ->get();



        $stripe = new \Stripe\StripeClient($stripe_key);

        foreach ($chefs as $chef) {
            try {
                $accounts = $stripe->accounts->all(['limit' => 100]);

                foreach ($accounts->data as $account) {
                    if (isset($account->email) && strtolower($account->email) === strtolower($chef->email)) {
                        
                        $disabledReason = $account->requirements['disabled_reason'] ?? null;
                        $accountStatus = $account->status ?? null;

                        if (!empty($disabledReason) || $accountStatus === 'rejected') {
                            \Log::info("Deleting account {$account->id} for email {$chef->email} — Status: " . ($disabledReason ?? $accountStatus));
                            $stripe->accounts->delete($account->id, []);
                        }
                    }
                }

            } catch (\Exception $e) {
                \Log::error("Failed to delete Stripe account for chef email {$chef->email}: " . $e->getMessage());
                continue;
            }
        }

        return response()->json(['message' => 'Stripe accounts deleted where applicable.']);
    }

    /**
     * Admin-initiated order cancellation with detailed tracking
     */
    public function adminCancelOrder(Request $request, $id)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'cancellation_reason' => 'required|string|min:10',
            'refund_percentage' => 'required|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => 0, 
                'error' => $validator->errors()->first()
            ], 400);
        }

        // Get the admin user
        $admin = Auth::guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => 0, 'error' => 'Unauthorized'], 401);
        }

        // Find the order
        $order = app(Orders::class)->where('id', $id)->first();
        
        if (!$order) {
            return response()->json(['success' => 0, 'error' => 'Order not found'], 404);
        }

        // Check if order can be cancelled
        if (in_array($order->status, [4, 5, 6])) {
            return response()->json([
                'success' => 0, 
                'error' => 'Order is already cancelled, rejected, or expired'
            ], 400);
        }

        // Process refund if applicable
        $refundAmount = ($order->total_price * $request->refund_percentage) / 100;
        $refundStripeId = null;
        
        if ($request->refund_percentage > 0 && $order->payment_token) {
            try {
                include $_SERVER['DOCUMENT_ROOT'] . '/include/config.php';
                require_once('../stripe-php/init.php');
                $stripe = new \Stripe\StripeClient($stripe_key);
                
                $refund = $stripe->refunds->create([
                    'payment_intent' => $order->payment_token, 
                    'amount' => $refundAmount * 100 // Stripe uses cents
                ]);
                
                $refundStripeId = $refund->id;
            } catch (\Exception $e) {
                return response()->json([
                    'success' => 0, 
                    'error' => 'Failed to process refund: ' . $e->getMessage()
                ], 500);
            }
        }

        // Update order with cancellation metadata
        $order->update([
            'status' => 4, // Cancelled
            'cancelled_by_user_id' => $admin->id,
            'cancelled_by_role' => 'admin',
            'cancellation_type' => 'admin_action',
            'cancellation_reason' => $request->cancellation_reason,
            'cancelled_at' => now(),
            'refund_amount' => $refundAmount,
            'refund_percentage' => $request->refund_percentage,
            'refund_processed_at' => $refundStripeId ? now() : null,
            'refund_stripe_id' => $refundStripeId,
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => 1,
            'data' => $order,
            'message' => 'Order cancelled successfully'
        ]);
    }

    /**
     * Admin creates an authentic "seed" review for a chef
     * Used to bootstrap new chefs with initial reviews
     * Automatically generates 3 AI reviews based on this review
     */
    public function createAuthenticReview(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'to_user_id' => 'required|integer|exists:tbl_users,id',
                'rating' => 'required|numeric|min:1|max:5',
                'review' => 'required|string|min:20|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => 0,
                    'error' => $validator->errors()->first()
                ]);
            }

            // Create authentic review (admin-created)
            $review = app(Reviews::class)->create([
                'order_id' => 0, // Admin-created, no associated order
                'from_user_id' => 0, // Anonymous customer
                'to_user_id' => $request->to_user_id,
                'rating' => $request->rating,
                'review' => $request->review,
                'tip_amount' => 0,
                'source' => 'admin_created',
                'parent_review_id' => null,
                'ai_generation_params' => null,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Automatically generate 3 AI reviews based on this
            $generatedReviews = [];

            if ($request->generate_ai !== false) { // Default to true
                $openAI = new \App\Services\OpenAIService();

                $variants = [
                    ['focus' => 'food_quality', 'length' => 'short'],
                    ['focus' => 'presentation_service', 'length' => 'medium'],
                    ['focus' => 'overall_experience', 'length' => 'medium']
                ];

                foreach ($variants as $index => $variant) {
                    // Build prompt
                    $ratingDescription = $review->rating >= 4.5 ? 'very positive' :
                                       ($review->rating >= 4.0 ? 'positive' :
                                       ($review->rating >= 3.0 ? 'neutral to positive' :
                                       ($review->rating >= 2.0 ? 'mixed' : 'critical')));

                    $lengthGuide = $variant['length'] === 'short' ? '40-70 characters' : '70-100 characters';

                    $focusInstructions = [
                        'food_quality' => 'Focus on taste, flavors, ingredients, and cooking technique.',
                        'presentation_service' => 'Focus on plating, presentation, and chef professionalism.',
                        'overall_experience' => 'Focus on overall satisfaction and value for money.'
                    ];

                    $prompt = "You are writing a {$ratingDescription} customer review for a personal chef on Taist.

AUTHENTIC REVIEW (as reference):
Rating: {$review->rating}/5 stars
Review: \"{$review->review}\"

YOUR TASK:
Write a NEW, UNIQUE review that feels natural and authentic. DO NOT copy the original review.

REQUIREMENTS:
- {$lengthGuide} maximum
- Match the {$review->rating}-star rating sentiment ({$ratingDescription})
- {$focusInstructions[$variant['focus']]}
- Sound like a real customer, not AI
- Be specific but varied from the original review
- NO flowery language (no \"divine,\" \"heavenly,\" \"exquisite,\" \"timeless\")
- NO generic phrases (\"good food,\" \"nice meal,\" \"great experience\")

Write only the review text:";

                    $result = $openAI->chat(
                        $prompt,
                        \App\Services\OpenAIService::MODEL_GPT_5_MINI,
                        ['max_tokens' => 150]
                    );

                    if ($result['success']) {
                        $aiReviewText = trim($result['content']);

                        // Vary rating slightly
                        $variance = (rand(0, 10) / 20);
                        $direction = rand(0, 1) ? 1 : -1;
                        $newRating = $review->rating + ($direction * $variance);
                        $newRating = max(1, min(5, $newRating));
                        $newRating = round($newRating * 2) / 2;

                        $aiReview = app(Reviews::class)->create([
                            'order_id' => 0,
                            'from_user_id' => 0,
                            'to_user_id' => $request->to_user_id,
                            'rating' => $newRating,
                            'review' => $aiReviewText,
                            'tip_amount' => 0,
                            'source' => 'ai_generated',
                            'parent_review_id' => $review->id,
                            'ai_generation_params' => json_encode([
                                'model' => 'gpt-5-mini',
                                'variant' => $index + 1,
                                'focus' => $variant['focus'],
                                'length' => $variant['length'],
                                'generated_at' => time()
                            ]),
                            'created_at' => date('Y-m-d H:i:s'),
                            'updated_at' => date('Y-m-d H:i:s')
                        ]);

                        $generatedReviews[] = $aiReview;
                    }
                }
            }

            return response()->json([
                'success' => 1,
                'message' => 'Authentic review created' . (count($generatedReviews) > 0 ? ' with ' . count($generatedReviews) . ' AI variants' : ''),
                'review' => $review,
                'ai_reviews' => $generatedReviews
            ]);

        } catch (\Exception $e) {
            \Log::error('Create Authentic Review Error', [
                'message' => $e->getMessage(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => 0,
                'error' => 'An error occurred while creating review'
            ]);
        }
    }


}