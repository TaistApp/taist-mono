# Chef Availability System

## Overview

The chef availability system controls when chefs appear in customer searches and can receive orders. It uses a combination of:

1. **Weekly Schedule** - Recurring availability set by chefs (e.g., "Tuesdays 11am-5pm")
2. **Availability Overrides** - Day-specific overrides for today/tomorrow
3. **Go Live Toggle** - Quick way for chefs to toggle on/off for today

---

## How It Works

### Availability Logic by Order Date

| Order Date | Override Exists? | Result |
|------------|-----------------|--------|
| **Today** | No | Available per weekly schedule |
| **Today** | Yes (active) | Available during override times |
| **Today** | Yes (cancelled) | NOT available |
| **Tomorrow** | No | Available per weekly schedule |
| **Tomorrow** | Yes (active) | Available during override times (overrides weekly) |
| **Tomorrow** | Yes (cancelled) | NOT available |
| **2+ days out** | N/A | Available per weekly schedule |

### Key Rule: Override Takes Priority

For same-day and future-day orders, weekly schedule is the default. If an override exists for that date, the override wins:
- Active override: use override hours
- Cancelled override: chef is unavailable for that date

---

## Go Live Toggle

The Go Live toggle appears in the chef app header and provides a quick way to control same-day availability.

### Location
- **Component**: `frontend/app/components/GoLiveToggle/index.tsx`
- **Displayed in**: App header when in chef context
- **Visibility**: Only shown to activated chefs (`is_pending !== 1`). Hidden during onboarding to avoid confusion before the chef account is fully set up.

### User Flow

1. **Going Live**:
   - Chef taps the toggle (shows "Off")
   - Time picker appears asking "Available Until?"
   - Chef selects end time (default: 3 hours from now)
   - Creates availability override for today
   - Toggle shows "Live"

2. **Going Offline**:
   - Chef taps the toggle (shows "Live")
   - Confirmation modal appears
   - Chef confirms
   - Creates cancelled override for today
   - Toggle shows "Off"

3. **Auto-Off at End Time**:
   - When the selected end time passes, toggle automatically shows "Off"
   - This is checked on screen focus

### Time Rollover

