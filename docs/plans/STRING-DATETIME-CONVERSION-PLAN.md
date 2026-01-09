# String DateTime Conversion Plan

## Overview

Convert the order datetime system from Unix timestamps to separate date/time strings. This eliminates timezone conversion bugs by keeping dates and times as human-readable strings that are implicitly in the chef's local time.

**Current approach:** Frontend sends Unix timestamp → Backend converts using various timezones → Bugs occur at date boundaries

**New approach:** Frontend sends date string + time string → No conversion needed → Timestamp calculated once for scheduling

---

## Current State Analysis

### How Orders Currently Work

1. **Frontend** creates a Unix timestamp when user selects date/time
2. **Backend** receives `order_date` as Unix timestamp (e.g., `1736521200`)
3. **Backend** converts to date string using `date('Y-m-d', $timestamp)`
4. **Backend** converts to time string using `date('H:i', $timestamp)`
5. These conversions use server timezone (UTC), causing mismatches with client

### Files That Handle Order DateTime

| File | What It Does |
|------|--------------|
| `frontend/app/screens/customer/cart/index.tsx` | Creates order, sends timestamp |
| `backend/app/Http/Controllers/MapiController.php` | `createOrder()` receives and validates |
| `backend/app/Listener.php` | `isAvailableForOrder()` checks availability |
| `backend/app/Models/Order.php` | Stores order data |
| `backend/database/migrations/*orders*` | Order table schema |

### Database Schema (Current)

```sql
orders table:
- order_date: varchar (stores Unix timestamp as string)
```

---

## Target State

### New Order Flow

1. **Frontend** sends separate `order_date` (string) and `order_time` (string)
2. **Backend** uses strings directly for availability checks (no conversion)
3. **Backend** calculates `order_timestamp` once using chef's timezone (for scheduling)
4. **Backend** stores all three: date string, time string, timestamp

### New Database Schema

```sql
orders table:
- order_date: date          -- "2025-01-10" (new, string date)
- order_time: time          -- "10:00" (new, string time)
- order_timestamp: bigint   -- 1736521200 (calculated, for scheduling)
- legacy_order_date: varchar -- (keep old column during migration)
```

---

## Task Breakdown

### Phase 1: Database Migration

#### Task 1.1: Create Migration File
**File:** `backend/database/migrations/XXXX_add_order_time_fields.php`

**Changes:**
```php
Schema::table('orders', function (Blueprint $table) {
    $table->date('order_date_new')->nullable()->after('order_date');
    $table->time('order_time')->nullable()->after('order_date_new');
    $table->bigInteger('order_timestamp')->nullable()->after('order_time');
});
```

**Investigation needed:**
- [ ] Check current `order_date` column type and data format
- [ ] Check if any indexes exist on `order_date`
- [ ] Determine if we need to backfill existing orders

#### Task 1.2: Backfill Existing Orders
**File:** `backend/database/migrations/XXXX_backfill_order_time_fields.php`

**Logic:**
```php
// For each order with old timestamp format:
$orders = Order::whereNull('order_date_new')->get();
foreach ($orders as $order) {
    $timestamp = (int) $order->order_date;

    // Get chef's timezone
    $chef = Listener::find($order->chef_user_id);
    $chefTimezone = TimezoneHelper::getTimezoneForState($chef->state);

    // Convert timestamp to chef's local date/time
    $dt = new DateTime("@{$timestamp}");
    $dt->setTimezone(new DateTimeZone($chefTimezone));

    $order->order_date_new = $dt->format('Y-m-d');
    $order->order_time = $dt->format('H:i');
    $order->order_timestamp = $timestamp;
    $order->save();
}
```

**Investigation needed:**
- [ ] How many existing orders need backfilling?
- [ ] What timezone were old timestamps created in?
- [ ] Are there orders with invalid/null order_date?

#### Task 1.3: Rename Columns (After Verification)
**File:** `backend/database/migrations/XXXX_rename_order_date_columns.php`

```php
Schema::table('orders', function (Blueprint $table) {
    $table->renameColumn('order_date', 'legacy_order_date');
    $table->renameColumn('order_date_new', 'order_date');
});
```

**Wait until:** All code is updated and tested

---

### Phase 2: Backend API Changes

#### Task 2.1: Update Order Model
**File:** `backend/app/Models/Order.php`

**Changes:**
- Add `order_time` and `order_timestamp` to `$fillable`
- Add casts for proper types
- Add accessor for backward compatibility

```php
protected $fillable = [
    // ... existing
    'order_date',      // now a date string
    'order_time',      // new time string
    'order_timestamp', // new calculated timestamp
];

protected $casts = [
    'order_date' => 'date:Y-m-d',
    'order_timestamp' => 'integer',
];

// Backward compatibility: return timestamp if old code expects it
public function getOrderDateTimestampAttribute()
{
    return $this->order_timestamp;
}
```

