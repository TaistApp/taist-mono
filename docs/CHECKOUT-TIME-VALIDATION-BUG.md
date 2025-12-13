# Checkout Time Validation Bug - Deep Dive Analysis

## Issue Summary

The checkout screen shows a nonsensical error message: "Orders must be placed at least 3 hours in advance. Please select a delivery time at least **490444 hours** from now." (approximately 56 years!)

Additionally, the 3-hour rule is being incorrectly applied to **all days** instead of just **today**.

---

## Root Causes Identified

### Bug #1: `strtotime()` Used on Unix Timestamp (Type Mismatch)

The frontend sends `order_date` as a **Unix timestamp** (number), but the backend uses `strtotime()` which expects a **date string**.

**Evidence that order_date is stored as Unix timestamp:**
- [frontend/app/types/order.interface.ts:10](frontend/app/types/order.interface.ts#L10): `order_date?: number;`
- [backend/resources/views/admin/orders.blade.php:49](backend/resources/views/admin/orders.blade.php#L49): `date('Y-m-d H:i', ((int)$a->order_date))`
- [backend/database/taist-schema.sql:361](backend/database/taist-schema.sql#L361): `order_date varchar(50) NOT NULL`

The system stores `order_date` as a Unix timestamp (stored as varchar but used as int).

**Frontend sends timestamp:**
[checkout/index.tsx:367](frontend/app/screens/customer/checkout/index.tsx#L367)
```typescript
const order_datetime = day.toDate().getTime() / 1000;  // Unix timestamp in seconds
```

**Backend incorrectly parses it:**
[MapiController.php:2258-2259](backend/app/Http/Controllers/MapiController.php#L2258-L2259)
```php
$orderDate = $request->order_date;        // Receives: 1734028800 (number)
$orderTimestamp = strtotime($orderDate);  // strtotime("1734028800") returns FALSE!
```

**What happens when `strtotime()` fails:**
- `strtotime("1734028800")` returns `false` (not a valid date string)
- `false` in PHP math becomes `0`
- Calculation: `ceil((currentTime - 0) / 3600)` = 490444 hours

**Same bug exists in Listener model:**
[Listener.php:108-110](backend/app/Listener.php#L108-L110)
```php
public function isAvailableForOrder($orderDate)
{
    $orderTimestamp = strtotime($orderDate);  // Same bug - will fail with Unix timestamp
```

---

### Bug #2: 3-Hour Rule Applied to ALL Days (Should Only Be Today)

The 3-hour minimum is enforced for **every day**, even orders placed days in advance.

**Example scenario:**
- Current time: Friday 10:00 PM
- User orders for: Saturday 9:00 AM (11 hours away)
- Backend checks: `Saturday 9 AM < Friday 10 PM + 3 hours`
- Result: **REJECTED** even though it's 11 hours notice!

**Location 1 - Timeslot Generation:**
[MapiController.php:896-898](backend/app/Http/Controllers/MapiController.php#L896-L898)
```php
// Calculate 3-hour minimum from now
$now = time();
$minimumOrderTime = $now + (3 * 60 * 60);
```

[MapiController.php:970-973](backend/app/Http/Controllers/MapiController.php#L970-L973)
```php
// Skip if less than 3 hours from now
if ($slotTimestamp < $minimumOrderTime) {
    continue;  // Skips valid future-day slots!
}
```

**Location 2 - Order Creation Validation:**
[MapiController.php:2260-2271](backend/app/Http/Controllers/MapiController.php#L2260-L2271)
```php
$currentTimestamp = time();
$minimumOrderTime = $currentTimestamp + (3 * 60 * 60); // 3 hours from now

if ($orderTimestamp < $minimumOrderTime) {  // Wrong: applies to ALL days
    $hoursNeeded = ceil(($minimumOrderTime - $orderTimestamp) / 3600);
    return response()->json([
        'success' => 0,
        'error' => "Orders must be placed at least 3 hours in advance...",
    ]);
}
```

---

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND: checkout/index.tsx                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. User selects date in calendar                                            │
│    handleDayPress() → onChangeDay(selectedDate)                [line 248]   │
│                                                                              │
│ 2. useEffect triggers time fetch                               [line 164]   │
│    addTimes() called when DAY changes                                       │
│                                                                              │
│ 3. Fetch timeslots from backend                                [line 207]   │
│    GetAvailableTimeslotsAPI(chefId, selectedDate)                           │
│    selectedDate format: "YYYY-MM-DD" string                    [line 203]   │
│                                                                              │
│ 4. User selects time and taps "PLACE ORDER"                                 │
│    handleCheckout() validates, shows confirm dialog            [line 333]   │
│                                                                              │
│ 5. handleCheckoutProcess(day) called                           [line 366]   │
│    order_datetime = day.toDate().getTime() / 1000              [line 367]   │
│    ↑↑↑ This creates Unix timestamp like 1734028800                          │
│                                                                              │
│ 6. CreateOrderAPI called with order_date as number             [line 406]   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND: MapiController.php createOrder()                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 7. Receive request                                             [line 2252]  │
│    $orderDate = $request->order_date;                          [line 2258]  │
│    Value: 1734028800 (numeric timestamp)                                    │
│                                                                              │
│ 8. BUG #1: Wrong parsing                                       [line 2259]  │
│    $orderTimestamp = strtotime($orderDate);                                 │
│    strtotime("1734028800") returns FALSE → becomes 0                        │
│                                                                              │
│ 9. Calculate minimum time                                      [line 2261]  │
│    $minimumOrderTime = time() + (3 * 60 * 60);                              │
│                                                                              │
│ 10. BUG #2: Compare against ALL days                           [line 2263]  │
│     if ($orderTimestamp < $minimumOrderTime)                                │
│     With $orderTimestamp = 0: ALWAYS TRUE!                                  │
│                                                                              │
│ 11. Calculate absurd hours                                     [line 2264]  │
│     $hoursNeeded = ceil(($minimumOrderTime - 0) / 3600)                     │
│                  = ceil(1734028800 / 3600) = 490444                         │
│                                                                              │
│ 12. Return error                                               [line 2267]  │
│     "...at least 490444 hours from now"                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Exact Code Changes Required

### Change 1: Fix Timestamp Parsing in createOrder()

**File:** [backend/app/Http/Controllers/MapiController.php](backend/app/Http/Controllers/MapiController.php)
**Lines:** 2258-2259

**CURRENT CODE:**
```php
// ===== TMA-011: Validate 3-hour minimum window =====
$orderDate = $request->order_date;
$orderTimestamp = strtotime($orderDate);
```

**NEW CODE:**
```php
// ===== TMA-011: Validate 3-hour minimum window =====
$orderDate = $request->order_date;
// Handle both Unix timestamp (number) and date string formats
$orderTimestamp = is_numeric($orderDate) ? (int)$orderDate : strtotime($orderDate);

// Validate we got a valid timestamp
if (!$orderTimestamp || $orderTimestamp <= 0) {
    return response()->json([
        'success' => 0,
        'error' => 'Invalid order date format',
        'received_value' => $orderDate,
    ]);
}
```

---

### Change 2: Apply 3-Hour Rule Only to Same-Day Orders in createOrder()

**File:** [backend/app/Http/Controllers/MapiController.php](backend/app/Http/Controllers/MapiController.php)
**Lines:** 2260-2271

**CURRENT CODE:**
```php
$currentTimestamp = time();
$minimumOrderTime = $currentTimestamp + (3 * 60 * 60); // 3 hours from now

if ($orderTimestamp < $minimumOrderTime) {
    $hoursNeeded = ceil(($minimumOrderTime - $orderTimestamp) / 3600);
    return response()->json([
        'success' => 0,
        'error' => "Orders must be placed at least 3 hours in advance. Please select a delivery time at least {$hoursNeeded} hours from now.",
        'minimum_order_timestamp' => $minimumOrderTime,
        'requested_timestamp' => $orderTimestamp,
    ]);
}
```

**NEW CODE:**
```php
$currentTimestamp = time();

// 3-hour rule only applies to same-day orders
$orderDateOnly = date('Y-m-d', $orderTimestamp);
$todayDateOnly = date('Y-m-d', $currentTimestamp);
$isSameDay = ($orderDateOnly === $todayDateOnly);

if ($isSameDay) {
    $minimumOrderTime = $currentTimestamp + (3 * 60 * 60); // 3 hours from now

    if ($orderTimestamp < $minimumOrderTime) {
        $hoursNeeded = ceil(($minimumOrderTime - $orderTimestamp) / 3600);
        return response()->json([
            'success' => 0,
            'error' => "Same-day orders must be placed at least 3 hours in advance. Please select a time at least {$hoursNeeded} hours from now, or choose a different day.",
            'minimum_order_timestamp' => $minimumOrderTime,
            'requested_timestamp' => $orderTimestamp,
        ]);
    }
}

// For future days, just ensure the order is not in the past
if ($orderTimestamp < $currentTimestamp) {
    return response()->json([
        'success' => 0,
        'error' => 'Cannot place orders for times in the past.',
        'requested_timestamp' => $orderTimestamp,
        'current_timestamp' => $currentTimestamp,
    ]);
}
```

---

### Change 3: Fix Timestamp Parsing in Listener::isAvailableForOrder()

**File:** [backend/app/Listener.php](backend/app/Listener.php)
**Lines:** 108-112

**CURRENT CODE:**
```php
public function isAvailableForOrder($orderDate)
{
    $orderTimestamp = strtotime($orderDate);
    $orderDateOnly = date('Y-m-d', $orderTimestamp);
    $orderTime = date('H:i', $orderTimestamp);
```

**NEW CODE:**
```php
public function isAvailableForOrder($orderDate)
{
    // Handle both Unix timestamp (number) and date string formats
    $orderTimestamp = is_numeric($orderDate) ? (int)$orderDate : strtotime($orderDate);

    if (!$orderTimestamp || $orderTimestamp <= 0) {
        \Log::warning("[AVAILABILITY] Invalid order date received: " . var_export($orderDate, true));
        return false;
    }

    $orderDateOnly = date('Y-m-d', $orderTimestamp);
    $orderTime = date('H:i', $orderTimestamp);
```

---

### Change 4: Apply 3-Hour Rule Only to Same-Day in getAvailableTimeslots()

**File:** [backend/app/Http/Controllers/MapiController.php](backend/app/Http/Controllers/MapiController.php)
**Lines:** 896-898 and 970-973

**CURRENT CODE (lines 896-898):**
```php
// Calculate 3-hour minimum from now
$now = time();
$minimumOrderTime = $now + (3 * 60 * 60);
```

**NEW CODE (lines 896-902):**
```php
// Calculate 3-hour minimum - only applies to today's date
$now = time();
$minimumOrderTime = $now + (3 * 60 * 60);

// Check if the requested date is today
$todayDateOnly = date('Y-m-d', $now);
$requestedDateOnly = date('Y-m-d', $dateTimestamp);
$isRequestedDateToday = ($requestedDateOnly === $todayDateOnly);
```

**CURRENT CODE (lines 970-973):**
```php
// Skip if less than 3 hours from now
if ($slotTimestamp < $minimumOrderTime) {
    continue;
}
```

**NEW CODE (lines ~975-979):**
```php
// Skip if less than 3 hours from now (only for today's date)
if ($isRequestedDateToday && $slotTimestamp < $minimumOrderTime) {
    continue;
}
```

---

## Summary of All Changes

| # | File | Line(s) | Change Description |
|---|------|---------|-------------------|
| 1 | [MapiController.php](backend/app/Http/Controllers/MapiController.php) | 2258-2259 | Fix timestamp parsing with `is_numeric()` check |
| 2 | [MapiController.php](backend/app/Http/Controllers/MapiController.php) | 2260-2271 | Apply 3-hour rule only to same-day orders |
| 3 | [Listener.php](backend/app/Listener.php) | 108-112 | Fix timestamp parsing with `is_numeric()` check |
| 4 | [MapiController.php](backend/app/Http/Controllers/MapiController.php) | 896-898, 970-973 | Apply 3-hour filter only when date is today |

**Total files modified:** 2
**Total changes:** 4 locations

---

## Testing Plan

### Unit Tests

#### Test 1: Unix Timestamp Parsing
```php
// Should correctly parse Unix timestamp
$orderDate = 1734028800;
$orderTimestamp = is_numeric($orderDate) ? (int)$orderDate : strtotime($orderDate);
assert($orderTimestamp === 1734028800);
```

#### Test 2: Date String Parsing (Backward Compatibility)
```php
// Should still work with date strings
$orderDate = '2024-12-20 15:30:00';
$orderTimestamp = is_numeric($orderDate) ? (int)$orderDate : strtotime($orderDate);
assert($orderTimestamp === strtotime('2024-12-20 15:30:00'));
```

### Integration Tests

| Test Case | Current Time | Order Time | Expected Result |
|-----------|--------------|------------|-----------------|
| Same-day, < 3 hours | 2:00 PM | Today 4:00 PM | REJECTED - "at least 1 hour" |
| Same-day, = 3 hours | 2:00 PM | Today 5:00 PM | ACCEPTED |
| Same-day, > 3 hours | 2:00 PM | Today 6:00 PM | ACCEPTED |
| Tomorrow morning | 10:00 PM | Tomorrow 9:00 AM | ACCEPTED (different day) |
| Next week | Monday | Wednesday 10 AM | ACCEPTED |
| Past time | Now | 1 hour ago | REJECTED - "past" |

### Manual Testing Checklist

- [ ] Select today, verify times < 3 hours are hidden
- [ ] Select today, verify times > 3 hours are shown
- [ ] Select tomorrow, verify ALL chef availability times shown
- [ ] Select a day next week, verify all times shown
- [ ] Complete checkout for same-day order > 3 hours
- [ ] Complete checkout for next-day order at any time
- [ ] Verify error message is sensible (not "490444 hours")

---

## Risk Assessment

### Low Risk
- Changes are isolated to timestamp parsing and date comparison
- Backward compatible (still handles date strings)
- No database schema changes required

### Potential Edge Cases
1. **Midnight crossover:** Order at 11 PM for 1 AM tomorrow - treated as "different day" (correct)
2. **Server timezone:** All comparisons use server time (consistent with current behavior)
3. **Leap seconds/DST:** PHP's `date()` handles these automatically

---

## Implementation Order

1. **First:** Fix Bug #1 (timestamp parsing) - this is the critical fix that unblocks all orders
2. **Second:** Fix Bug #2 (same-day only) - this improves UX for future-day orders
3. **Third:** Run tests
4. **Fourth:** Deploy and monitor for errors

---

## Rollback Plan

If issues arise, revert the 4 code changes. The changes are additive (adding `is_numeric()` check and date comparison) so reverting is straightforward.
