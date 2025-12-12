# Plan: Home Page Availability Fixes

## Issues Identified

### Issue 1: Chefs appear then disappear (race condition)
**Location:** [frontend/app/screens/customer/home/index.tsx](frontend/app/screens/customer/home/index.tsx)

**Problem:** When clicking a date, there's a race condition causing double API calls:
1. `handleDayPress` (line 191-195) calls `loadData()` directly after setting the day
2. The `useEffect` on lines 187-189 ALSO fires because `DAY` changed, triggering another `loadData()`

This causes chefs to appear briefly from the first call, then get replaced/cleared by the second call which may return different results due to timing.

**Fix:** Remove the duplicate `loadData()` call in `handleDayPress` - the `useEffect` will handle it automatically when `DAY` changes.

### Issue 2: Wrong date being calculated for past weekdays
**Location:** [backend/app/Http/Controllers/MapiController.php:3128-3143](backend/app/Http/Controllers/MapiController.php#L3128-L3143)

**Problem:** The frontend sends `week_day` (0-6 for Sun-Sat) but NOT the actual date. The backend calculates the date like this:

```php
$daysToAdd = $targetWeekday - $currentWeekday;
if ($daysToAdd < 0) {
    $daysToAdd += 7; // Forces NEXT week if negative
}
```

**Example:** Today is Thursday Dec 12 (weekday 4). User clicks Monday the 15th:
- Frontend sends `week_day: 1` (Monday)
- Backend calculates: `1 - 4 = -3` → adds 7 → `+4 days`
- Backend thinks user wants Monday Dec 16, not Monday Dec 15

**However**, looking at the frontend calendar (customCalendar.tsx), it shows a week strip and the user CAN select future Mondays. The issue is the frontend only sends `week_day` not the actual date.

**Fix Options:**
1. **Option A (Recommended):** Send the actual date from frontend instead of just `week_day`
2. **Option B:** Keep current behavior but document that it always shows "this week or next week" based on current day

### Issue 3: Admin panel doesn't show chef availability
**Location:** [backend/resources/views/admin/chefs.blade.php](backend/resources/views/admin/chefs.blade.php)

**Problem:** The admin panel chefs view shows basic chef info but no availability information (weekly schedule or overrides).

**Fix:** Add availability columns to the chefs table showing:
- Weekly availability schedule (Mon-Sun start/end times)
- Active overrides for the next 7 days (if any)

---

## Implementation Plan

### Step 1: Fix race condition (Frontend)
**File:** `frontend/app/screens/customer/home/index.tsx`

```tsx
// Change handleDayPress from:
const handleDayPress = async (day: moment.Moment) => {
  onChangeDAY(day);
  await Delay(10);
  loadData();  // REMOVE THIS - useEffect handles it
};

// To:
const handleDayPress = (day: moment.Moment) => {
  onChangeDAY(day);
  // useEffect on line 187-189 will trigger loadData() automatically
};
```

### Step 2: Send actual date to backend (Frontend + Backend)
**Frontend:** `frontend/app/screens/customer/home/index.tsx`

Modify `loadData()` and `loadDatax()` to send the actual date string:
```tsx
const loadData = async () => {
  const week_day = DAY.weekday();
  const selected_date = DAY.format('YYYY-MM-DD'); // ADD THIS
  // ... pass selected_date to API
};
```

**API:** `frontend/app/services/api.ts`
Update `GetSearchChefAPI` to accept and pass `selected_date` parameter.

**Backend:** `backend/app/Http/Controllers/MapiController.php`
Update `getSearchChefs()` to use `selected_date` if provided, falling back to week_day calculation:
```php
if (isset($request->selected_date)) {
    $dateString = $request->selected_date;
} else if (isset($request->week_day)) {
    // existing week_day calculation as fallback
}
```

### Step 3: Add availability to admin panel (Backend)
**File:** `backend/resources/views/admin/chefs.blade.php`

Add new columns after "Longitude":
- "Weekly Availability" - shows condensed schedule like "M: 9-5, T: 9-5, ..."
- "Overrides" - shows any overrides in next 7 days

**File:** `backend/app/Http/Controllers/AdminController.php`
Update `chefs()` method to eager-load availability data:
```php
$chefs = Users::where('role', 1)
    ->with(['availability'])
    ->get();
```

---

## Files to Modify

1. `frontend/app/screens/customer/home/index.tsx` - Fix race condition, send actual date
2. `frontend/app/services/api.ts` - Add selected_date parameter
3. `backend/app/Http/Controllers/MapiController.php` - Accept selected_date parameter
4. `backend/resources/views/admin/chefs.blade.php` - Add availability columns
5. `backend/app/Http/Controllers/AdminController.php` - Load availability data

---

## Testing

1. **Race condition fix:** Click different dates rapidly, verify chefs don't flash/disappear
2. **Date fix:** Select Monday the 15th, verify backend receives correct date
3. **Admin panel:** Verify availability shows correctly for all chefs
