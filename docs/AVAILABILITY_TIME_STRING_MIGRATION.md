# Availability Time String Migration Plan

## Summary

Migrate availability times from Unix timestamps to simple "HH:MM" time strings.

**Current state:** Frontend saves Unix timestamps, backend tries to convert them, timezone issues cause wrong times.

**Target state:** Store times as simple strings like "09:00", "17:00". No timezone conversion needed.

---

## Database

**Table:** `tbl_availabilities`

**Current schema:** Already uses `varchar(50)` - no schema change needed!

```sql
`monday_start` varchar(50) DEFAULT NULL,
`monday_end` varchar(50) DEFAULT NULL,
-- etc.
```

**Current data:** Mix of Unix timestamps (from app) and time strings (from seed data)

**Migration needed:** Convert existing Unix timestamp values to "HH:MM" strings

```sql
-- Example migration (run once):
UPDATE tbl_availabilities
SET monday_start = DATE_FORMAT(FROM_UNIXTIME(monday_start), '%H:%i')
WHERE monday_start REGEXP '^[0-9]+$' AND LENGTH(monday_start) > 5;
```

---

## Files to Change

### 1. Frontend - Chef Profile (SAVE times)

**File:** `frontend/app/screens/chef/profile/index.tsx`

**Current code (lines 304-309):**
```typescript
const getTimestampVal = (date: Date | undefined) => {
  if (date) {
    return Math.floor(date.getTime() / 1000);  // Unix timestamp
  }
  return 0;
};
```

**New code:**
```typescript
const getTimeString = (date: Date | undefined): string => {
  if (date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;  // "09:00", "17:30"
  }
  return '';
};
```

**Update save params (lines 274-287):**
```typescript
var params: IChefProfile = {
  bio,
  sunday_start: days[0].checked ? getTimeString(days[0].start) : '',
  sunday_end: days[0].checked ? getTimeString(days[0].end) : '',
  monday_start: days[1].checked ? getTimeString(days[1].start) : '',
  monday_end: days[1].checked ? getTimeString(days[1].end) : '',
  // ... etc for all days
};
```

**Update load data (lines 136-142) - timestampToTimeDate:**
```typescript
// Convert "HH:MM" string to Date for time picker
const timeStringToDate = (timeStr: string | number | undefined): Date | undefined => {
  if (!timeStr) return undefined;

  // Handle legacy timestamp format (for backwards compatibility during migration)
  if (typeof timeStr === 'number' || (typeof timeStr === 'string' && /^\d{9,}$/.test(timeStr))) {
    const timestamp = typeof timeStr === 'number' ? timeStr : parseInt(timeStr);
    const date = new Date(timestamp * 1000);
    const result = getTomorrowDate();
    result.setHours(date.getHours(), date.getMinutes(), 0, 0);
    return result;
  }

  // New string format "HH:MM"
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return undefined;

  const result = getTomorrowDate();
  result.setHours(hours, minutes, 0, 0);
  return result;
};
```

---

### 2. Frontend - Chef Home (CHECK if day has availability)

**File:** `frontend/app/screens/chef/home/index.tsx`

**Current code (lines 214-227):**
```typescript
const isAvailableSunday =
  (profile.sunday_start ?? 0) > 0 && (profile.sunday_end ?? 0) > 0;
```

**New code:**
```typescript
const isAvailableSunday =
  !!profile.sunday_start && profile.sunday_start !== '0' && profile.sunday_start !== '' &&
  !!profile.sunday_end && profile.sunday_end !== '0' && profile.sunday_end !== '';
```

Or create a helper:
```typescript
const hasAvailability = (start: string | number | undefined, end: string | number | undefined): boolean => {
  // Handle both legacy timestamps and new strings
  if (!start || !end) return false;
  if (start === '0' || start === '' || start === 0) return false;
  if (end === '0' || end === '' || end === 0) return false;
  return true;
};

const isAvailableSunday = hasAvailability(profile.sunday_start, profile.sunday_end);
```

---

### 3. Frontend - Checkout (CHECK working days)

**File:** `frontend/app/screens/customer/checkout/index.tsx`

**Current code (lines 87-103):**
```typescript
const getChefWorkingDays = (): number[] => {
  const workingDays: number[] = [];
  if (Number(chefProfile.sunday_start) > 0) workingDays.push(0);
  if (Number(chefProfile.monday_start) > 0) workingDays.push(1);
  // etc.
};
```

**New code:**
```typescript
const hasTime = (time: string | number | undefined): boolean => {
  if (!time) return false;
  if (typeof time === 'number') return time > 0;
  return time !== '' && time !== '0' && time.includes(':');
};

const getChefWorkingDays = (): number[] => {
  const workingDays: number[] = [];
  if (hasTime(chefProfile.sunday_start)) workingDays.push(0);
  if (hasTime(chefProfile.monday_start)) workingDays.push(1);
  // etc.
};
```

