# Availability Time Storage & Timezone Audit

## Overview

This document explains how chef availability times flow through the system and identifies timezone-related issues.

## The Problem

Chef availability times are being stored and displayed incorrectly. For example:
- Admin panel shows "12:00am - 12:00am"
- Backend logs show "23:00 - 00:00" or "15:00 - 23:00"
- These don't match what chefs actually set

## System Architecture

### 1. Frontend (Chef Profile Screen)

**File:** `frontend/app/screens/chef/profile/index.tsx`

**How times are created:**
```typescript
// Uses "tomorrow's date" to avoid iOS date picker constraints
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
};

// When chef selects a time (e.g., 9:00 AM), it creates a Date object
// with tomorrow's date + the selected time
const createTimeDate = (hours: number, minutes: number = 0): Date => {
  const result = getTomorrowDate();
  result.setHours(hours, minutes, 0, 0);
  return result;
};
```

**How times are saved:**
```typescript
const getTimestampVal = (date: Date | undefined) => {
  if (date) {
    return Math.floor(date.getTime() / 1000);  // Unix timestamp in seconds
  }
  return 0;
};

// Saved as:
monday_start: days[1].checked ? getTimestampVal(days[1].start) : 0,
monday_end: days[1].checked ? getTimestampVal(days[1].end) : 0,
```

**ISSUE #1: The timestamp includes the full date, not just time**

When a chef selects "9:00 AM" on December 13, 2025:
- `Date.getTime()` returns milliseconds since Unix epoch (Jan 1, 1970 UTC)
- The timestamp will be something like `1734087600` (Dec 13, 2025 9:00 AM in the user's timezone)
- This timestamp is **timezone-dependent** based on the user's device

### 2. Backend Storage

**File:** `backend/app/Http/Controllers/MapiController.php` (updateAvailability)

```php
$ary = [
    'monday_start' => $request->monday_start,  // Stores raw timestamp
    'monday_end' => $request->monday_end,
    // ...
];
app(Availabilities::class)->where('id', $id)->update($ary);
```

**Database columns:** Store the Unix timestamp as-is (integer)

### 3. Backend Reading (Timeslots API)

**File:** `backend/app/Http/Controllers/MapiController.php` (getAvailableTimeslots)

```php
// Convert Unix timestamps to H:i format
$startTime = date('H:i', (int)$scheduledStart);
$endTime = date('H:i', (int)$scheduledEnd);
```

**ISSUE #2: Backend uses UTC timezone**

From `backend/config/app.php`:
```php
'timezone' => 'UTC',
```

But there's also `backend/public/include/config.php`:
```php
date_default_timezone_set('America/Los_Angeles');
```

**This creates inconsistency:**
- Laravel's `date()` function uses UTC (from config/app.php)
- Legacy PHP scripts use America/Los_Angeles

### 4. Admin Panel Display

**File:** `backend/resources/views/admin/chefs.blade.php`

**Before fix:**
```php
$start = date('g:ia', strtotime($times[0]));  // WRONG: strtotime on timestamp
```

**After fix:**
```php
$start = date('g:ia', (int)$times[0]);  // Correct: direct cast
```

## Timezone Flow Analysis

### Example: Chef in Chicago sets availability 9:00 AM - 5:00 PM

1. **Frontend (Device in Chicago, CST = UTC-6):**
   - Chef selects 9:00 AM on Dec 13, 2025
   - JavaScript creates: `new Date("2025-12-13T09:00:00")` in local time
   - `Date.getTime()` returns: `1734102000000` ms (this is 9 AM CST = 3 PM UTC)
   - Saved as: `1734102000` seconds

2. **Backend (UTC timezone):**
   - Receives: `1734102000`
   - `date('H:i', 1734102000)` with UTC timezone = `"15:00"` (3 PM UTC)
   - **The 9 AM that chef intended is now showing as 3 PM!**

3. **Admin Panel (America/Los_Angeles = UTC-8):**
   - Uses `date('g:ia', 1734102000)` with LA timezone
   - Shows: `"7:00am"` (7 AM PST)
   - **Different from both the chef's intent and the backend's interpretation!**

## The Core Problem

**Unix timestamps are absolute moments in time, but availability should be "time of day" independent of date.**

When we store "9:00 AM Monday" as a Unix timestamp:
- The timestamp represents a specific moment (e.g., 9 AM on Dec 13, 2025 in some timezone)
- But we only care about the "9:00 AM" part
- Different timezones interpret the same timestamp as different times of day

## Recommended Solutions

### Option A: Store as Time Strings (Simplest)

Store availability as simple time strings like `"09:00"` and `"17:00"`:
- No timezone conversion needed
- Easy to compare
- Database: `monday_start VARCHAR(5)`

### Option B: Store as Minutes from Midnight (Current-ish)

Store as integer representing minutes from midnight:
- 9:00 AM = 540 (9 * 60)
- 5:00 PM = 1020 (17 * 60)
- No date component, no timezone issues

### Option C: Use Fixed Reference Date (What Code Tries to Do)

The frontend tries this with "tomorrow's date" but it doesn't work because:
1. "Tomorrow" changes every day
2. The timestamp still gets interpreted in different timezones

**If keeping this approach, need to:**
1. Use a fixed reference date (e.g., Jan 1, 2000)
2. Ensure all timezone conversions use the same timezone (e.g., always UTC)
3. Both frontend and backend must agree on the reference

## Immediate Fix Needed

The frontend `getTimestampVal` should normalize to a fixed date:

```typescript
const getTimestampVal = (date: Date | undefined) => {
  if (date) {
    // Use Jan 1, 2000 as reference date (arbitrary but consistent)
    const hours = date.getHours();
    const minutes = date.getMinutes();
    // Create date at Jan 1, 2000 with same time (in UTC)
    const reference = new Date(Date.UTC(2000, 0, 1, hours, minutes, 0, 0));
    return Math.floor(reference.getTime() / 1000);
  }
  return 0;
};
```

And backend should read with same assumption:
```php
// The timestamp is based on Jan 1, 2000 UTC
$startTime = gmdate('H:i', (int)$scheduledStart);  // Use gmdate for UTC
```

## Files Affected

| File | Purpose | Timezone Used |
|------|---------|---------------|
| `frontend/app/screens/chef/profile/index.tsx` | Save availability | Device local |
| `backend/app/Http/Controllers/MapiController.php` | Read/write availability | UTC (Laravel) |
| `backend/resources/views/admin/chefs.blade.php` | Display in admin | America/Los_Angeles |
| `backend/public/include/config.php` | Legacy scripts | America/Los_Angeles |
| `backend/config/app.php` | Laravel default | UTC |

## Summary

The availability time system has multiple timezone inconsistencies:
1. Frontend saves timestamps in device local timezone
2. Backend interprets them in UTC
3. Admin panel displays them in LA timezone
4. No fixed reference date is used

This causes times to shift by several hours depending on where the chef is located and what timezone the server uses for interpretation.
