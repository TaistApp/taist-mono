<?php

namespace App\Services;

use Twilio\Rest\Client;
use Illuminate\Support\Facades\Log;
use Exception;

class TwilioService
{
    protected $client;
    protected $fromNumber;
    protected $enabled;

    public function __construct()
    {
        $this->enabled = !empty(env('TWILIO_SID')) &&
                        !empty(env('TWILIO_TOKEN')) &&
                        !empty(env('TWILIO_FROM'));

        if ($this->enabled) {
            $sid = env('TWILIO_SID');
            $token = env('TWILIO_TOKEN');
            $this->fromNumber = env('TWILIO_FROM');
            $this->client = new Client($sid, $token);
        }
    }

    /**
     * Send SMS verification code
     *
     * @param string $phoneNumber
     * @param string $code
     * @return array ['success' => bool, 'error' => string|null]
     */
    public function sendVerificationCode($phoneNumber, $code)
    {
        // Format phone number to E.164 format (handles parentheses, dashes, etc.)
        $phone = $this->formatPhoneNumber($phoneNumber);

        if (!$phone) {
            Log::error('Invalid phone number for verification', [
                'phone' => $phoneNumber
            ]);
            return [
                'success' => false,
                'error' => 'Invalid phone number format'
            ];
        }

        if (!$this->enabled) {
            Log::warning('Twilio credentials not configured. Cannot send SMS verification.', [
                'phone' => $phone
            ]);
            return [
                'success' => false,
                'error' => 'SMS service not configured'
            ];
        }

        try {
            $message = "Your Taist verification code is: " . $code . "\n\n@taist.app #" . $code;

            $this->client->messages->create(
                $phone,
                [
                    'from' => $this->fromNumber,
                    'body' => $message
                ]
            );

            Log::info('SMS verification code sent successfully', [
                'phone' => $phone
            ]);

            return [
                'success' => true,
                'error' => null
            ];
        } catch (Exception $e) {
            $errorMsg = $e->getMessage();
            Log::error('Failed to send SMS verification code', [
                'phone' => $phone,
                'error' => $errorMsg
            ]);

            return [
                'success' => false,
                'error' => $errorMsg
            ];
        }
    }

    /**
     * Check if Twilio service is enabled and configured
     *
     * @return bool
     */
    public function isEnabled()
    {
        return $this->enabled;
    }

    /**
     * Send order notification SMS to a user
     * Looks up user's phone number and sends SMS with order context
     *
     * @param int $userId - User ID from tbl_users
     * @param string $message - SMS message body
     * @param int $orderId - Order ID for logging and tracking
     * @param string $notificationType - Type descriptor for logging (e.g., 'order_accepted', 'chef_on_way')
     * @return array ['success' => bool, 'error' => string|null]
     */
    public function sendOrderNotification($userId, $message, $orderId, $notificationType)
    {
        // Get user from database
        $user = \App\Listener::find($userId);

        if (!$user) {
            Log::error('User not found for order notification', [
                'user_id' => $userId,
                'order_id' => $orderId,
                'type' => $notificationType
            ]);
            return [
                'success' => false,
                'error' => 'User not found'
            ];
        }

        if (empty($user->phone)) {
            Log::warning('User has no phone number for SMS', [
                'user_id' => $userId,
                'order_id' => $orderId,
                'type' => $notificationType
            ]);
            return [
                'success' => false,
                'error' => 'User has no phone number'
            ];
        }

        // Send SMS with metadata
        $result = $this->sendSMS($user->phone, $message, [
            'user_id' => $userId,
            'order_id' => $orderId,
            'notification_type' => $notificationType
        ]);

        return [
            'success' => $result['success'],
            'error' => $result['error']
        ];
    }