If a chef selects a time that has already passed today (e.g., selecting 2 PM when it's 5 PM), the system automatically rolls over to tomorrow at that time.

---

## Backend API Endpoints

### POST /mapi/set_availability_override

Creates or updates an availability override for a specific day.

**Request:**
```json
{
  "override_date": "2025-12-24",
  "start_time": "14:00",
  "end_time": "18:00",
  "status": "confirmed",
  "source": "manual_toggle"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `override_date` | string | Yes | Date in YYYY-MM-DD format |
| `start_time` | string | No* | Time in HH:mm format |
| `end_time` | string | No* | Time in HH:mm format |
| `status` | string | No | `confirmed`, `modified`, or `cancelled` |
| `source` | string | No | `manual_toggle` or `reminder_confirmation` |

*Required unless status is `cancelled`

**Validation:**
- Date must be today or tomorrow (within 36 hours)
- Cannot set override for past dates
- end_time must be after start_time
- Time format must be HH:mm

**Response:**
```json
{
  "success": 1,
  "data": {
    "id": 123,
    "override_date": "2025-12-24",
    "start_time": "14:00",
    "end_time": "18:00",
    "status": "confirmed",
    "source": "manual_toggle",
    "status_message": "Confirmed for Dec 24, 2025"
  }
}
```

### GET /mapi/get_availability_overrides

Gets all availability overrides for the authenticated chef.

**Query Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| `start_date` | string | Filter from this date (YYYY-MM-DD) |
| `end_date` | string | Filter to this date (YYYY-MM-DD) |

**Response:**
```json
{
  "success": 1,
  "data": [
    {
      "id": 123,
      "override_date": "2025-12-24",
      "start_time": "14:00",
      "end_time": "18:00",
      "status": "confirmed",
      "source": "manual_toggle",
      "status_message": "Confirmed for Dec 24, 2025",
      "created_at": "2025-12-24 10:30:00"
    }
  ]
}
```

---

## Database Schema

### Table: tbl_availability_overrides

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `chef_id` | bigint | FK to tbl_users |
| `override_date` | date | The specific date being overridden |
| `start_time` | time | When availability starts (null if cancelled) |
| `end_time` | time | When availability ends (null if cancelled) |
| `status` | enum | `confirmed`, `modified`, `cancelled` |
| `source` | enum | `manual_toggle`, `reminder_confirmation` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Indexes:**
- `chef_id, override_date` (unique) - One override per chef per day

### Table: tbl_availabilities (Weekly Schedule)

Stores the recurring weekly schedule. Each day has start/end time fields:
- `monday_start`, `monday_end`
- `tuesday_start`, `tuesday_end`
- ... etc.

---

## Time Window Semantics

### End Time is EXCLUSIVE

When a chef sets availability from `start_time` to `end_time`:
- **Start time is INCLUSIVE**: Chef is available starting AT the start time
- **End time is EXCLUSIVE**: Chef is available UNTIL the end time (not AT it)

**Example:** Availability `9:00pm-11:00pm` means:
- 9:00pm, 9:30pm, 10:00pm, 10:30pm - available
- 11:00pm - NOT available (window closes)

If a chef wants to accept orders AT 11pm, they should set end time to `11:30pm`.

### Code Locations

This behavior is controlled by comparison operators (`<` for exclusive) in:

| File | Method | What it controls |
|------|--------|------------------|
| `Listener.php:195` | `hasScheduleForDateTime()` | Weekly schedule validation |
| `AvailabilityOverride.php:86` | `isAvailableAt()` | Override validation |
| `MapiController.php:997` | `getAvailableTimeslots()` | Time slot generation |
| `MapiController.php:3158-3259` | `getSearchChefs()` | Home screen chef filtering |

**To switch to INCLUSIVE end times:** Change all `<` operators to `<=` in these locations.

---

## Time Blockout Logic

When customers browse a chef's available time slots, the system filters out slots that conflict with existing orders. This prevents double-booking and ensures chefs have adequate prep time.

### How It Works

1. Customer requests available timeslots for a chef on a specific date
2. Backend fetches all active orders for that chef on that date (statuses: Requested=1, Accepted=2, On My Way=7)
3. For each order, a "blocked window" is calculated:
   - **Start**: `order_time - estimated_time` (prep start)
   - **End**: `order_time + ORDER_BUFFER_MINUTES` (30 min post-delivery buffer)
4. Any timeslot that falls within a blocked window is removed from the result

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `BLOCKOUT_ORDER_STATUSES` | `[1, 2, 7]` | Statuses that block timeslots |
| `ORDER_BUFFER_MINUTES` | `30` | Buffer after order time |
| `DEFAULT_ORDER_DURATION_MINUTES` | `120` | Fallback if no estimated_time on menu |

### Example

Chef has an order at 12:00 with a 20-minute prep item:
- Blocked window: 11:40 (12:00 - 20min) to 12:30 (12:00 + 30min)
- Slots removed: 11:30, 12:00, 12:30 (any slot starting within the blocked window)

### API Endpoint

```
GET /mapi/get_available_timeslots/{chef_id}?date=YYYY-MM-DD
```

Returns an array of available time strings: `["09:00", "09:30", "10:00", ...]`

### Backend Code

| File | Method | Description |
|------|--------|-------------|
| `MapiController.php` | `getAvailableTimeslots()` | Main endpoint |
| `MapiController.php` | `filterSlotsByOrders()` | Blockout filtering logic |

### Frontend: Availability Section

The chef detail screen includes an interactive availability section where customers can browse dates and times before adding items to cart.

**File:** `frontend/app/screens/customer/chefDetail/components/availabilitySection.tsx`

Features:
- Horizontal scrollable date pills (next 14 days)
- Time slot pills fetched from `GetAvailableTimeslotsAPI`
- Selected time is passed through to checkout for pre-selection
- Loading and empty states

---

## 24-Hour Confirmation Reminders

Chefs receive reminders 24 hours before their scheduled availability to confirm/modify/cancel.

### How It Works

1. **Scheduled Command**: `chef:send-confirmation-reminders` runs hourly
2. **Logic**: Finds chefs with weekly schedule for tomorrow who don't have an override yet
3. **Notification**: Sends SMS + push notification
4. **Actions**: Chef can confirm (creates override), modify times, or cancel

### SMS Content
```
Taist: You're scheduled [Day], [Time Range] tomorrow. If plans changed, open the app to update availability.
```

---

## Backend Code Reference

### Key Files

| File | Description |
|------|-------------|
| `backend/app/Models/AvailabilityOverride.php` | Override model with scopes and methods |
| `backend/app/Listener.php` | `isAvailableForOrder()` method |
| `backend/app/Http/Controllers/MapiController.php` | API endpoints, timeslot generation, blockout filtering |
| `backend/app/Services/ChefConfirmationReminderService.php` | 24-hour reminders |
| `backend/app/Console/Commands/SendConfirmationReminders.php` | Reminder command |
| `backend/app/Console/Commands/CleanupOldOverrides.php` | Cleanup command |
| `frontend/app/screens/customer/chefDetail/components/availabilitySection.tsx` | Chef detail availability UI |

### Listener::isAvailableForOrder()

Core availability check used by order creation and chef search.

```php
public function isAvailableForOrder($orderDate)
{
    $orderDateOnly = date('Y-m-d', $orderTimestamp);
    $orderTime = date('H:i', $orderTimestamp);
    $today = date('Y-m-d');

    // Check for override first
    $override = AvailabilityOverride::forChef($this->id)
        ->forDate($orderDateOnly)
        ->first();

    if ($override) {
        return $override->isAvailableAt($orderTime);
    }

    // No override - fall back to weekly schedule
    return $this->hasScheduleForDateTime($orderTimestamp, $orderTime);
}
```

---

## Frontend Code Reference

### Key Files

| File | Description |
|------|-------------|
| `frontend/app/components/GoLiveToggle/index.tsx` | Toggle component |
| `frontend/app/components/GoLiveToggle/styles.ts` | Toggle styles |
| `frontend/app/services/api.ts` | API functions |

### API Functions

```typescript
// Create/update override
SetAvailabilityOverrideAPI({
  override_date: "2025-12-24",
  start_time: "14:00",
  end_time: "18:00",
  status: "confirmed",
  source: "manual_toggle",
});

// Get overrides
GetAvailabilityOverridesAPI({
  start_date: "2025-12-24",
  end_date: "2025-12-24",
});
```

---

## Scheduled Tasks

| Command | Schedule | Description |
|---------|----------|-------------|
| `chef:send-confirmation-reminders` | Hourly | Sends 24-hour reminders to chefs |
| `chef:cleanup-old-overrides` | Daily 2am | Deletes overrides older than 7 days |

---

## Deprecated (Do Not Use)

The following are deprecated and should not be used:

| Endpoint | Replacement |
|----------|-------------|
| `POST /mapi/toggle_online` | `POST /mapi/set_availability_override` |
| `GET /mapi/get_online_status` | `GET /mapi/get_availability_overrides` |

The `is_online`, `online_start`, `online_until` fields on tbl_users are deprecated and not checked by the availability system.

---

## Testing

### Manual Testing Checklist

1. [ ] Chef toggles Live → appears in customer search for today
2. [ ] Chef toggles Off → disappears from customer search for today
3. [ ] Customer can order from chef with active override
4. [ ] Customer can order from chef without override for today if weekly schedule/time allows
5. [ ] Tomorrow orders work with weekly schedule (no override needed)
6. [ ] Past time selection rolls over to tomorrow
7. [ ] Toggle shows "Off" after end time passes

### Backend Test Commands

```bash
# Test isAvailableForOrder logic
php artisan tinker --execute="
\$chef = App\Listener::where('user_type', 2)->first();
\$today = date('Y-m-d') . ' 14:00:00';
echo \$chef->isAvailableForOrder(\$today) ? 'Available' : 'Not available';
"

# Check overrides for a chef
php artisan tinker --execute="
App\Models\AvailabilityOverride::forChef(2)->get();
"
```
