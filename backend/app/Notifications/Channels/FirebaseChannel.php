<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;
use Kreait\Laravel\Firebase\Facades\Firebase;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Exception\FirebaseException;
use Illuminate\Support\Facades\Log;

class FirebaseChannel
{
    /**
     * Send the given notification.
     *
     * @param  mixed  $notifiable
     * @param  \Illuminate\Notifications\Notification  $notification
     * @return void
     */
    public function send($notifiable, Notification $notification)
    {
        // Skip if user doesn't have FCM token
        if (!$notifiable->fcm_token) {
            return;
        }

        // Get the Firebase message data from the notification
        $firebaseData = $notification->toFirebase($notifiable);

        try {
            $messaging = Firebase::messaging();

            $message = CloudMessage::fromArray([
                'token' => $notifiable->fcm_token,
                'notification' => [
                    'title' => $firebaseData['title'],
                    'body' => $firebaseData['body'],
                ],
                'data' => $firebaseData['data'] ?? [],
            ]);

            $messaging->send($message);
        } catch (FirebaseException $e) {
            // Log the error but don't throw - allows notification to be saved to database even if push fails
            Log::error('Firebase push notification failed', [
                'user_id' => $notifiable->id,
                'fcm_token' => $notifiable->fcm_token,
                'notification' => get_class($notification),
                'error' => $e->getMessage(),
            ]);
        } catch (\Exception $e) {
            // Firebase not configured - skip push notifications
            Log::warning('Skipping push notification - Firebase not configured', [
                'user_id' => $notifiable->id,
                'notification' => get_class($notification),
                'error' => $e->getMessage(),
            ]);
        }
    }
}
