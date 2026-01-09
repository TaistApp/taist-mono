# String DateTime Conversion Plan

## Overview

Convert the order datetime system from Unix timestamps to separate date/time strings. This eliminates timezone conversion bugs by keeping dates and times as human-readable strings in the **chef's local time**.

**Current approach:** Frontend sends Unix timestamp → Backend converts using various timezones → Bugs occur at date boundaries

**New approach:** Frontend sends date string + time string → Backend uses chef's timezone → Timestamp calculated once for scheduling

---

## Why This Approach is Best Practice

### Two Types of DateTime Data

| Type | Example | Best Practice |
|------|---------|---------------|
| **Point in Time** | "User logged in" | Store as UTC timestamp |
| **Calendar Event** | "Delivery at 10 AM" | Store local date/time + timezone name |

### Orders Are Calendar Events

An order for "Friday at 10 AM" means **10 AM where the chef is located**. This is tied to a physical location, not a moment in UTC time.

### Why Chef's Timezone, Not Client's

The order happens at the **chef's location**. Using chef's timezone:
- Customer in NYC ordering from Chicago chef → time is Chicago time
- Customer in LA ordering from Chicago chef → time is Chicago time
- Consistent, predictable, tied to physical reality

---

## Investigation Findings

### Database Schema

**File:** `backend/database/taist-schema.sql` (line 352-382)

```sql
CREATE TABLE `tbl_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_date` varchar(50) NOT NULL,  -- Currently stores Unix timestamp as string
  -- ... other fields
);
```

**Finding:** `order_date` is `varchar(50)` storing Unix timestamp as string. No `order_time`, `order_timezone`, or `order_timestamp` columns exist.

---

### Backend Files Using order_date

#### 1. SendOrderReminders.php (lines 56-60)

**File:** `backend/app/Console/Commands/SendOrderReminders.php`

```php
$orders = Orders::whereIn('status', [1, 2, 7])
    ->whereNull('reminder_sent_at')
    ->where('order_date', '>=', (string)$windowStart)
    ->where('order_date', '<=', (string)$windowEnd)
    ->get();
```

**Problem:** String comparison of numeric timestamps is unreliable! `"99" > "100"` as strings.

**Fix needed:** Use `order_timestamp` column with integer comparison:
```php
->where('order_timestamp', '>=', $windowStart)
->where('order_timestamp', '<=', $windowEnd)
```

#### 2. OrderSmsService.php (line 310)

**File:** `backend/app/Services/OrderSmsService.php`

```php
$orderDateTime = TimezoneHelper::formatForSms((int)$order->order_date, $chef->state);
```

**Finding:** Casts to int and uses TimezoneHelper. With new approach, this becomes simpler:
```php
$orderDateTime = [
    'formatted' => $order->order_date . ' at ' . $order->order_time,
    'time' => $order->order_time,
    'timezone' => $order->order_timezone,
];
```

#### 3. MapiController.php

**File:** `backend/app/Http/Controllers/MapiController.php`

| Line | Usage |
|------|-------|
| 2324 | Logging `$request->order_date` |
| 2332 | Getting `$orderDate = $request->order_date` |
| 2470 | Storing `'order_date' => $request->order_date` |
| 2537 | Updating `$ary['order_date'] = $request->order_date` |
| 3849 | Casting `(int)$order->order_date` |
| 4554 | Converting `is_numeric($order->order_date) ? (int)$order->order_date : strtotime($order->order_date)` |

#### 4. Orders Model

**File:** `backend/app/Models/Orders.php`

```php
protected $fillable = [
    // ...
    'order_date',
    // ...
];
```

**Finding:** Just has `order_date` in fillable. Need to add new fields.

---

### Frontend Files Using order_date

#### 1. Order Interface

**File:** `frontend/app/types/order.interface.ts`

```typescript
export default interface OrderInterface {
  order_date?: number;      // Currently timestamp
  order_time?: string;      // ALREADY EXISTS but unused!
  timezone?: string;        // ALREADY EXISTS but unused!
  // ...
}
```