**Investigation needed:**
- [ ] What other code accesses `order_date` directly?
- [ ] Are there any Eloquent scopes or relationships using order_date?

#### Task 2.2: Update createOrder Endpoint
**File:** `backend/app/Http/Controllers/MapiController.php`

**Function:** `createOrder(Request $request)`

**Current signature expects:**
```php
$request->order_date  // Unix timestamp
```

**New signature accepts both (backward compatible):**
```php
$request->order_date  // "2025-01-10" (preferred) or Unix timestamp (legacy)
$request->order_time  // "10:00" (required if order_date is string)
$request->timezone    // Client timezone (for timestamp calculation)
```

**New logic:**
```php
// Detect format
if (is_numeric($request->order_date)) {
    // Legacy: convert timestamp to strings
    $orderTimestamp = (int) $request->order_date;
    $orderDateStr = date('Y-m-d', $orderTimestamp);
    $orderTimeStr = date('H:i', $orderTimestamp);
} else {
    // New: use strings directly
    $orderDateStr = $request->order_date;
    $orderTimeStr = $request->order_time;

    if (!$orderTimeStr) {
        return response()->json(['error' => 'order_time required when order_date is string']);
    }

    // Calculate timestamp using chef's timezone
    $chef = Listener::find($request->chef_user_id);
    $chefTimezone = TimezoneHelper::getTimezoneForState($chef->state);
    $dt = new DateTime("{$orderDateStr} {$orderTimeStr}", new DateTimeZone($chefTimezone));
    $orderTimestamp = $dt->getTimestamp();
}

// All validation now uses strings
$orderDateOnly = $orderDateStr;  // No conversion!
$orderTime = $orderTimeStr;      // No conversion!
```

**Investigation needed:**
- [ ] List all validation checks that use `$orderTimestamp`
- [ ] Which checks should use string comparison vs timestamp?
- [ ] What's the 3-hour rule logic and does it need timestamp or can use strings?

#### Task 2.3: Update isAvailableForOrder
**File:** `backend/app/Listener.php`

**Function:** `isAvailableForOrder($orderDate, $timezone = null)`

**Change to:**
```php
public function isAvailableForOrder($orderDate, $orderTime, $timezone = null)
{
    // $orderDate is now "2025-01-10" string
    // $orderTime is now "10:00" string
    // No timestamp conversion needed!

    $today = TimezoneHelper::getTodayInTimezone($timezone);

    // Check override
    $override = AvailabilityOverride::forChef($this->id)
        ->forDate($orderDate)  // Direct string comparison
        ->first();

    if ($override) {
        return $override->isAvailableAt($orderTime);  // Direct string comparison
    }

    // Today check
    if ($orderDate === $today) {
        return false;
    }

    // Weekly schedule check
    return $this->hasScheduleForDateTime($orderDate, $orderTime);
}
```

**Investigation needed:**
- [ ] What other code calls `isAvailableForOrder`?
- [ ] Does `hasScheduleForDateTime` need refactoring?

#### Task 2.4: Update getAvailableTimeslots
**File:** `backend/app/Http/Controllers/MapiController.php`

**Function:** `getAvailableTimeslots(Request $request)`

This endpoint already works with date strings - verify it's consistent.

**Investigation needed:**
- [ ] Confirm input/output format matches new order format
- [ ] Any timestamp usage that should be string?

#### Task 2.5: Update Reminder/Notification Scheduling
**Files:**
- `backend/app/Console/Commands/*.php`
- `backend/app/Jobs/*.php`
- `backend/app/Notifications/*.php`

These need the `order_timestamp` field to know WHEN to send.

**Investigation needed:**
- [ ] List all scheduled tasks that use order datetime
- [ ] How do they currently get the order time?
- [ ] Update to use `order_timestamp` field

#### Task 2.6: Update Order Queries
**Files:** Various

Any code that queries orders by date needs updating.

**Example changes:**
```php
// Old (if order_date was timestamp)
Order::where('order_date', '>=', strtotime('2025-01-10'))

// New (order_date is string, use order_timestamp for range queries)
Order::where('order_date', '2025-01-10')
// or
Order::where('order_timestamp', '>=', strtotime('2025-01-10'))
```

**Investigation needed:**
- [ ] Grep for `order_date` usage across codebase
- [ ] Categorize: display vs scheduling vs filtering
- [ ] Update each to use appropriate field

---

### Phase 3: Frontend Changes

#### Task 3.1: Update Cart/Checkout Screen
**File:** `frontend/app/screens/customer/cart/index.tsx`

**Current:** Creates Unix timestamp from selected date/time
**New:** Send separate date and time strings

```typescript
// Old
const orderData = {
    order_date: selectedDateTime.getTime() / 1000,  // Unix timestamp
};

// New
const orderData = {
    order_date: format(selectedDate, 'yyyy-MM-dd'),  // "2025-01-10"
    order_time: format(selectedTime, 'HH:mm'),       // "10:00"
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};
```