    /**
     * Send a generic SMS notification
     * Core method for all SMS sending operations
     *
     * @param string $phoneNumber - Phone number (will be formatted to E.164)
     * @param string $message - SMS message body
     * @param array $metadata - Optional metadata for logging (order_id, user_id, type, etc)
     * @return array ['success' => bool, 'error' => string|null, 'sid' => string|null]
     */
    public function sendSMS($phoneNumber, $message, $metadata = [])
    {
        // Format phone number
        $formattedPhone = $this->formatPhoneNumber($phoneNumber);

        if (!$formattedPhone) {
            Log::error('Invalid phone number for SMS', array_merge([
                'phone' => $phoneNumber,
            ], $metadata));
            return [
                'success' => false,
                'error' => 'Invalid phone number format',
                'sid' => null
            ];
        }

        // Check if Twilio is enabled
        if (!$this->enabled) {
            Log::warning('Twilio credentials not configured. Cannot send SMS.', array_merge([
                'phone' => $formattedPhone
            ], $metadata));
            return [
                'success' => false,
                'error' => 'SMS service not configured',
                'sid' => null
            ];
        }

        // Truncate message if needed
        $truncatedMessage = $this->truncateMessage($message);

        try {
            $twilioMessage = $this->client->messages->create(
                $formattedPhone,
                [
                    'from' => $this->fromNumber,
                    'body' => $truncatedMessage
                ]
            );

            Log::info('SMS sent successfully', array_merge([
                'phone' => $formattedPhone,
                'message_length' => strlen($truncatedMessage),
                'sid' => $twilioMessage->sid
            ], $metadata));

            return [
                'success' => true,
                'error' => null,
                'sid' => $twilioMessage->sid
            ];
        } catch (Exception $e) {
            $errorMsg = $e->getMessage();
            Log::error('Failed to send SMS', array_merge([
                'phone' => $formattedPhone,
                'error' => $errorMsg
            ], $metadata));

            return [
                'success' => false,
                'error' => $errorMsg,
                'sid' => null
            ];
        }
    }

    /**
     * Validate and format phone number to E.164 format
     * E.164 format: +[country code][number]
     * Example: +15551234567
     *
     * @param string $phoneNumber - Raw phone number
     * @return string|null - Formatted phone number or null if invalid
     */
    private function formatPhoneNumber($phoneNumber)
    {
        if (empty($phoneNumber)) {
            return null;
        }

        // Strip everything except digits and leading +
        $cleaned = preg_replace('/[^\d+]/', '', $phoneNumber);

        // If doesn't start with +, assume US number and add +1
        if (substr($cleaned, 0, 1) !== '+') {
            // If it's a 10-digit number, assume US
            if (strlen($cleaned) === 10) {
                $cleaned = '+1' . $cleaned;
            } elseif (strlen($cleaned) === 11 && substr($cleaned, 0, 1) === '1') {
                // If it's 11 digits starting with 1, add +
                $cleaned = '+' . $cleaned;
            }
        }

        // Basic validation: must start with + and be 11-15 characters
        if (substr($cleaned, 0, 1) !== '+' || strlen($cleaned) < 11 || strlen($cleaned) > 15) {
            Log::warning('Invalid phone number format', ['phone' => $phoneNumber]);
            return null;
        }

        return $cleaned;
    }

    /**
     * Truncate message to SMS character limits
     * Single SMS: 160 characters (GSM-7 encoding)
     * Adds "..." if truncated
     *
     * @param string $message - Original message
     * @param int $maxLength - Max length (default 160)
     * @return string - Truncated message
     */
    private function truncateMessage($message, $maxLength = 160)
    {
        if (strlen($message) <= $maxLength) {
            return $message;
        }

        // Truncate and add ellipsis
        return substr($message, 0, $maxLength - 3) . '...';
    }

    /**
     * Build SMS message from template with placeholder replacement
     * Replaces {placeholder} with values from $data array
     *
     * @param string $template - Message template with {placeholders}
     * @param array $data - Associative array of placeholder => value
     * @return string - Final message with placeholders replaced
     */
    private function buildMessage($template, $data)
    {
        $message = $template;

        foreach ($data as $key => $value) {
            $placeholder = '{' . $key . '}';
            $message = str_replace($placeholder, $value, $message);
        }

        return $message;
    }
}
