<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Listener;
use App\Notification;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function getNotificationById(Request $request, $id) 
    {
        try {
            $notifications = Notification::where('user_id', $id)->orderBy('id', 'desc')->get();

            $formattedNotifications = $notifications->map(function ($notification) {
                if ($notification->title === 'Review and tip for Chef' || $notification->title === 'Review for chef') {
                    $review = json_decode($notification->body, true);
                    return [
                        'id' => $notification->id,
                        'title' => $notification->title,
                        'tip' => $review['tip'],
                        'review' => $review['review'],
                        'ratings' => $review['ratings'],
                        'navigation_id' => $notification->navigation_id,
                        'fcm_token' => $notification->fcm_token,
                        'role' => $notification->role,
                        'user_id' => $notification->user_id,
                        'image' => $notification->image,
                        'dish_image' => $notification->dish_image,
                        'is_read' => (bool) $notification->is_read,
                        'category' => $notification->category,
                        'updated_at' => $notification->updateed_at,
                        'created_at' => $notification->created_at,
                    ];
                }

                return $notification;
            });

            return response()->json(['success' => true, 'data' => $formattedNotifications]);

        } catch (Exception $e) {
            $errorMsg = "Unable to get notification: " . $e->getMessage();
            return response()->json(['success' => false, 'error' => $errorMsg]);
        }
    }

    public function markRead(Request $request)
    {
        try {
            $userId = $request->input('user_id');
            if (!$userId) {
                return response()->json(['success' => false, 'error' => 'user_id is required']);
            }

            $updated = Notification::where('user_id', $userId)
                ->where('is_read', false)
                ->update(['is_read' => true]);

            return response()->json(['success' => true, 'marked' => $updated]);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    public function getUnreadCount(Request $request, $id)
    {
        try {
            $count = Notification::where('user_id', $id)
                ->where('is_read', false)
                ->count();

            return response()->json(['success' => true, 'count' => $count]);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Record that a user granted notification permission.
     *
     * Every branch logs. push_opted_in sat at 0 for all 174 chefs in production
     * and nothing anywhere could say whether the app had never called this or
     * had called it and been turned away: the endpoint wrote no log, and the
     * caller discarded the response. The log line is the only thing that tells
     * those two apart, so it is not optional.
     */
    public function optInPush(Request $request)
    {
        $userId = $request->input('user_id');

        try {
            if (!$userId) {
                Log::warning('push opt-in rejected: no user_id', ['ip' => $request->ip()]);
                return response()->json(['success' => false, 'error' => 'user_id is required']);
            }

            // Any signed-in user could flip anyone else's flag. The app only ever
            // sends its own id, so requiring that costs nothing and closes it.
            $caller = Auth::guard('mapi')->user();
            if ($caller && (int) $caller->id !== (int) $userId) {
                Log::warning('push opt-in rejected: not the caller', [
                    'caller_id' => (int) $caller->id,
                    'user_id' => (int) $userId,
                ]);
                return response()->json(['success' => false, 'error' => 'User not found']);
            }

            $user = Listener::where('id', $userId)->first();
            if (!$user) {
                Log::warning('push opt-in rejected: user not found', ['user_id' => (int) $userId]);
                return response()->json(['success' => false, 'error' => 'User not found']);
            }

            $user->update(['push_opted_in' => true]);

            Log::info('push opt-in recorded', [
                'user_id' => (int) $userId,
                'user_type' => (int) $user->user_type,
                'has_fcm_token' => !empty($user->fcm_token),
            ]);

            return response()->json(['success' => true]);
        } catch (Exception $e) {
            Log::error('push opt-in failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    public function getChefsWithDistance($customerLatitude, $customerLongitude, $radius = 20) {
        $chefs = DB::table('users')
            ->select(
                'users.*',
                DB::raw("(6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance")
            )
            ->where('user_type', 2)
            ->having('distance', '<=', $radius)
            ->setBindings([$customerLatitude, $customerLongitude, $customerLatitude]) // Prevent SQL injection
            ->orderBy('distance', 'asc') 
            ->get();
    
        return $chefs;
    }


    public function getCustomerChefs(Request $request, $id)
    {
        $customer = Listener::where('id', $id)->first();
        $radius = 20;

        $chefsWithDistance = $this->getChefsWithDistance($customer->latitude, $customer->longitude, $radius);

        return response()->json([
            'success' => true,
            'data' => $chefsWithDistance
        ]);
    }


}