**Investigation needed:**
- [ ] How is date/time currently selected in UI?
- [ ] What date library is used (date-fns, moment, etc)?
- [ ] Are date and time selected together or separately?

#### Task 3.2: Update API Service Layer
**File:** `frontend/app/services/api.ts` (or similar)

Update the order creation function to send new format.

**Investigation needed:**
- [ ] Where is the API call made?
- [ ] Is there a typed interface for order data?

#### Task 3.3: Update Order Display Components
**Files:** Order history, order details, etc.

These receive order data and display date/time.

**Current:** May convert timestamp to display string
**New:** Use `order_date` and `order_time` strings directly

**Investigation needed:**
- [ ] List components that display order date/time
- [ ] How do they currently format the date?

---

### Phase 4: Testing

#### Task 4.1: Unit Tests
**Files:** `backend/tests/Unit/*.php`

```php
// Test availability check with strings
public function test_availability_check_uses_strings()
{
    $chef = Listener::factory()->create();

    // Should work with string date/time
    $result = $chef->isAvailableForOrder('2025-01-15', '10:00', 'America/Chicago');

    // No timezone conversion should occur
}
```

#### Task 4.2: Integration Tests
**Files:** `backend/tests/Feature/*.php`

```php
// Test order creation with new format
public function test_create_order_with_string_datetime()
{
    $response = $this->postJson('/mapi/create_order', [
        'order_date' => '2025-01-15',
        'order_time' => '10:00',
        'timezone' => 'America/Chicago',
        // ... other fields
    ]);

    $response->assertJson(['success' => 1]);

    // Verify stored correctly
    $order = Order::latest()->first();
    $this->assertEquals('2025-01-15', $order->order_date);
    $this->assertEquals('10:00', $order->order_time);
    $this->assertNotNull($order->order_timestamp);
}
```

#### Task 4.3: Timezone Edge Case Tests

```php
// Test midnight boundary
public function test_order_near_midnight_utc()
{
    // Simulate user in Chicago at 11 PM Thursday (5 AM Friday UTC)
    // Ordering for Friday 10 AM

    // Should NOT fail due to timezone mismatch
}
```

#### Task 4.4: Backward Compatibility Tests

```php
// Test legacy timestamp format still works
public function test_legacy_timestamp_format_still_works()
{
    $response = $this->postJson('/mapi/create_order', [
        'order_date' => 1736521200,  // Old format
        // ... other fields
    ]);

    $response->assertJson(['success' => 1]);
}
```

---

### Phase 5: Deployment

#### Task 5.1: Deploy Database Migration
1. Run migration to add new columns
2. Run backfill for existing orders
3. Verify data integrity

#### Task 5.2: Deploy Backend Changes
1. Deploy code that accepts both formats
2. Monitor for errors
3. Verify new orders use string format

#### Task 5.3: Deploy Frontend Changes
1. Deploy frontend that sends string format
2. Monitor order creation success rate
3. Verify no timezone-related failures

#### Task 5.4: Cleanup (After Verification)
1. Run column rename migration
2. Remove legacy format handling code
3. Drop `legacy_order_date` column

---

## Investigation Checklist

Before starting implementation, investigate these:

### Database
- [ ] Current `order_date` column type in `orders` table
- [ ] Sample data: what format are existing values in?
- [ ] Count of orders to backfill
- [ ] Any foreign keys or indexes on order_date?

### Backend
- [ ] All files that reference `order_date` field
- [ ] All calls to `isAvailableForOrder()`
- [ ] All scheduled jobs that use order datetime
- [ ] All notification code that uses order datetime

### Frontend
- [ ] How date/time picker works in cart screen
- [ ] What date library is used
- [ ] All components that display order date/time
- [ ] API service layer structure

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing orders | Backfill migration preserves data |
| Breaking mobile app during rollout | Backend accepts both formats |
| Scheduler/reminders break | They use `order_timestamp` field |
| Display issues | `order_date`/`order_time` are display-ready |

---

## Success Criteria

1. Orders created with string format work correctly
2. No timezone-related availability check failures
3. Reminders/notifications fire at correct times
4. Existing orders display correctly
5. Zero data loss during migration

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1: Database | 3 | Low |
| Phase 2: Backend | 6 | Medium |
| Phase 3: Frontend | 3 | Medium |
| Phase 4: Testing | 4 | Medium |
| Phase 5: Deployment | 4 | Low |

**Total: 20 tasks**

---

## Next Steps

1. Complete investigation checklist
2. Prioritize tasks
3. Create feature branch
4. Implement Phase 1 (Database)
5. Implement Phase 2 (Backend) with backward compatibility
6. Test thoroughly
7. Implement Phase 3 (Frontend)
8. Deploy incrementally