**Finding:** Interface already has `order_time` and `timezone` fields! Just need to use them.

#### 2. Checkout Screen (Critical)

**File:** `frontend/app/screens/customer/checkout/index.tsx`

**Line 408:** Creates timestamp
```typescript
const order_datetime = day.toDate().getTime() / 1000;
```

**Line 448:** Sends to API
```typescript
const orderData: IOrder = {
    ...o,
    address: self.address,
    order_date: order_datetime,  // <-- Currently sends timestamp
    // ...
};
```

**Fix needed:**
```typescript
const orderData: IOrder = {
    ...o,
    address: self.address,
    order_date: day.format('YYYY-MM-DD'),  // "2025-01-10"
    order_time: day.format('HH:mm'),        // "10:00"
    // Note: NO timezone sent - backend uses chef's timezone
};
```

**Note:** Time is already available as `times.find(x => x.id == timeId)` which has `h` and `m` properties (line 380-388).

---

### TimezoneHelper (Already Complete!)

**File:** `backend/app/Helpers/TimezoneHelper.php`

Already has everything needed:

| Method | Purpose |
|--------|---------|
| `getTimezoneForState($state)` | Maps state → IANA timezone (e.g., "IL" → "America/Chicago") |
| `getTodayInTimezone($timezone)` | Gets "2025-01-10" in timezone |
| `formatForSms($timestamp, $state)` | Formats timestamp for SMS |
| `formatForState($timestamp, $state)` | Formats timestamp for display |

**Default timezone:** `America/Chicago`

**State mapping includes:** All 50 US states + DC + territories (PR, VI, GU, AS)

---

## Detailed Task Breakdown

### Phase 1: Database Migration

#### Task 1.1: Add New Columns

**File to create:** `backend/database/migrations/2025_01_09_000001_add_order_datetime_fields.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            // Add new columns after existing order_date
            $table->date('order_date_new')->nullable()->after('order_date');
            $table->string('order_time', 5)->nullable()->after('order_date_new');  // "HH:MM"
            $table->string('order_timezone', 50)->nullable()->after('order_time');
            $table->unsignedBigInteger('order_timestamp')->nullable()->after('order_timezone');

            // Index for scheduler queries
            $table->index('order_timestamp');
        });
    }

    public function down()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->dropIndex(['order_timestamp']);
            $table->dropColumn(['order_date_new', 'order_time', 'order_timezone', 'order_timestamp']);
        });
    }
};
```

#### Task 1.2: Backfill Existing Orders

**File to create:** `backend/database/migrations/2025_01_09_000002_backfill_order_datetime_fields.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Orders;
use App\Listener;
use App\Helpers\TimezoneHelper;
use DateTime;
use DateTimeZone;

return new class extends Migration
{
    public function up()
    {
        // Process in chunks to avoid memory issues
        Orders::whereNull('order_date_new')
            ->chunkById(100, function ($orders) {
                foreach ($orders as $order) {
                    $timestamp = (int) $order->order_date;

                    if ($timestamp <= 0) {
                        continue;  // Skip invalid timestamps
                    }

                    // Get chef's timezone
                    $chef = Listener::find($order->chef_user_id);
                    $chefTimezone = $chef
                        ? TimezoneHelper::getTimezoneForState($chef->state)
                        : TimezoneHelper::getDefaultTimezone();

                    // Convert timestamp to chef's local date/time
                    $dt = new DateTime("@{$timestamp}");
                    $dt->setTimezone(new DateTimeZone($chefTimezone));

                    $order->update([
                        'order_date_new' => $dt->format('Y-m-d'),
                        'order_time' => $dt->format('H:i'),
                        'order_timezone' => $chefTimezone,
                        'order_timestamp' => $timestamp,
                    ]);
                }
            });
    }

    public function down()
    {
        // Clear backfilled data
        Orders::whereNotNull('order_date_new')
            ->update([
                'order_date_new' => null,
                'order_time' => null,
                'order_timezone' => null,
                'order_timestamp' => null,
            ]);
    }
};
```

