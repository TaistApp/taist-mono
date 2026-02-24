# SMS Notifications - Quick Reference

## Overview
This document provides a quick reference for the SMS notification system implemented in TMA-001.

---

## Notification Types

| Notification | Trigger | Recipient | Status Change |
|--------------|---------|-----------|---------------|
| **New Order Request** | Customer creates order | Chef | → Status 1 |
| **Order Accepted** | Chef accepts order | Customer | 1 → 2 |
| **Order Rejected** | Chef rejects order | Customer | 1 → 5 |
| **Chef On The Way** | Chef marks on the way | Customer | 2 → 7 |
| **Order Complete** | Chef completes order | Customer | 7 → 3 |
| **24-Hour Reminder** | Scheduled (24hrs before order) | Both Chef & Customer | — |

---

## Code Locations

### Services
- **TwilioService**: `backend/app/Services/TwilioService.php`
  - Core SMS sending functionality
  - Phone validation and formatting
  - Error handling and logging

- **OrderSmsService**: `backend/app/Services/OrderSmsService.php`
  - Order-specific SMS logic
  - Message templates
  - Data gathering and formatting

### Controllers
- **MapiController**: `backend/app/Http/Controllers/MapiController.php`
  - Line 1757: `addOrder()` - sends new order SMS to chef
  - Lines 2805-2986: `updateOrderStatus()` - sends status change SMS

### Commands
- **SendOrderReminders**: `backend/app/Console/Commands/SendOrderReminders.php`
  - Scheduled: Every 30 minutes
  - Sends 24-hour reminder SMS to chef and customer
  - Registered in: `backend/app/Console/Kernel.php:30-34`

### Models
- **Orders**: `backend/app/Models/Orders.php`
  - New field: `reminder_sent_at` - tracks if reminder sent
  - Status values: 1=Requested, 2=Accepted, 3=Complete, 4=Cancelled, 5=Rejected, 7=OnTheWay

- **Listener** (User): `backend/app/Listener.php`
  - Table: `tbl_users`
  - Fields: `phone`, `first_name`, `last_name`, `user_type`

---

## Name Formatting Convention

Names in SMS follow a privacy-conscious convention:

| Recipient | Sees other party as | Example |
|-----------|-------------------|---------|
| **Customer** | Chef "FirstName L." | "Sarah J." |
| **Chef** | Customer "FirstName" only | "John" |
| **Admin** | Full name | "John Smith" |

This is enforced in:
- `OrderSmsService::formatUserName()` — order lifecycle SMS
- `ChatSmsService::formatSenderName()` — chat message alerts
- Frontend components (inline formatting)

---

## Message Templates

### New Order Request (→ Chef)
```
New order request! ORDER#0000123 from John for Dec 4, 2PM.
Grilled Chicken Tacos x4. Total: $45.00. Accept within 30 minutes. View in app.
```

### Order Accepted (→ Customer)
```
Great news! Chef Sarah J. accepted your order ORDER#0000123 for Dec 4, 2PM.
We'll notify you when they're on the way!
```

### Order Rejected (→ Customer)
```
Sorry, Chef Sarah J. is unable to fulfill your order ORDER#0000123.
You will receive a full refund within 5-7 business days. Browse other chefs in the app!
```

### Chef On The Way (→ Customer)
```
Your chef is on the way! ORDER#0000123 should arrive around 2:00 PM.
```

### Order Complete (→ Customer)
```
Your order is complete! ORDER#0000123.
Hope you enjoyed it. Please rate your experience with Sarah J. in the app.
```

### 24-Hour Reminder (→ Chef)
```
Reminder: You have order ORDER#0000123 from John scheduled for tomorrow at 2:00 PM.
Grilled Chicken Tacos x4. Don't forget!
```

### 24-Hour Reminder (→ Customer)
```
Reminder: Your order ORDER#0000123 from Chef Sarah J. is scheduled for tomorrow at 2:00 PM.
Grilled Chicken Tacos x4. Can't wait!
```

### Chat Message Alert (→ Either)
```
Taist: New message from John. Open inbox: https://taist.app/open/inbox. Reply in the app only - this SMS inbox is not monitored.
```
(If recipient is a customer, sender chef name includes last initial: "Sarah J.")

---

## API Methods

### TwilioService Methods

```php
// Send generic SMS
public function sendSMS(string $phoneNumber, string $message, array $metadata = []): array

// Send order notification
public function sendOrderNotification(int $userId, string $message, int $orderId, string $notificationType): array

// Build message from template
private function buildMessage(string $template, array $data): string

// Format phone number to E.164
private function formatPhoneNumber(string $phoneNumber): ?string

// Truncate long messages
private function truncateMessage(string $message, int $maxLength = 160): string
```

### OrderSmsService Methods

```php
// Individual notification methods
public function sendNewOrderNotification(int $orderId): array
public function sendOrderAcceptedNotification(int $orderId): array
public function sendOrderRejectedNotification(int $orderId): array
public function sendChefOnTheWayNotification(int $orderId): array
public function sendOrderCompleteNotification(int $orderId): array
public function sendChefReminderNotification(int $orderId): array
public function sendCustomerReminderNotification(int $orderId): array

// Helper methods
private function getOrderData(int $orderId): array
private function formatOrderDateTime(int $timestamp): string
```

---

## Testing Commands

