# Availability System Deep Dive

## Issue: "This chef is not available at the requested time" Error

This document investigates why users may receive the "This chef is not available at the requested time" error even when they've selected a time that should be valid.

---

## Critical Bug Found

### Bug #1: Property Access Error in `getAvailableTimeslots` - CONFIRMED

**Location:** [MapiController.php:924](backend/app/Http/Controllers/MapiController.php#L924)

**Status:** VERIFIED BUG

```php
if ($override->is_cancelled) {  // BUG: accessing non-existent property
```

**Investigation Results:**
- Checked [AvailabilityOverride.php](backend/app/Models/AvailabilityOverride.php) - NO `is_cancelled` property or accessor exists
- Checked database migration - NO `is_cancelled` column in `tbl_availability_overrides`
- The table only has a `status` ENUM column with values: 'confirmed', 'modified', 'cancelled'
- The model provides an `isCancelled()` METHOD at line 50

**What happens:**
- PHP accessing non-existent property returns `null`
- `null` is falsy, so the condition `if ($override->is_cancelled)` is ALWAYS false
- Result: **Cancelled overrides are NEVER detected in `getAvailableTimeslots`**
- This means cancelled days will show timeslots to customers!

**Fix Required:**
```php
if ($override->isCancelled()) {  // Correct: call the method
```

**Severity:** HIGH - Customers can see and select timeslots for days chefs have cancelled

---

## Bug #2: Inconsistent "Today" Logic Between Endpoints - CONFIRMED

**Status:** VERIFIED INCONSISTENCY

**Location:**
- [getAvailableTimeslots](backend/app/Http/Controllers/MapiController.php#L870) (line 870)
- [isAvailableForOrder](backend/app/Listener.php#L108) (line 108)

**The Problem:**

| Endpoint | Today Logic |
|----------|-------------|
| `getAvailableTimeslots` | Shows timeslots from weekly schedule even if no override exists for today |
| `isAvailableForOrder` (createOrder) | Returns `false` if no override exists for today (line 133) |

**getAvailableTimeslots Logic (lines 922-955):**
```php
if ($override) {
    // Use override times
} else {
    // No override - get weekly schedule  ← ALLOWS weekly schedule for today!
    $availability = Availabilities::where('user_id', $chefId)->first();
    // ... returns timeslots from weekly schedule
}
```

**isAvailableForOrder Logic (lines 127-135):**
```php
if ($override) {
    return $override->isAvailableAt($orderTime);
}

// Today with no override = NOT available  ← REJECTS if no override for today!
if ($orderDateOnly === $today) {
    return false;
}
```

**Result:**
1. User selects today's date
2. `getAvailableTimeslots` shows timeslots from weekly schedule (no override check for today)
3. User selects a timeslot and places order
4. `createOrder` calls `isAvailableForOrder` which FAILS because no override exists for today

**This is the most likely cause of the reported issue.**

---

## System Overview

### Data Flow

```
User selects date → Frontend fetches timeslots → User selects time →
Frontend sends order → Backend validates availability → Order created or error
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Checkout Screen | [checkout/index.tsx](frontend/app/screens/customer/checkout/index.tsx) | UI for date/time selection |
| CreateOrder API | [MapiController.php:2265](backend/app/Http/Controllers/MapiController.php#L2265) | Backend order creation |
| Availability Check | [Listener.php:108](backend/app/Listener.php#L108) | `isAvailableForOrder()` method |
| Override Model | [AvailabilityOverride.php](backend/app/Models/AvailabilityOverride.php) | Override data and methods |

---

## Availability Storage

### 1. Weekly Recurring Schedule (`tbl_availabilities`) - ANALYZED

**Schema:**
```sql
- user_id (FK to chef)
- monday_start, monday_end (varchar(50))
- tuesday_start, tuesday_end (varchar(50))
- ... (for all 7 days)
```

**Data Format (Mixed):**
| Format | Example | When Used |
|--------|---------|-----------|
| "HH:MM" strings | "09:00", "21:00" | New format (preferred) |
| Unix timestamps | "1609459200" | Legacy data |
| NULL, 0, empty | | Day not available |

**Normalization Logic ([Listener.php:254](backend/app/Listener.php#L254)):**
```php
private function normalizeTimeValue($value): ?string {
    // "HH:MM" string → return as-is
    if (preg_match('/^\d{2}:\d{2}$/', $value)) return $value;

    // Legacy Unix timestamp (9+ digits) → convert to H:i
    if (is_numeric($value) && strlen($value) >= 9) {
        return date('H:i', (int)$value);  // ⚠️ Uses server timezone (UTC)
    }
    return null;
}
```

**Timezone Issue with Legacy Data:**
- If legacy timestamps were saved in a local timezone (e.g., CST)
- And server is now UTC
- The converted time will be WRONG by the timezone offset
- Example: "09:00 CST" saved as timestamp → converts to "15:00 UTC" on display

### 2. Daily Overrides (`tbl_availability_overrides`)

```sql
Schema:
- chef_id (BIGINT)
- override_date (DATE)
- start_time (TIME NULL)
- end_time (TIME NULL)
- status (ENUM: 'confirmed', 'modified', 'cancelled')
- source (ENUM: 'manual_toggle', 'reminder_confirmation')

Unique Key: (chef_id, override_date)
```

---

## Availability Logic Rules

### Core Rule: Today vs Tomorrow+

| Scenario | Logic |
|----------|-------|
| **TODAY** | REQUIRES an override to be available. If no override exists for today, chef is NOT available |
| **Tomorrow+** | Falls back to weekly recurring schedule if no override exists |

This is intentional design - chefs must actively confirm they're available today.

### Override Status Logic

The `isCancelled()` method in [AvailabilityOverride.php:50](backend/app/Models/AvailabilityOverride.php#L50):

```php
public function isCancelled()
{
    return $this->status === 'cancelled' ||
           ($this->start_time === null && $this->end_time === null);
}
```

**Key insight:** An override with `status='confirmed'` but `null` times is treated as cancelled!

---

## The Validation Flow

### Step 1: Frontend Sends Timestamp

In [checkout/index.tsx:407-408](frontend/app/screens/customer/checkout/index.tsx#L407-L408):

```typescript
const handleCheckoutProcess = async (day: Moment) => {
    const order_datetime = day.toDate().getTime() / 1000;  // Unix timestamp
    // ...
    const orderData: IOrder = {
        order_date: order_datetime,  // Sent as Unix timestamp (seconds)
    };
};
```

### Step 2: Backend Parses and Validates

In [MapiController.php:2279-2337](backend/app/Http/Controllers/MapiController.php#L2279-L2337):

```php
$orderTimestamp = is_numeric($orderDate) ? (int)$orderDate : strtotime($orderDate);

// Extract date and time parts
$orderDateOnly = date('Y-m-d', $orderTimestamp);  // e.g., "2025-12-30"
$todayDateOnly = date('Y-m-d', $currentTimestamp);

// Check if chef is available
if (!$chef->isAvailableForOrder($orderDate)) {
    return response()->json([
        'success' => 0,
        'error' => 'This chef is not available at the requested time...',
    ]);
}
```

### Step 3: `isAvailableForOrder()` Logic

In [Listener.php:108-139](backend/app/Listener.php#L108-L139):

```php
public function isAvailableForOrder($orderDate)
{
    $orderTimestamp = is_numeric($orderDate) ? (int)$orderDate : strtotime($orderDate);
    $orderDateOnly = date('Y-m-d', $orderTimestamp);
    $orderTime = date('H:i', $orderTimestamp);  // e.g., "14:00"
    $today = date('Y-m-d');

    // Check for override first
    $override = AvailabilityOverride::forChef($this->id)
        ->forDate($orderDateOnly)
        ->first();

    if ($override) {
        return $override->isAvailableAt($orderTime);  // Uses override
    }

    // TODAY with no override = NOT available
    if ($orderDateOnly === $today) {
        return false;  // <-- THIS IS WHERE IT LIKELY FAILS
    }

    // Tomorrow+ - use weekly schedule
    return $this->hasScheduleForDateTime($orderTimestamp, $orderTime);
}
```

---

## Potential Causes of False "Not Available" Errors

### Cause 1: Timezone Mismatch - INVESTIGATED

**Status:** PARTIALLY MITIGATED for timeslots, but STILL A PROBLEM for order validation

**Server Config:** UTC ([app.php:70](backend/config/app.php#L70))

**Investigation Results:**

1. **`getAvailableTimeslots` (line 870):** Uses date string "YYYY-MM-DD" passed directly from frontend
   - Frontend sends: `DAY.format('YYYY-MM-DD')` (user's local date)
   - Backend receives: "2025-12-30" as string
   - This is **timezone-safe** because it's a string comparison

2. **`createOrder` (line 2265):** Uses Unix timestamp
   - Frontend sends: `day.toDate().getTime() / 1000` (Unix timestamp)
   - Backend extracts date with: `date('Y-m-d', $orderTimestamp)`
   - **PROBLEM:** This uses server's UTC timezone to extract the date!

**The Mismatch Scenario:**
```
User's local time:    Dec 30, 2025 at 11:00 PM CST (UTC-6)
Unix timestamp:       1735621200
Frontend sends:       1735621200

Backend (UTC) does:   date('Y-m-d', 1735621200) = "2025-12-31" (next day in UTC!)
Backend checks:       $today = date('Y-m-d') = "2025-12-30" (still Dec 30 UTC)

Result: Order is for "Dec 31" but chef has override for "Dec 30" only → FAILS
```

**Why `getAvailableTimeslots` works but `createOrder` fails:**
- `getAvailableTimeslots`: Receives date as string "2025-12-30" → correct comparison
- `createOrder`: Receives Unix timestamp → converts to UTC date → WRONG date extracted

### Cause 2: Today Without Override - ANALYZED

**Status:** This is **intentional design** BUT the bug is in `getAvailableTimeslots` not enforcing it.

**Design Intent:**
- Chefs must actively confirm they're available today (toggle on)
- Tomorrow and beyond uses weekly schedule automatically
- This prevents orders going to chefs who forgot to mark themselves unavailable

**Enforcement Points:**
| Location | Enforced? | Line |
|----------|-----------|------|
| `isAvailableForOrder()` | YES | [Listener.php:133](backend/app/Listener.php#L133) |
| `getChefList()` filter | YES | [MapiController.php:3364](backend/app/Http/Controllers/MapiController.php#L3364) |
| `getAvailableTimeslots()` | **NO** | [MapiController.php:934](backend/app/Http/Controllers/MapiController.php#L934) |

**The Bug:**
`getAvailableTimeslots` does NOT check if it's today without override. It shows timeslots from weekly schedule regardless.

**Fix Required:** Add to `getAvailableTimeslots`:
```php
// After checking for override (around line 930)
if (!$override && $requestedDateOnly === $todayDateOnly) {
    // Today with no override = no slots available
    return response()->json(['success' => 1, 'data' => []]);
}
```

### Cause 3: Time Outside Override Range

**Scenario:**
- Override exists with `start_time='09:00'`, `end_time='17:00'`
- User selects 6:00 PM (18:00)
- Time is outside the override window → **FAILS**

### Cause 4: Override With Null Times - LOGIC INCONSISTENCY FOUND

**Status:** Potential logic bug in `isAvailableAt()` method

**The `isCancelled()` Logic (line 50-52):**
```php
public function isCancelled() {
    return $this->status === 'cancelled' ||
           ($this->start_time === null && $this->end_time === null);
}
```

**The `isAvailableAt()` Logic (line 61-85):**
```php
public function isAvailableAt($time) {
    if ($this->isCancelled()) {
        return false;  // If both times are NULL → cancelled → returns false
    }

    // If no times set, assume available all day
    if (!$this->start_time || !$this->end_time) {
        return true;  // DEAD CODE - this can never be reached!
    }
    // ...
}
```

**The Bug:**
- Line 69 checks `if (!$this->start_time || !$this->end_time)` and returns `true`
- But this condition can NEVER be true because:
  - If both are NULL → `isCancelled()` returns true → function exits at line 65
  - If only one is NULL → this check passes and returns true (available all day)
  - If neither is NULL → continues to time range check

**Edge Cases:**
| start_time | end_time | isCancelled() | isAvailableAt() Result |
|------------|----------|---------------|------------------------|
| NULL | NULL | true | **false** (cancelled) |
| NULL | 17:00 | false | **true** (all day) |
| 09:00 | NULL | false | **true** (all day) |
| 09:00 | 17:00 | false | time range check |

**Concern:** If only one time is set (partial data), the system treats chef as "available all day" which may not be intended.

### Cause 5: Race Condition - CONFIRMED POSSIBLE

**Status:** No locking mechanism exists

**Scenario:**
1. User views available timeslots at 1:45 PM, sees 2:00 PM available
2. Chef's override expires or changes at 1:50 PM
3. User places order at 1:55 PM for 2:00 PM
4. Order fails because availability changed

**Investigation Results:**
- Searched for `lock`, `reserve`, `mutex`, `transaction` patterns
- No timeslot reservation mechanism exists
- No database locking during order creation for availability
- Chef can change availability between timeslot fetch and order placement

**Risk Level:** MEDIUM - Uncommon but possible, especially for:
- Same-day orders near the 3-hour cutoff
- Popular chefs with many concurrent customers
- Chefs who frequently toggle availability

---

## Debugging Steps

### 1. Check Override Table

```sql
SELECT * FROM tbl_availability_overrides
WHERE chef_id = [CHEF_ID]
AND override_date = '[ORDER_DATE]';
```

Look for:
- Does an override exist?
- What is the status?
- Are start_time and end_time populated?

### 2. Check Weekly Schedule

```sql
SELECT * FROM tbl_availabilities
WHERE user_id = [CHEF_ID];
```

Look for:
- Are the relevant day's columns populated?
- Are values in `HH:MM` format or legacy timestamps?

### 3. Add Logging

Add to [Listener.php:108](backend/app/Listener.php#L108):

```php
public function isAvailableForOrder($orderDate)
{
    $orderTimestamp = is_numeric($orderDate) ? (int)$orderDate : strtotime($orderDate);
    $orderDateOnly = date('Y-m-d', $orderTimestamp);
    $orderTime = date('H:i', $orderTimestamp);
    $today = date('Y-m-d');

    \Log::info('[AVAILABILITY DEBUG]', [
        'chef_id' => $this->id,
        'raw_order_date' => $orderDate,
        'order_timestamp' => $orderTimestamp,
        'order_date_only' => $orderDateOnly,
        'order_time' => $orderTime,
        'today_utc' => $today,
        'server_timezone' => date_default_timezone_get(),
    ]);

    // ... rest of method
}
```

### 4. Test Timezone Impact

```php
\Log::info('[TIMEZONE TEST]', [
    'received_timestamp' => $orderTimestamp,
    'as_utc' => date('Y-m-d H:i:s', $orderTimestamp),
    'server_tz' => date_default_timezone_get(),
    'cst_time' => (new \DateTime("@$orderTimestamp"))
        ->setTimezone(new \DateTimeZone('America/Chicago'))
        ->format('Y-m-d H:i:s'),
]);
```

---

## Recommended Fixes

### Fix 1: Property Access Bug (Critical)

In [MapiController.php:924](backend/app/Http/Controllers/MapiController.php#L924):

```php
// BEFORE (buggy)
if ($override->is_cancelled) {

// AFTER (fixed)
if ($override->isCancelled()) {
```

### Fix 2: Timezone-Aware Date Comparison

Convert incoming timestamp to chef's timezone before extracting date:

```php
// Get chef's timezone (default to Chicago if not set)
$chefTimezone = $chef->timezone ?? 'America/Chicago';

// Convert timestamp to chef's local time
$orderDateTime = new \DateTime("@$orderTimestamp");
$orderDateTime->setTimezone(new \DateTimeZone($chefTimezone));

$orderDateOnly = $orderDateTime->format('Y-m-d');
$orderTime = $orderDateTime->format('H:i');

// Also convert "today" to chef's timezone
$todayInChefTz = (new \DateTime('now', new \DateTimeZone($chefTimezone)))->format('Y-m-d');
```

### Fix 3: Add Informative Error Messages

Return more specific errors to help debugging:

```php
if (!$override && $orderDateOnly === $today) {
    return response()->json([
        'success' => 0,
        'error' => 'Chef has not confirmed availability for today. Same-day orders require chef confirmation.',
        'debug_info' => [
            'order_date' => $orderDateOnly,
            'server_today' => $today,
        ]
    ]);
}
```

---

## Summary of All Findings

### Confirmed Bugs (Must Fix)

| Priority | Bug | Location | Impact |
|----------|-----|----------|--------|
| **P0** | `is_cancelled` property doesn't exist | [MapiController.php:924](backend/app/Http/Controllers/MapiController.php#L924) | Cancelled days show timeslots |
| **P0** | "Today requires override" not enforced in `getAvailableTimeslots` | [MapiController.php:934](backend/app/Http/Controllers/MapiController.php#L934) | Users see slots they can't book |
| **P1** | Timezone mismatch in `createOrder` | [Listener.php:118](backend/app/Listener.php#L118) | Late-night orders fail |

### Root Cause Analysis

**Most Likely Cause of the Reported Issue:**
The user saw timeslots because `getAvailableTimeslots` showed them from the weekly schedule, but `createOrder` failed because `isAvailableForOrder` requires an override for today.

**The Mismatch:**
```
getAvailableTimeslots: "Here are today's slots from weekly schedule"
createOrder:           "No override for today? REJECTED!"
```

### Prioritized Fix List

**Fix 1 (Critical): `is_cancelled` bug**
```php
// MapiController.php line 924
// BEFORE:
if ($override->is_cancelled) {
// AFTER:
if ($override->isCancelled()) {
```

**Fix 2 (Critical): Add "today requires override" check to `getAvailableTimeslots`**
```php
// MapiController.php after line 930, add:
if (!$override && $requestedDateOnly === $todayDateOnly) {
    // Today with no override = no slots available (consistent with createOrder)
    return response()->json(['success' => 1, 'data' => []]);
}
```

**Fix 3 (Important): Timezone-aware date extraction in `isAvailableForOrder`**
```php
// Listener.php isAvailableForOrder() - use America/Chicago for all date comparisons
$tz = new \DateTimeZone('America/Chicago');
$orderDateTime = (new \DateTime("@$orderTimestamp"))->setTimezone($tz);
$orderDateOnly = $orderDateTime->format('Y-m-d');
$orderTime = $orderDateTime->format('H:i');
$today = (new \DateTime('now', $tz))->format('Y-m-d');
```

### Testing Recommendations

1. **Test same-day orders** - Verify no timeslots shown if chef hasn't toggled on
2. **Test cancelled overrides** - Verify no timeslots shown for cancelled days
3. **Test late-night orders** (10 PM - midnight) - Verify correct date used
4. **Test order placement** - Verify orders succeed when timeslots are shown
