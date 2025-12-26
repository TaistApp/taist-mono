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
| **Today** | No | NOT available - chef must toggle on |
| **Today** | Yes (active) | Available during override times |
| **Today** | Yes (cancelled) | NOT available |
| **Tomorrow** | No | Available per weekly schedule |
| **Tomorrow** | Yes (active) | Available during override times (overrides weekly) |
| **Tomorrow** | Yes (cancelled) | NOT available |
| **2+ days out** | N/A | Available per weekly schedule |

### Key Rule: Today Requires Override

For same-day orders, chefs must explicitly "go live" by creating an availability override. This ensures chefs are actively ready to receive orders rather than relying on a static weekly schedule.

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

## 24-Hour Confirmation Reminders

Chefs receive reminders 24 hours before their scheduled availability to confirm/modify/cancel.

### How It Works

1. **Scheduled Command**: `chef:send-confirmation-reminders` runs hourly
2. **Logic**: Finds chefs with weekly schedule for tomorrow who don't have an override yet
3. **Notification**: Sends SMS + push notification
4. **Actions**: Chef can confirm (creates override), modify times, or cancel

### SMS Content
```
Taist: You're scheduled [Day], [Time Range]. Open the app to confirm, modify, or cancel.
```

---

## Backend Code Reference

### Key Files

| File | Description |
|------|-------------|
| `backend/app/Models/AvailabilityOverride.php` | Override model with scopes and methods |
| `backend/app/Listener.php` | `isAvailableForOrder()` method |
| `backend/app/Http/Controllers/MapiController.php` | API endpoints |
| `backend/app/Services/ChefConfirmationReminderService.php` | 24-hour reminders |
| `backend/app/Console/Commands/SendConfirmationReminders.php` | Reminder command |
| `backend/app/Console/Commands/CleanupOldOverrides.php` | Cleanup command |

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

    // Today with no override = NOT available
    if ($orderDateOnly === $today) {
        return false;
    }

    // Tomorrow and beyond - fall back to weekly schedule
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
4. [ ] Customer cannot order from chef without override for today
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