```bash
# Test sending reminders manually
php artisan orders:send-reminders

# Check scheduled tasks
php artisan schedule:list

# Run scheduler once (for testing)
php artisan schedule:run

# View logs for SMS activity
tail -f backend/storage/logs/laravel.log | grep -i "sms\|twilio"

# Test Twilio configuration
php artisan tinker
>>> app(\App\Services\TwilioService::class)->isEnabled()
>>> app(\App\Services\TwilioService::class)->sendSMS('+15551234567', 'Test message', [])
```

---

## Environment Configuration

```env
# Required in backend/.env
TWILIO_SID=your_account_sid_here
TWILIO_TOKEN=your_auth_token_here
TWILIO_FROM=+15551234567
```

---

## Database Schema

### tbl_orders
```sql
-- New column for reminder tracking
ALTER TABLE tbl_orders ADD COLUMN reminder_sent_at TIMESTAMP NULL AFTER acceptance_deadline;
```

Migration file: `backend/database/migrations/2025_12_03_000001_add_reminder_tracking_to_orders.php`

---

## Error Handling

### SMS Send Failures
- **Never block order processing** - SMS is supplementary to push notifications
- All SMS calls wrapped in try-catch
- Errors logged to Laravel log with context
- Return structured response: `['success' => bool, 'error' => string|null]`

### Common Errors
1. **"Twilio credentials not configured"**
   - Check `.env` has all three Twilio variables
   - Restart backend after updating `.env`

2. **"Invalid phone number"**
   - Phone must be in E.164 format: `+[country][number]`
   - TwilioService attempts to format automatically

3. **"Twilio API error"**
   - Check Twilio account has credits
   - Verify phone number not blocked/blacklisted
   - Check Twilio console for delivery logs

---

## Monitoring

### Key Metrics
- SMS delivery rate: Target >95%
- SMS send latency: Target <2 seconds
- Error rate: Target <2%
- Daily SMS count and cost

### Log Monitoring
```bash
# Count SMS sent today
grep "SMS.*sent successfully" backend/storage/logs/laravel.log | grep "$(date +%Y-%m-%d)" | wc -l

# Count SMS failures today
grep "Failed to send SMS" backend/storage/logs/laravel.log | grep "$(date +%Y-%m-%d)" | wc -l

# View all SMS activity for specific order
grep "order_id.*123" backend/storage/logs/laravel.log | grep -i "sms\|twilio"
```

---

## Costs

### Twilio Pricing (US)
- SMS outbound: ~$0.0079 per message
- Phone number rental: $1.15/month
- No inbound message costs (not implemented)

### Estimated Costs
- Per order: ~$0.05-$0.06 (6 SMS max per order lifecycle)
- 100 orders/month: ~$5-6/month
- 1000 orders/month: ~$50-60/month

---

## Troubleshooting

### SMS Not Received

**Check 1: Twilio Configuration**
```bash
# In Laravel tinker
php artisan tinker
>>> app(\App\Services\TwilioService::class)->isEnabled()
# Should return: true
```

**Check 2: Phone Number Format**
- Must start with + and country code
- Example: `+15551234567` (US)
- Not: `(555) 123-4567` or `555-123-4567`

**Check 3: Twilio Account**
- Log into Twilio console
- Check account balance
- View SMS logs for delivery status
- Trial accounts can only send to verified numbers

**Check 4: Laravel Logs**
```bash
tail -f backend/storage/logs/laravel.log
# Look for errors related to Twilio or SMS
```

### Reminders Not Sending

**Check 1: Scheduler Running**
```bash
# View scheduled tasks
php artisan schedule:list

# Manually run reminders
php artisan orders:send-reminders
```

**Check 2: Cron Job Configured**
```bash
# On server, ensure this is in crontab
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
```

**Check 3: Query Orders in Window**
```php
// In Laravel tinker
$now = time();
$start = $now + (23 * 3600);
$end = $now + (25 * 3600);

Orders::whereIn('status', [1, 2, 7])
    ->whereNull('reminder_sent_at')
    ->where('order_date', '>=', (string)$start)
    ->where('order_date', '<=', (string)$end)
    ->get();
```

---

## Development Workflow

### Adding a New SMS Notification Type

1. **Add method to OrderSmsService**:
```php
public function sendNewNotificationType($orderId)
{
    $data = $this->getOrderData($orderId);
    $message = "Your custom message with {$data['order_id']}";

    return $this->twilioService->sendOrderNotification(
        $data['recipient_user_id'],
        $message,
        $orderId,
        'new_notification_type'
    );
}
```

2. **Call from controller**:
```php
$this->orderSmsService->sendNewNotificationType($orderId);
```

3. **Test**:
```bash
# Test on staging first
# Monitor logs
tail -f backend/storage/logs/laravel.log
```

4. **Deploy**:
```bash
# Deploy to production
# Monitor first 10-20 sends
```

---

## Related Documentation

- **Twilio Setup Guide**: [twilio-setup.md](./twilio-setup.md)
- **Twilio Implementation**: [twilio-implementation.md](./twilio-implementation.md)

---

## Support

### Internal Resources
- Implementation plan: This repository
- Code comments in TwilioService and OrderSmsService
- Laravel logs: `backend/storage/logs/laravel.log`

### External Resources
- [Twilio PHP SDK Documentation](https://www.twilio.com/docs/libraries/php)
- [Twilio Console](https://console.twilio.com/)
- [Twilio SMS Best Practices](https://www.twilio.com/docs/sms/best-practices)

---

**Last Updated**: February 23, 2026
**Document Version**: 1.1