#### Task 1.3: Rename Columns (AFTER all code is updated)

**File to create:** `backend/database/migrations/2025_01_XX_000001_rename_order_date_columns.php`

```php
Schema::table('tbl_orders', function (Blueprint $table) {
    $table->renameColumn('order_date', 'legacy_order_date');
    $table->renameColumn('order_date_new', 'order_date');
});
```

**DO NOT RUN THIS until Phase 2 and 3 are complete and tested.**

---

### Phase 2: Backend Changes

#### Task 2.1: Update Orders Model

**File:** `backend/app/Models/Orders.php`

**Current:**
```php
protected $fillable = [
    'chef_user_id',
    'menu_id',
    'customer_user_id',
    'amount',
    'total_price',
    'addons',
    'address',
    'order_date',
    'status',
    // ...
];
```

**Change to:**
```php
protected $fillable = [
    'chef_user_id',
    'menu_id',
    'customer_user_id',
    'amount',
    'total_price',
    'addons',
    'address',
    'order_date',       // Keep for backward compatibility during migration
    'order_date_new',   // New date string field (temporary name)
    'order_time',       // New time string field
    'order_timezone',   // Chef's timezone name
    'order_timestamp',  // UTC timestamp for scheduling
    'status',
    // ...
];

protected $casts = [
    'order_timestamp' => 'integer',
];

/**
 * Get the order's scheduled datetime in the chef's timezone
 */
public function getScheduledDateTimeAttribute(): ?DateTime
{
    if (!$this->order_date_new || !$this->order_time) {
        return null;
    }

    $tz = $this->order_timezone ?? 'America/Chicago';
    return new DateTime(
        "{$this->order_date_new} {$this->order_time}",
        new DateTimeZone($tz)
    );
}
```

#### Task 2.2: Update createOrder in MapiController

**File:** `backend/app/Http/Controllers/MapiController.php`
**Function:** `createOrder()` (starts around line 2318)

**Add after line 2377 (after chef lookup):**

```php
// Get chef's timezone for all date/time operations
$chefTimezone = TimezoneHelper::getTimezoneForState($chef->state);

// Detect format and normalize to strings + timestamp
if (is_numeric($request->order_date)) {
    // Legacy format: Unix timestamp
    $orderTimestamp = (int) $request->order_date;
    $dt = new DateTime("@{$orderTimestamp}");
    $dt->setTimezone(new DateTimeZone($chefTimezone));
    $orderDateStr = $dt->format('Y-m-d');
    $orderTimeStr = $dt->format('H:i');
} else {
    // New format: separate date and time strings
    $orderDateStr = $request->order_date;
    $orderTimeStr = $request->order_time;

    if (!$orderTimeStr) {
        return response()->json([
            'success' => 0,
            'error' => 'order_time is required when order_date is a string'
        ]);
    }

    // Calculate timestamp using chef's timezone
    $dt = new DateTime("{$orderDateStr} {$orderTimeStr}", new DateTimeZone($chefTimezone));
    $orderTimestamp = $dt->getTimestamp();
}

// Use these normalized values for all validation
$orderDateOnly = $orderDateStr;
$orderTime = $orderTimeStr;

// For "today" check, use chef's timezone
$chefToday = TimezoneHelper::getTodayInTimezone($chefTimezone);
$todayDateOnly = $chefToday;  // Override the UTC-based one
```

**Update order creation (around line 2470):**

```php
$order = app(Orders::class)->create([
    'chef_user_id' => $request->chef_user_id,
    'menu_id' => $request->menu_id,
    'customer_user_id' => $request->customer_user_id,
    'amount' => $request->amount,
    'total_price' => $actualTotal,
    'addons' => $request->addons,
    'address' => $request->address,
    'order_date' => $orderTimestamp,           // Keep for backward compat
    'order_date_new' => $orderDateStr,         // New string date
    'order_time' => $orderTimeStr,             // New string time
    'order_timezone' => $chefTimezone,         // Chef's timezone
    'order_timestamp' => $orderTimestamp,      // UTC timestamp
    'status' => 1,
    'notes' => $request->notes,
    // ... discount fields
]);
```

