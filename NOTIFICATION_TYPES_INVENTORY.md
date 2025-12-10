# Notification Types Inventory

This document maps all database notification templates to their business purposes based on code analysis.

## Complete Notification Mapping

| Template ID | Notification Class Name | Trigger Event | Recipient | Role | Controller Location |
|-------------|------------------------|---------------|-----------|------|---------------------|
| 1 | `ChefApprovedNotification` | Chef account activated/approved by admin | Chef | chef | AdminapiController.php:93 |
| 4 | `OrderCompletedNotification` | Order marked as completed (status 4) | Customer | user | MapiController.php:3512 |
| 6 | `NewOrderNotification` | New order created OR order payment confirmed (status 1) | Chef | chef | MapiController.php:2293, 3414 |
| 10 | `OrderAcceptedNotification` | Chef accepts order (status 2) | Customer | user | MapiController.php:3433 |
| 14 | `ChefOnTheWayNotification` | Chef is on the way (status 7) | Customer | user | MapiController.php:3560 |
| 15 | `OrderReadyNotification` | Order is ready for pickup (status 3) | Customer | user | MapiController.php:3462 |
| 20 | `OrderRejectedNotification` | Chef rejects order (status 5) | Customer | user | MapiController.php:3531 |

## Order Status Flow

Based on the code analysis, here's how order statuses map to notifications:

- **Status 0**: Order created (pending payment)
- **Status 1**: Payment confirmed → **Template 6** to Chef (New Order)
- **Status 2**: Chef accepts → **Template 10** to Customer (Order Accepted)
- **Status 3**: Order ready → **Template 15** to Customer (Order Ready)
- **Status 4**: Order completed → **Template 4** to Customer (Order Completed)
- **Status 5**: Chef rejects → **Template 20** to Customer (Order Rejected)
- **Status 7**: Chef on the way → **Template 14** to Customer (Chef On The Way)

## Notification Details

### 1. ChefApprovedNotification (Template ID: 1)
- **Event**: Admin approves/activates chef account
- **Trigger**: `POST /adminapi/change_chef_status` with `status=1`
- **Recipient**: Chef (Listener model)
- **Channels**: Push notification, Database
- **Navigation**: Links to chef's own profile (navigation_id = chef's user ID)
- **Notes**: Only sent if chef has FCM token

### 2. NewOrderNotification (Template ID: 6)
- **Event**: New order created OR payment confirmed
- **Trigger**:
  - Order creation in `placeOrder()`
  - Order status update to status 1 in `change_order_status()`
- **Recipient**: Chef (who owns the menu item)
- **Channels**: Push notification, Database, SMS (via OrderSmsService)
- **Navigation**: Links to order (navigation_id = order ID)
- **Notes**: Sent twice - once on order creation, once on payment confirmation

### 3. OrderAcceptedNotification (Template ID: 10)
- **Event**: Chef accepts the order
- **Trigger**: `POST /api/change_order_status` with `status=2`
- **Recipient**: Customer (who placed the order)
- **Channels**: Push notification, Database, SMS (via OrderSmsService)
- **Navigation**: Links to order (navigation_id = order ID)

### 4. OrderReadyNotification (Template ID: 15)
- **Event**: Order is ready for pickup/delivery
- **Trigger**: `POST /api/change_order_status` with `status=3`
- **Recipient**: Customer
- **Channels**: Push notification, Database, SMS (via OrderSmsService)
- **Navigation**: Links to order (navigation_id = order ID)

### 5. OrderCompletedNotification (Template ID: 4)
- **Event**: Order marked as completed
- **Trigger**: `POST /api/change_order_status` with `status=4`
- **Recipient**: Customer
- **Channels**: Push notification, Database
- **Navigation**: Links to order (navigation_id = order ID)

### 6. OrderRejectedNotification (Template ID: 20)
- **Event**: Chef rejects the order
- **Trigger**: `POST /api/change_order_status` with `status=5`
- **Recipient**: Customer
- **Channels**: Push notification, Database, SMS (via OrderSmsService)
- **Navigation**: Links to order (navigation_id = order ID)
- **Notes**: Also triggers cancellation tracking (cancelled_by_role, cancellation_type, etc.)

### 7. ChefOnTheWayNotification (Template ID: 14)
- **Event**: Chef indicates they're on the way
- **Trigger**: `POST /api/change_order_status` with `status=7`
- **Recipient**: Customer
- **Channels**: Push notification, Database, SMS (via OrderSmsService)
- **Navigation**: Links to order (navigation_id = order ID)

## Notification Data Structure

Each notification currently stores:

```php
[
    'title' => $notification->template_name,  // From database template
    'body' => $notification->push,            // From database template
    'image' => $user->photo ?? 'N/A',         // User's photo
    'fcm_token' => $user->fcm_token,          // For push delivery
    'user_id' => $user->id,                   // Recipient user ID
    'navigation_id' => $id,                   // Order ID or User ID
    'role' => 'chef' | 'user',                // Recipient role
]
```

## SMS Integration

Several notifications also send SMS via `OrderSmsService`:
- **Template 6** (New Order) → `sendNewOrderNotification()`
- **Template 10** (Order Accepted) → `sendOrderAcceptedNotification()`
- **Template 15** (Order Ready) → `sendOrderReadyNotification()`
- **Template 20** (Order Rejected) → `sendOrderRejectedNotification()`
- **Template 14** (Chef On The Way) → `sendChefOnTheWayNotification()`

**Note**: SMS service failures are logged but don't block the notification flow.

## Next Steps

1. ✅ **Phase 1 Complete**: All notification types documented
2. **Phase 2**: Create 7 Laravel notification classes
3. **Phase 3**: Update 2 controllers (AdminapiController, MapiController)
4. **Phase 4**: Update User/Listener model with Notifiable trait
5. **Phase 5**: Create tests
6. **Phase 6**: Deploy to staging

## Questions Answered

### Does the app send emails?
**Answer**: No evidence found. The `email` field in `tbl_notification_templates` exists but is never used in the code.

### Does the app send SMS?
**Answer**: Yes! SMS is sent for 5 out of 7 notification types via `OrderSmsService`. The service is already separate from the template system.

### Do admins need to edit notification copy?
**Answer**: Unknown - need to check if admin panel has notification template management UI. Given templates were lost in migration, likely not critical.