---

### 4. Frontend - TypeScript Interface

**File:** `frontend/app/types/chef.profile.interface.ts`

**Current:**
```typescript
monday_start?: number;
monday_end?: number;
```

**New:**
```typescript
monday_start?: string | number;  // "09:00" or legacy timestamp
monday_end?: string | number;
```

---

### 5. Backend - Get Available Timeslots API

**File:** `backend/app/Http/Controllers/MapiController.php`

**Current code (lines 930-940):**
```php
$scheduledStart = $availability->$startField;
$scheduledEnd = $availability->$endField;

// Convert Unix timestamps to H:i format
$startTime = date('H:i', (int)$scheduledStart);
$endTime = date('H:i', (int)$scheduledEnd);
```

**New code:**
```php
$scheduledStart = $availability->$startField;
$scheduledEnd = $availability->$endField;

// Handle both formats: "HH:MM" strings or legacy timestamps
$startTime = $this->normalizeTimeValue($scheduledStart);
$endTime = $this->normalizeTimeValue($scheduledEnd);

// Add helper method:
private function normalizeTimeValue($value): ?string {
    if (empty($value) || $value === '0') return null;

    // Already a time string "HH:MM"
    if (is_string($value) && preg_match('/^\d{2}:\d{2}$/', $value)) {
        return $value;
    }

    // Legacy Unix timestamp
    if (is_numeric($value) && strlen((string)$value) >= 9) {
        return date('H:i', (int)$value);
    }

    return null;
}
```

---

### 6. Backend - Listener Model (isAvailableForOrder)

**File:** `backend/app/Listener.php`

**Current code (lines 165-166):**
```php
$scheduledStartTime = date('H:i', (int)$scheduledStart);
$scheduledEndTime = date('H:i', (int)$scheduledEnd);
```

**New code:** Use same `normalizeTimeValue` helper or inline:
```php
// Handle both "HH:MM" strings and legacy timestamps
$scheduledStartTime = is_numeric($scheduledStart) && strlen($scheduledStart) >= 9
    ? date('H:i', (int)$scheduledStart)
    : $scheduledStart;
$scheduledEndTime = is_numeric($scheduledEnd) && strlen($scheduledEnd) >= 9
    ? date('H:i', (int)$scheduledEnd)
    : $scheduledEnd;
```

---

### 7. Backend - Admin Panel Views

**File:** `backend/resources/views/admin/chefs.blade.php` (lines 70-71)

**Current:**
```php
$start = date('g:ia', (int)$times[0]);
$end = date('g:ia', (int)$times[1]);
```

**New:**
```php
// Handle both formats
$start = (is_numeric($times[0]) && strlen($times[0]) >= 9)
    ? date('g:ia', (int)$times[0])
    : date('g:ia', strtotime($times[0]));
$end = (is_numeric($times[1]) && strlen($times[1]) >= 9)
    ? date('g:ia', (int)$times[1])
    : date('g:ia', strtotime($times[1]));
```

**File:** `backend/resources/views/admin/pendings.blade.php` (lines 62-68)

Same pattern - check if numeric timestamp or time string.

**File:** `backend/resources/views/admin/profiles.blade.php` (lines 40-71)

Already has `is_numeric()` check - may need to adjust length check.

---

### 8. Backend - Update Availability API

**File:** `backend/app/Http/Controllers/MapiController.php` (updateAvailability)

**No change needed** - it just saves whatever is passed. The frontend change handles the format.

---

## Migration Steps

1. **Create database migration** to convert existing timestamps to time strings
2. **Update TypeScript interface** to allow string | number
3. **Update frontend chef profile** to save as strings, load either format
4. **Update frontend chef home** to check availability with either format
5. **Update frontend checkout** to check working days with either format
6. **Update backend getAvailableTimeslots** to handle either format
7. **Update backend Listener.php** to handle either format
8. **Update admin panel views** to display either format
9. **Test thoroughly**
10. **Remove legacy timestamp support** after all data is migrated

---

## Backwards Compatibility

During migration, all code handles BOTH formats:
- Legacy: Unix timestamps like `946767600`
- New: Time strings like `"09:00"`

Detection logic: If value is numeric and >= 9 digits, it's a timestamp. Otherwise it's a string.

After migration is complete and all data converted, legacy support can be removed.

---

## Testing Checklist

- [ ] Chef can save availability (new format)
- [ ] Chef can load existing availability (legacy format)
- [ ] Chef can load existing availability (new format)
- [ ] Chef home shows correct "available" status
- [ ] Checkout shows correct working days
- [ ] Checkout shows correct time slots
- [ ] Admin panel displays correct times
- [ ] Time slots respect 3-hour lead time
- [ ] All days work (Mon-Sun)