#### Task 2.3: Update isAvailableForOrder

**File:** `backend/app/Listener.php`
**Function:** `isAvailableForOrder()` (line 116)

**Current signature:**
```php
public function isAvailableForOrder($orderDate, $timezone = null)
```

**Keep backward compatible but add string support:**
```php
public function isAvailableForOrder($orderDate, $orderTimeOrTimezone = null, $deprecatedTimezone = null)
{
    // Detect if called with new signature (date, time) or old signature (date, timezone)
    if ($orderTimeOrTimezone && preg_match('/^\d{2}:\d{2}$/', $orderTimeOrTimezone)) {
        // New signature: isAvailableForOrder("2025-01-10", "10:00")
        $orderDateOnly = $orderDate;
        $orderTime = $orderTimeOrTimezone;
    } else {
        // Old signature: isAvailableForOrder(timestamp, timezone)
        $timezone = $orderTimeOrTimezone;
        $orderTimestamp = is_numeric($orderDate) ? (int)$orderDate : strtotime($orderDate);

        if (!$orderTimestamp || $orderTimestamp <= 0) {
            \Log::warning("[AVAILABILITY] Invalid order date received: " . var_export($orderDate, true));
            return false;
        }

        $orderDateOnly = date('Y-m-d', $orderTimestamp);
        $orderTime = date('H:i', $orderTimestamp);
    }

    // Get chef's timezone for "today" check
    $chefTimezone = \App\Helpers\TimezoneHelper::getTimezoneForState($this->state);
    $today = \App\Helpers\TimezoneHelper::getTodayInTimezone($chefTimezone);

    // Check for override first
    $override = \App\Models\AvailabilityOverride::forChef($this->id)
        ->forDate($orderDateOnly)
        ->first();

    if ($override) {
        return $override->isAvailableAt($orderTime);
    }

    // Today with no override = NOT available
    if ($orderDateOnly === $today) {
        return false;
    }

    // Weekly schedule check
    return $this->hasScheduleForDateTime($orderDateOnly, $orderTime);
}
```

#### Task 2.4: Update SendOrderReminders

**File:** `backend/app/Console/Commands/SendOrderReminders.php`

**Change lines 56-60 from:**
```php
$orders = Orders::whereIn('status', [1, 2, 7])
    ->whereNull('reminder_sent_at')
    ->where('order_date', '>=', (string)$windowStart)
    ->where('order_date', '<=', (string)$windowEnd)
    ->get();
```

**To:**
```php
$orders = Orders::whereIn('status', [1, 2, 7])
    ->whereNull('reminder_sent_at')
    ->where('order_timestamp', '>=', $windowStart)
    ->where('order_timestamp', '<=', $windowEnd)
    ->get();
```

#### Task 2.5: Update OrderSmsService

**File:** `backend/app/Services/OrderSmsService.php`

**Change line 310 from:**
```php
$orderDateTime = TimezoneHelper::formatForSms((int)$order->order_date, $chef->state);
```

**To (with fallback for old orders):**
```php
if ($order->order_date_new && $order->order_time) {
    // New format - use strings directly
    $dateFormatted = date('M j', strtotime($order->order_date_new));
    $timeFormatted = date('g:i A', strtotime($order->order_time));
    $orderDateTime = [
        'formatted' => "{$dateFormatted}, {$timeFormatted}",
        'time' => $timeFormatted,
        'timezone' => $order->order_timezone ?? TimezoneHelper::getTimezoneForState($chef->state),
    ];
} else {
    // Legacy format - convert timestamp
    $orderDateTime = TimezoneHelper::formatForSms((int)$order->order_date, $chef->state);
}
```

#### Task 2.6: Update getAvailableTimeslots

**File:** `backend/app/Http/Controllers/MapiController.php`
**Function:** `getAvailableTimeslots()` (line 886)

