<?php

namespace App\Services;

use App\Listener;
use App\Models\Orders;
use App\Models\Menus;
use App\Services\TwilioService;
use App\Helpers\TimezoneHelper;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Order SMS Notification Service
 *
 * Handles all order-related SMS notifications for chefs and customers
 * Uses TwilioService for actual SMS delivery
 */
class OrderSmsService
{
    protected $twilioService;

    public function __construct(TwilioService $twilioService)
    {
        $this->twilioService = $twilioService;
    }

    /**
     * Send "new order request" SMS to chef
     * Sent when customer creates a new order
     *
     * @param int $orderId
     * @return array ['success' => bool, 'error' => string|null]
     */
    public function sendNewOrderNotification($orderId)
    {
        try {
            $data = $this->getOrderData($orderId);

            if (!$data) {
                return ['success' => false, 'error' => 'Order data not found'];
            }

            $message = "New order request! ORDER#" . sprintf('%07d', $orderId) .
                       " from {$data['customer_name']} for {$data['order_date_formatted']}. " .
                       "{$data['menu_title']} x{$data['amount']}. Total: \${$data['total_price']}. " .
                       "Accept within 30 minutes. View in app.";

            return $this->twilioService->sendOrderNotification(
                $data['chef_user_id'],
                $message,
                $orderId,
                'new_order_request'
            );
        } catch (Exception $e) {
            Log::error('Failed to send new order notification', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send "order accepted" SMS to customer
     * Sent when chef accepts the order
     *
     * @param int $orderId
     * @return array ['success' => bool, 'error' => string|null]
     */
    public function sendOrderAcceptedNotification($orderId)
    {
        try {
            $data = $this->getOrderData($orderId);

            if (!$data) {
                return ['success' => false, 'error' => 'Order data not found'];
            }

            $message = "Great news! Chef {$data['chef_name']} accepted your order ORDER#" .
                       sprintf('%07d', $orderId) . " for {$data['order_date_formatted']}. " .
                       "We'll notify you when they're on the way!";

            return $this->twilioService->sendOrderNotification(
                $data['customer_user_id'],
                $message,
                $orderId,
                'order_accepted'
            );
        } catch (Exception $e) {
            Log::error('Failed to send order accepted notification', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send "order rejected" SMS to customer
     * Sent when chef rejects the order
     *
     * @param int $orderId
     * @return array ['success' => bool, 'error' => string|null]
     */
    public function sendOrderRejectedNotification($orderId)
    {
        try {
            $data = $this->getOrderData($orderId);

            if (!$data) {
                return ['success' => false, 'error' => 'Order data not found'];
            }

            $message = "Sorry, Chef {$data['chef_name']} is unable to fulfill your order ORDER#" .
                       sprintf('%07d', $orderId) . ". You will receive a full refund within 5-7 business days. " .
                       "Browse other chefs in the app!";

            return $this->twilioService->sendOrderNotification(
                $data['customer_user_id'],
                $message,
                $orderId,
                'order_rejected'
            );
        } catch (Exception $e) {
            Log::error('Failed to send order rejected notification', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send "chef on the way" SMS to customer
     * Sent when chef marks order as on the way
     *
     * @param int $orderId
     * @return array ['success' => bool, 'error' => string|null]
     */
    public function sendChefOnTheWayNotification($orderId)
    {
        try {
            $data = $this->getOrderData($orderId);

            if (!$data) {
                return ['success' => false, 'error' => 'Order data not found'];
            }

            $message = "Your chef is on the way! ORDER#" .
                       sprintf('%07d', $orderId) . " should arrive around {$data['order_time']}.";

            return $this->twilioService->sendOrderNotification(
                $data['customer_user_id'],
                $message,
                $orderId,
                'chef_on_way'
            );
        } catch (Exception $e) {
            Log::error('Failed to send chef on the way notification', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send "order complete" SMS to customer
     * Sent when chef marks order as complete
     *
     * @param int $orderId
     * @return array ['success' => bool, 'error' => string|null]
     */
    public function sendOrderCompleteNotification($orderId)
    {
        try {
            $data = $this->getOrderData($orderId);

            if (!$data) {
                return ['success' => false, 'error' => 'Order data not found'];
            }

            $message = "Your order is complete! ORDER#" . sprintf('%07d', $orderId) . ". " .
                       "Hope you enjoyed it. Please rate your experience with {$data['chef_name']} in the app.";

            return $this->twilioService->sendOrderNotification(
                $data['customer_user_id'],
                $message,
                $orderId,
                'order_complete'
            );
        } catch (Exception $e) {
            Log::error('Failed to send order complete notification', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send 24-hour reminder SMS to chef
     * Sent by scheduled task 24 hours before order time
     *
     * @param int $orderId
     * @return array ['success' => bool, 'error' => string|null]
     */
    public function sendChefReminderNotification($orderId)
    {
        try {
            $data = $this->getOrderData($orderId);

            if (!$data) {
                return ['success' => false, 'error' => 'Order data not found'];
            }

            $message = "Reminder: You have order ORDER#" . sprintf('%07d', $orderId) .
                       " from {$data['customer_name']} scheduled for tomorrow at {$data['order_time']}. " .
                       "{$data['menu_title']} x{$data['amount']}. Don't forget!";

            return $this->twilioService->sendOrderNotification(
                $data['chef_user_id'],
                $message,
                $orderId,
                'chef_reminder_24h'
            );
        } catch (Exception $e) {
            Log::error('Failed to send chef reminder notification', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send 24-hour reminder SMS to customer
     * Sent by scheduled task 24 hours before order time
     *
     * @param int $orderId
     * @return array ['success' => bool, 'error' => string|null]
     */
    public function sendCustomerReminderNotification($orderId)
    {
        try {
            $data = $this->getOrderData($orderId);

            if (!$data) {
                return ['success' => false, 'error' => 'Order data not found'];
            }

            $message = "Reminder: Your order ORDER#" . sprintf('%07d', $orderId) .
                       " from Chef {$data['chef_name']} is scheduled for tomorrow at {$data['order_time']}. " .
                       "{$data['menu_title']} x{$data['amount']}. Can't wait!";

            return $this->twilioService->sendOrderNotification(
                $data['customer_user_id'],
                $message,
                $orderId,
                'customer_reminder_24h'
            );
        } catch (Exception $e) {
            Log::error('Failed to send customer reminder notification', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Get order data needed for SMS templates
     * Gathers all data from order, user, and menu tables
     *
     * @param int $orderId
     * @return array|null Order data or null if not found
     */
    private function getOrderData($orderId)
    {
        $order = Orders::find($orderId);

        if (!$order) {
            Log::error('Order not found for SMS notification', ['order_id' => $orderId]);
            return null;
        }

        // Get chef info
        $chef = Listener::find($order->chef_user_id);
        if (!$chef) {
            Log::error('Chef not found for order', ['order_id' => $orderId, 'chef_id' => $order->chef_user_id]);
            return null;
        }

        // Get customer info
        $customer = Listener::find($order->customer_user_id);
        if (!$customer) {
            Log::error('Customer not found for order', ['order_id' => $orderId, 'customer_id' => $order->customer_user_id]);
            return null;
        }

        // Get menu info
        $menu = Menus::find($order->menu_id);
        if (!$menu) {
            Log::error('Menu not found for order', ['order_id' => $orderId, 'menu_id' => $order->menu_id]);
            return null;
        }

        // Format order date/time using chef's timezone
        $orderDateTime = TimezoneHelper::formatForSms((int)$order->order_date, $chef->state);

        return [
            'order_id' => $order->id,
            'chef_user_id' => $chef->id,
            'chef_name' => $this->formatUserName($chef->first_name, $chef->last_name, 'Chef'),
            'chef_state' => $chef->state,
            'customer_user_id' => $customer->id,
            'customer_name' => $this->formatUserName($customer->first_name, $customer->last_name, 'Customer'),
            'menu_id' => $menu->id,
            'menu_title' => $menu->title,
            'amount' => $order->amount,
            'total_price' => number_format($order->total_price, 2),
            'order_date' => $order->order_date,
            'order_date_formatted' => $orderDateTime['formatted'],
            'order_time' => $orderDateTime['time'],
            'timezone' => $orderDateTime['timezone'],
        ];
    }

}