**Change lines 921-925 from:**
```php
$clientTimezone = $request->input('timezone');
$todayDateOnly = \App\Helpers\TimezoneHelper::getTodayInTimezone($clientTimezone);
```

**To (use chef's timezone instead of client's):**
```php
// Use chef's timezone for consistency with order validation
$chef = app(Listener::class)->where('id', $chefId)->first();
$chefTimezone = $chef
    ? TimezoneHelper::getTimezoneForState($chef->state)
    : TimezoneHelper::getDefaultTimezone();
$todayDateOnly = TimezoneHelper::getTodayInTimezone($chefTimezone);
```

---

### Phase 3: Frontend Changes

#### Task 3.1: Update Checkout Screen

**File:** `frontend/app/screens/customer/checkout/index.tsx`

**Change lines 407-408 from:**
```typescript
const handleCheckoutProcess = async (day: Moment) => {
    const order_datetime = day.toDate().getTime() / 1000;
```

**To:**
```typescript
const handleCheckoutProcess = async (day: Moment) => {
    // Send date and time as separate strings
    const order_date_str = day.format('YYYY-MM-DD');
    const order_time_str = day.format('HH:mm');
```

**Change lines 445-450 from:**
```typescript
const orderData: IOrder = {
    ...o,
    address: self.address,
    order_date: order_datetime,
    discount_code: (i === 0 && appliedDiscount) ? appliedDiscount.code : undefined,
};
```

**To:**
```typescript
const orderData: IOrder = {
    ...o,
    address: self.address,
    order_date: order_date_str,    // "2025-01-10"
    order_time: order_time_str,    // "10:00"
    // Note: No timezone - backend uses chef's timezone
    discount_code: (i === 0 && appliedDiscount) ? appliedDiscount.code : undefined,
};
```

#### Task 3.2: Update Order Interface (Already Done!)

**File:** `frontend/app/types/order.interface.ts`

Already has the fields! Just need to change `order_date` type:

```typescript
export default interface OrderInterface {
  order_date?: string | number;  // Accept both during migration
  order_time?: string;           // Already exists
  timezone?: string;             // Already exists
  // ...
}
```

#### Task 3.3: Update Order Display Components

**Files to check:**
- `frontend/app/screens/customer/orderDetail/index.tsx`
- `frontend/app/screens/chef/orderDetail/index.tsx`
- `frontend/app/screens/customer/orders/components/orderCard.tsx`

Look for code that converts `order_date` timestamp to display string and update to use `order_date` + `order_time` strings directly.

---

### Phase 4: Testing

#### Task 4.1: Test Backward Compatibility

```bash
# Test with old timestamp format still works
curl -X POST /mapi/create_order \
  -d "order_date=1736521200" \
  -d "chef_user_id=1" \
  # ...
```

#### Task 4.2: Test New String Format

```bash
# Test with new string format
curl -X POST /mapi/create_order \
  -d "order_date=2025-01-10" \
  -d "order_time=10:00" \
  -d "chef_user_id=1" \
  # ...
```

#### Task 4.3: Test Timezone Edge Cases

Test ordering at 11 PM Central (5 AM UTC next day) for next day delivery.

#### Task 4.4: Test Reminder Scheduling

Verify `SendOrderReminders` finds orders correctly using `order_timestamp`.

---

### Phase 5: Deployment

1. **Deploy migration** (add columns, backfill)
2. **Deploy backend** (accepts both formats)
3. **Deploy frontend** (sends new format)
4. **Monitor** for errors
5. **Later:** Run column rename migration, remove legacy code

---

## Summary: What Goes Where

| Field | Format | Used For |
|-------|--------|----------|
| `order_date` (new) | "2025-01-10" | Display, availability checks |
| `order_time` | "10:00" | Display, availability checks |
| `order_timezone` | "America/Chicago" | Recalculating if needed, display |
| `order_timestamp` | 1736521200 (UTC) | Scheduling reminders, time-based queries |
| `order_date` (legacy) | "1736521200" | Backward compat during migration |

**Simple rule:**
- Human-readable stuff → use strings
- Computer scheduling stuff → use timestamp
