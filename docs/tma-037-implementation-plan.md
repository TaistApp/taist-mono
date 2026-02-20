# TMA-037: Order Time Blockout Logic + Demand Signaling + Chef Detail Availability

**Status:** ALL STEPS COMPLETE (1-6)
**SOW Estimate:** 6h
**Created:** February 20, 2026
**Last Updated:** February 20, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Feature 1: Demand Signaling ("Hot" Badge)](#feature-1-demand-signaling-hot-badge)
3. [Feature 2: Arrival Time Blockout Logic](#feature-2-arrival-time-blockout-logic)
4. [Feature 3: Chef Detail — Menu + Availability Combined](#feature-3-chef-detail--menu--availability-combined)
5. [Environment Variables](#environment-variables)
6. [Migration Plan](#migration-plan)
7. [Testing Plan](#testing-plan)
8. [Open Questions](#open-questions)

---

## Overview

Three related changes ship together under TMA-037:

| Sub-feature | Scope | Screens Affected |
|---|---|---|
| Demand signaling | Backend + Frontend | Home page chef cards |
| Time blockout | Backend only (timeslot endpoint) | Chef detail (new), Checkout |
| Menu + availability | Frontend only | Chef detail screen |

### Key Existing Code Paths

| What | File | Lines |
|---|---|---|
| Chef search endpoint | `backend/app/Http/Controllers/MapiController.php` | 3209–3563 |
| Timeslot generation | `backend/app/Http/Controllers/MapiController.php` | 918–1077 |
| Order model | `backend/app/Models/Orders.php` | — |
| Order table | `tbl_orders` (schema: `backend/database/taist-schema.sql:352`) | — |
| Menu table | `tbl_menus` (field: `estimated_time` = prep+cook minutes) | — |
| Chef card component | `frontend/app/screens/customer/home/components/chefCard.tsx` | — |
| Chef detail screen | `frontend/app/screens/customer/chefDetail/index.tsx` | — |
| Checkout screen | `frontend/app/screens/customer/checkout/index.tsx` | — |
| Available timeslots API | `frontend/app/services/api.ts` → `GetAvailableTimeslotsAPI` | — |
| Order statuses | 1=Requested, 2=Accepted, 3=Completed, 4=Cancelled, 5=Rejected, 6=Expired, 7=On My Way | — |

---

## Feature 1: Demand Signaling ("Hot" Badge)

### Behavior

On the **home page** chef cards:

- If a chef has **active order requests** (`status IN (1, 2)` — Requested or Accepted) for the selected date → badge always shows
- If a chef does NOT have real orders → badge shows with **configurable probability** (default 40%), deterministic per day (same chefs stay "hot" all day, re-randomizes next day)
- Badge shows **regardless of availability state** — it's a demand signal, not an availability indicator
- Badge is purely cosmetic on the home page; does not change ordering flow

### Why deterministic per day

If randomization changed per session/refresh, customers would notice chefs flickering between "hot" and not. A daily seed keeps it consistent within a browsing day.

### Backend Changes

#### `MapiController::getSearchChefs` (~line 3209)

After building the chef results array, add demand signal computation:

```php
// --- Demand signaling ---
$demandEnabled = env('DEMAND_SIGNAL_ENABLED', false);
$fakePercentage = (int) env('DEMAND_SIGNAL_FAKE_PERCENTAGE', 40);
$demandStatuses = [1, 2]; // Requested + Accepted (pivot to just [2] later if needed)

if ($demandEnabled) {
    $selectedDate = $request->selected_date; // already available, YYYY-MM-DD

    // Batch query: which chefs have orders today?
    $chefIds = collect($chefs)->pluck('id')->toArray();
    $chefsWithOrders = DB::table('tbl_orders')
        ->whereIn('chef_user_id', $chefIds)
        ->where('order_date_new', $selectedDate)
        ->whereIn('status', $demandStatuses)
        ->distinct()
        ->pluck('chef_user_id')
        ->toArray();

    $dateSeed = $selectedDate; // "2026-02-20"

    foreach ($chefs as &$chef) {
        $hasRealDemand = in_array($chef->id, $chefsWithOrders);
        $hasFakeDemand = !$hasRealDemand
            && $fakePercentage > 0
            && (crc32($chef->id . '-' . $dateSeed) % 100) < $fakePercentage;

        $chef->is_hot = $hasRealDemand || $hasFakeDemand;
    }
} else {
    foreach ($chefs as &$chef) {
        $chef->is_hot = false;
    }
}
```

**Notes:**
- `crc32(chef_id + '-' + date)` gives a stable integer per chef per day
- `% 100 < 40` means ~40% of non-demand chefs get the badge
- Single batch query for all chefs — no N+1
- Uses `order_date_new` (the newer `DATE` column added in Jan 2026 migration). For orders that only have the legacy `order_date` Unix timestamp, the backfill migration (`2026_01_08_000002`) already populated `order_date_new`.

#### Fallback for `order_date_new` nulls

Some very old orders may have null `order_date_new`. The demand query above will naturally exclude them (WHERE on null = false). This is acceptable — very old unfilled orders aren't relevant demand signals.

### Frontend Changes

#### `IUser` type (or inline on search response)

Add `is_hot?: boolean` to the chef search response type. Location: `frontend/app/types/user.interface.ts` or wherever `IUser` is defined.

#### `chefCard.tsx` — Badge rendering

```tsx
// In the chef card header area, next to name or rating:
{chefInfo.is_hot && (
  <View style={styles.hotBadge}>
    <Text style={styles.hotBadgeText}>Popular Today</Text>
  </View>
)}
```

Design notes:
- Small pill badge with warm color (orange/red gradient or solid `#FF6B35`)
- Position: near the chef name or overlaid on the profile image corner
- Copy options: "Popular Today", "In Demand", or just the fire emoji character `🔥`
- Keep it subtle — a small badge, not a full banner

---

## Feature 2: Arrival Time Blockout Logic

### Behavior

Affects **timeslot generation** only (`getAvailableTimeslots` endpoint). Does NOT change the home page chef search or availability filtering.

**When chef has accepted/active orders for the requested date:**

```
new_arrival >= current_local_time + 2 hours                                          (minimum lead time)
new_arrival >= earlier_arrival + earlier_completion_time + 0.5 hours                  (buffer after previous order)
new_arrival + new_completion_time + 0.5 hours <= later_arrival                        (buffer before next order)
```

Where:
- `earlier_completion_time` = earlier order's menu item `estimated_time` (known from `tbl_menus`)
- `new_completion_time` = chef's max `estimated_time` across live menu (conservative, since we don't know what item will be ordered yet)
- `0.5 hours` buffer applied symmetrically — same pattern on both sides: `arrival + completion + buffer`

**When chef has NO orders for the requested date:**

```
new_arrival >= current_local_time + 2 hours           (minimum lead time only)
```

### How "order end time" is calculated (TENTATIVE)

Each order row in `tbl_orders` has:
- `order_time` — `"HH:MM"` string (the customer-selected arrival/start time)
- `menu_id` — FK to `tbl_menus`

Each menu item in `tbl_menus` has:
- `estimated_time` — prep+cook time in minutes (values: 15, 30, 45, 60, 90, 120)

**Customers can only order 1 menu item per order**, so each order row has exactly one `estimated_time`. No grouping or MAX needed.

```
order_end = order_time + estimated_time (of that order's menu item)
```

### What is "max session duration" for the NEW order?

At timeslot generation time, we don't know which menu item the customer will pick. Since customers order 1 item, the session duration = that item's `estimated_time`. But we don't know it yet.

Options:

1. **Use the chef's max `estimated_time` across their live menu** — conservative, guarantees no overlap regardless of what item is picked
2. **Use a fixed upper bound** (e.g., 2.5 hours = 150 minutes) — simpler but less tailored
3. **Make it configurable** via env var

**Recommendation:** Option 1 with a fallback to a configurable default. This is per-chef accurate — a chef whose longest item is 60 min won't have unnecessarily large gaps.

```php
$maxSessionMinutes = DB::table('tbl_menus')
    ->where('user_id', $chefId)
    ->where('is_live', 1)
    ->max('estimated_time') ?? env('DEFAULT_ORDER_DURATION_MINUTES', 120);
```

### Backend Changes

#### `MapiController::getAvailableTimeslots` (~line 918)

**Current behavior (simplified):**
1. Determine start/end time from override or weekly schedule
2. Generate 30-min slots within that window
3. Filter out slots within 3 hours of now (today only)
4. Return filtered slots

**New behavior:**
1. Determine start/end time from override or weekly schedule *(unchanged)*
2. Generate 30-min slots within that window *(unchanged)*
3. ~~Filter out slots within 3 hours of now~~ → Filter out slots within **2 hours** of now (today only)
4. **NEW:** Query accepted orders for this chef + date
5. **NEW:** For each existing order group, compute end time using `estimated_time`
6. **NEW:** Filter out slots that conflict with existing orders
7. Return filtered slots

**Minimum lead time change:** 3 hours → 2 hours (line ~951):

```php
// BEFORE:
$minimumOrderTime = $now + (3 * 60 * 60);

// AFTER:
$minimumLeadHours = (int) env('ORDER_MINIMUM_LEAD_HOURS', 2);
$minimumOrderTime = $now + ($minimumLeadHours * 60 * 60);
```

**Order conflict filtering (new code block, after base slot generation):**

```php
// Fetch accepted/active orders for this chef on this date
$existingOrders = DB::table('tbl_orders')
    ->join('tbl_menus', 'tbl_orders.menu_id', '=', 'tbl_menus.id')
    ->where('tbl_orders.chef_user_id', $chefId)
    ->where('tbl_orders.order_date_new', $date)
    ->whereIn('tbl_orders.status', [1, 2, 7]) // Requested, Accepted, On My Way
    ->select('tbl_orders.order_time', 'tbl_menus.estimated_time')
    ->get();

// Each order = 1 menu item, so estimated_time is per-row (no grouping needed)
$orderWindows = $existingOrders->map(function ($order) {
    $arrivalMinutes = self::timeToMinutes($order->order_time); // "14:00" → 840
    $prepMinutes = $order->estimated_time ?? 120;
    return [
        'start' => $arrivalMinutes,
        'end'   => $arrivalMinutes + $prepMinutes,
    ];
})->sortBy('start')->values()->toArray();

// Compute max session duration for a NEW order at this chef
$maxNewSessionMinutes = DB::table('tbl_menus')
    ->where('user_id', $chefId)
    ->where('is_live', 1)
    ->max('estimated_time') ?? (int) env('DEFAULT_ORDER_DURATION_MINUTES', 120);

$bufferMinutes = (int) env('ORDER_BUFFER_MINUTES', 30); // 0.5 hours

// Filter slots — buffer applied symmetrically (after previous order AND before next order)
$filteredSlots = array_filter($slots, function ($slotHHMM) use ($orderWindows, $maxNewSessionMinutes, $bufferMinutes) {
    $slotMinutes = self::timeToMinutes($slotHHMM);
    $newOrderEnd = $slotMinutes + $maxNewSessionMinutes; // conservative: chef's longest menu item

    foreach ($orderWindows as $window) {
        // Constraint 1: new arrival must be after existing order end + buffer
        if ($slotMinutes < $window['end'] + $bufferMinutes) {
            // Also check if new arrival is within or before existing order window
            if ($slotMinutes >= $window['start'] - $bufferMinutes) {
                return false;
            }
        }

        // Constraint 2: new order end + buffer must not exceed existing order start
        if ($newOrderEnd + $bufferMinutes > $window['start'] && $slotMinutes < $window['end']) {
            return false;
        }
    }

    return true;
});
```

**Helper method to add** (on the controller or a utility class):

```php
private static function timeToMinutes(string $time): int
{
    [$h, $m] = explode(':', $time);
    return ((int) $h * 60) + (int) $m;
}
```

### Visual Diagram: Slot Filtering

```
Chef's day: 10:00 ──────────────────────────────────── 18:00
Chef's longest menu item: 60 min

Existing order 1:       [12:00 ═══ 13:30]  (90 min prep)
Existing order 2:                           [15:00 ═══ 16:00]  (60 min prep)

Constraint 1 (after previous):  new_arrival >= order_end + 30 min buffer
Constraint 2 (before next):     new_arrival + 60 min (new order) + 30 min buffer <= next_arrival

Blocked zones:
  Order 1 blocks:   [11:30 ████████ 14:00]   (30 min before arrival through end + 30 min)
  Order 2 blocks:   [14:30 ████████ 16:30]   (30 min before arrival through end + 30 min)

  But ALSO: any slot where new_end + buffer > next order start is blocked
  e.g. slot 14:00 → new order ends 15:00 → 15:00 + 0:30 = 15:30 > 15:00 → BLOCKED

Available slots:    10:00 10:30 11:00                        16:30 17:00 17:30
                    ✅    ✅    ✅                             ✅    ✅    ✅
```

### What statuses count as "blocking"?

| Status | Value | Blocks slots? | Reason |
|---|---|---|---|
| Requested | 1 | **Yes** | Chef hasn't decided yet; slot is tentatively taken |
| Accepted | 2 | **Yes** | Confirmed booking |
| Completed | 3 | No | Already done |
| Cancelled | 4 | No | Freed up |
| Rejected | 5 | No | Freed up |
| Expired | 6 | No | Never confirmed |
| On My Way | 7 | **Yes** | Active in-progress order |

---

## Feature 3: Chef Detail — Menu + Availability Combined

### Current Chef Detail Screen

**File:** `frontend/app/screens/customer/chefDetail/index.tsx`

Current layout (top to bottom):
1. Back button
2. Profile image (160px), name, star rating, bio
3. "All Chefs are fully insured" badge
4. Reviews list
5. Allergen filter tabs
6. Menu items list
7. Sticky bottom: "CHECKOUT" + "CLEAR CART" buttons

### Proposed New Layout

```
┌─────────────────────────────────┐
│  ← Back                        │
│                                 │
│  [Chef Photo]  Name  ⭐ 4.8    │
│  Bio text...                    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │  📅 Date: [Thu, Feb 20 ▼]  │ │
│ │                             │ │
│ │  Available Times:           │ │
│ │  [10:00] [10:30] [11:00]   │ │  ← horizontally scrollable
│ │  [14:00] [16:30] [17:00]   │ │
│ │                             │ │
│ │  (or: "No times available   │ │
│ │   for this date")           │ │
│ └─────────────────────────────┘ │
│                                 │
│  ── Menu ──────────────────     │
│  [Allergen filters]            │
│                                 │
│  🍽 Jerk Chicken              │
│  Serves 2 · $24.00            │
│  Description...        [ADD]   │
│                                 │
│  🍽 Mac & Cheese              │
│  Serves 4 · $18.00            │
│  Description...        [ADD]   │
│                                 │
│  ... (scrollable menu list)    │
│                                 │
├─────────────────────────────────┤
│  CHECKOUT - $42.00  │ CLEAR    │  ← sticky bottom
└─────────────────────────────────┘
```

### Design Principles

- **Availability section is compact** — date selector + 1-2 rows of time pills, not a full calendar
- **Menu is the primary content** — takes up 70-80% of scrollable area
- Even if no times are available, menu is fully browsable (so users can explore and come back another day)
- Date defaults to `selectedDate` from nav params (whatever day user was browsing on home page)
- Changing date re-fetches timeslots via `GetAvailableTimeslotsAPI`

### Frontend Changes

#### `chefDetail/index.tsx`

**New state:**
```tsx
const [selectedDate, setSelectedDate] = useState<string>(route.params.selectedDate);
const [availableSlots, setAvailableSlots] = useState<string[]>([]);
const [isLoadingSlots, setIsLoadingSlots] = useState(true);
```

**New effect — fetch timeslots on mount and date change:**
```tsx
useEffect(() => {
  let cancelled = false;
  setIsLoadingSlots(true);

  GetAvailableTimeslotsAPI(chefInfo.id, selectedDate)
    .then((res) => {
      if (!cancelled && res.success) {
        setAvailableSlots(res.data);
      }
    })
    .finally(() => {
      if (!cancelled) setIsLoadingSlots(false);
    });

  return () => { cancelled = true; };
}, [selectedDate, chefInfo.id]);
```

**New component: `AvailabilitySection`**

```tsx
// frontend/app/screens/customer/chefDetail/components/availabilitySection.tsx

type Props = {
  selectedDate: string;
  onDateChange: (date: string) => void;
  availableSlots: string[];
  isLoading: boolean;
  chefWorkingDays: number[];  // from chefProfile
};
```

Renders:
- Date selector row (today + next 6 days as pills, or a compact dropdown)
- Horizontal `ScrollView` of time slot pills
- "No availability" message if slots array is empty
- Loading spinner while fetching

#### Integration with Checkout

When a user taps a time slot on the chef detail screen:
- Store the selected time in state
- When they tap CHECKOUT, pass `selectedDate` + `selectedTime` to the checkout screen
- Checkout screen pre-selects that date+time instead of defaulting

If no time is selected, checkout behaves as it does today (user picks date+time there).

#### Navigation params update

`navigate.toCustomer.checkout` already accepts `selectedDate`. Add optional `selectedTime`:

```typescript
// frontend/app/utils/navigation.ts
checkout: (params: {
  chefInfo: IUser;
  orders: IOrder[];
  weekDay: number;
  chefProfile: IChefProfile;
  selectedDate: string;
  selectedTime?: string;  // NEW: pre-selected time from chef detail
}) => void;
```

---

## Configuration (Class Constants)

Originally planned as env vars, but simplified to class constants on `MapiController` per code review feedback — easier to manage and no env config drift risk.

**Location:** `backend/app/Http/Controllers/MapiController.php` (top of class)

```php
const DEMAND_SIGNAL_FAKE_PERCENTAGE = 40;
const DEMAND_SIGNAL_STATUSES = [1, 2];       // Requested + Accepted
const BLOCKOUT_ORDER_STATUSES = [1, 2, 7];   // Requested + Accepted + On My Way
const ORDER_BUFFER_MINUTES = 30;
const DEFAULT_ORDER_DURATION_MINUTES = 120;
```

| Constant | Value | Purpose |
|---|---|---|
| `DEMAND_SIGNAL_FAKE_PERCENTAGE` | `40` | % of non-demand chefs that randomly show badge (0 = real demand only) |
| `DEMAND_SIGNAL_STATUSES` | `[1, 2]` | Which order statuses count as "demand" |
| `BLOCKOUT_ORDER_STATUSES` | `[1, 2, 7]` | Which order statuses block timeslots |
| `ORDER_BUFFER_MINUTES` | `30` | Gap between end of one order and start of next |
| `DEFAULT_ORDER_DURATION_MINUTES` | `120` | Fallback if chef has no live menu items with `estimated_time` |

No `DEMAND_SIGNAL_ENABLED` toggle — the feature is always on. To disable, set `DEMAND_SIGNAL_FAKE_PERCENTAGE` to 0 (only real demand shows).

---

## Migration Plan

No database migrations required. All changes are:
- Backend: controller logic + env vars
- Frontend: component changes + new component

The `order_date_new`, `order_time`, and `estimated_time` fields already exist and are populated.

---

## Testing Plan

### Unit Tests (Backend)

**New test file:** `backend/tests/Unit/Controllers/TimeslotBlockoutTest.php`

| Test Case | Description |
|---|---|
| No existing orders | Slots returned = all within window, filtered by 2hr lead |
| One accepted order at 12:00 (90min prep) | Slots 11:30–14:00 blocked |
| Two orders with gap | Only slots outside both windows + buffers returned |
| Requested order (status 1) blocks | Tentative booking still blocks |
| Cancelled order (status 4) doesn't block | Freed slot is available |
| Chef with no live menus | Falls back to DEFAULT_ORDER_DURATION_MINUTES |
| Demand signal — real orders | `is_hot = true` for chef with orders |
| Demand signal — fake (40%) | Deterministic: same result for same chef+date |
| Demand signal — disabled | `is_hot = false` for all |

### Maestro E2E (Frontend)

| Flow | Steps |
|---|---|
| Hot badge visible | Log in as customer → home → verify fire badge on at least one chef |
| Chef detail shows times | Tap chef → verify availability section visible with time pills |
| Chef detail date change | Change date → verify slots update |
| Checkout pre-selection | Select time on chef detail → tap checkout → verify time pre-selected |
| Empty availability | Navigate to chef with fully booked day → verify "no times" message |

### Manual Smoke Test (Staging)

1. Create two orders for same chef, same day, 3 hours apart
2. Verify timeslots endpoint excludes blocked windows
3. Verify timeslots still return slots in the gaps
4. Verify fire badge shows on home page for chef with orders
5. Verify fire badge randomly appears on ~40% of other chefs (check multiple, should be consistent within the day)

---

## Open Questions

| # | Question | Tentative Answer | Status |
|---|---|---|---|
| 1 | Is `estimated_time` (menu prep time) the right field for order duration? | Yes — it's what chefs set per item. 1 order = 1 item, so no aggregation needed. | **Tentative — confirm with client** |
| 2 | Should the 2.5h in the original spec be replaced by `max(estimated_time)` of the chef's live menu (for NEW order session estimate)? | Yes — more accurate per chef. Fallback to 120 min if no menu data. | **Tentative** |
| 3 | Should Requested (status 1) orders block slots, or only Accepted (status 2)? | Both — a pending request still represents a tentative booking. Can pivot to accepted-only via `DEMAND_SIGNAL_STATUSES` env var. | **Tentative** |
| 4 | Badge copy: "Popular Today", "In Demand", or just 🔥? | TBD — design choice. Starting with fire emoji + "Popular Today". | **Needs design input** |
| 5 | Should the minimum lead time change from 3h to 2h affect existing checkout flow too? | Yes — the `getAvailableTimeslots` endpoint serves both chef detail and checkout. | **Confirmed by user spec** |
| 6 | Should unavailable chefs (not shown on home page) ever get the hot badge? | No — `getSearchChefs` already filters to available chefs. Badge only applies to visible results. | **Assumed** |

---

## Implementation Steps

Each step is self-contained: implement → test → verify visually → commit before moving on.

Prerequisites:
- Backend running on `:8005`
- Frontend running with local API (`npm run dev:local`)
- Maestro test users seeded: `cd backend && php artisan db:seed --class="Database\Seeders\MaestroTestUserSeeder"`
- iOS simulator available for Maestro MCP ad hoc flows
- Test user credentials from `frontend/.maestro/test-users.env.yaml`

---

### Step 1: Backend — Demand Signaling in `getSearchChefs` [DONE]

**Files modified:**
- `backend/app/Http/Controllers/MapiController.php` — added `computeDemandSignal()` static method + call in `getSearchChefs`

**What was implemented:**
- `computeDemandSignal(array $chefIds, string $dateString): array` — batch queries `tbl_orders` for chefs with active orders, applies deterministic fake demand via `abs(crc32(chefId . '-' . date)) % 100`
- Returns `[chefId => bool]` map
- Called in `getSearchChefs` just before cache put, adds `is_hot` to each chef object
- Uses class constants instead of env vars (see Configuration section)

#### Verification: Unit Tests [PASSED]

**File:** `backend/tests/Unit/Controllers/DemandSignalTest.php` — 8 tests, all passing

| Test | Result |
|---|---|
| `test_chef_with_active_order_is_hot` | PASS |
| `test_chef_with_accepted_order_is_hot` | PASS |
| `test_cancelled_order_does_not_count` | PASS |
| `test_deterministic_same_chef_same_date` | PASS |
| `test_deterministic_different_date_produces_variation` | PASS |
| `test_fake_demand_percentage_roughly_correct` | PASS |
| `test_real_demand_overrides_fake` | PASS |
| `test_different_date_order_does_not_count` | PASS |

```bash
cd backend && ./vendor/bin/phpunit --filter DemandSignalTest
```

---

### Step 2: Frontend — Hot Badge on Chef Card [DONE]

**Files modified:**
- `frontend/app/types/user.interface.ts` — added `is_hot?: boolean` to `UserInterface`
- `frontend/app/screens/customer/home/components/chefCard.tsx` — added orange pill badge with "Popular" text next to chef name
- `frontend/app/screens/customer/home/styles.ts` — added `hotBadge` and `hotBadgeText` styles
- Updated `arePropsEqual` memo comparator to include `is_hot`

**Design:** Orange pill (#FF6B35), white bold text, fire emoji prefix: "Popular"

#### Verification: Maestro Ad Hoc [PASSED]

Logged in as `maestro+customer1@test.com` on iOS simulator, scrolled to chef cards:
- "James C." showed "Popular" badge — correct (deterministic fake demand)
- "Active C." and "Sarah W." did not show badge — correct
- Card layout intact, no overlapping or broken elements
- Badge positioned inline next to chef name with proper spacing

---

### Step 3: Backend — Time Blockout in `getAvailableTimeslots` [DONE]

**Files modified:**
- `backend/app/Http/Controllers/MapiController.php` — added `filterSlotsByOrders()` and `timeToMinutes()` static methods, one-liner call in `getAvailableTimeslots`

**What was implemented:**
- `timeToMinutes(string $time): int` — converts "HH:MM" to minutes since midnight
- `filterSlotsByOrders(array $slots, int $chefId, string $dateOnly): array` — queries `tbl_orders` JOIN `tbl_menus` for active orders, builds order windows, filters slots using symmetric comesBefore/comesAfter logic with buffer
- Single line added to `getAvailableTimeslots`: `$allSlots = self::filterSlotsByOrders($allSlots, (int) $chefId, $dateOnly);`
- Uses class constants `BLOCKOUT_ORDER_STATUSES`, `ORDER_BUFFER_MINUTES`, `DEFAULT_ORDER_DURATION_MINUTES`

**Note:** The 3h → 2h lead time change was done in a previous commit.

**Local DB note:** Required running migration `2026_01_08_000001_add_order_datetime_fields` to add `order_date_new` and `order_time` columns to local `tbl_orders` table.

#### Verification: Unit Tests [PASSED]

**File:** `backend/tests/Unit/Controllers/TimeslotBlockoutTest.php` — 10 tests, all passing

| Test | Result |
|---|---|
| `test_no_orders_returns_all_slots` | PASS |
| `test_single_order_blocks_around_it` | PASS |
| `test_two_orders_blocks_gap_between_them` | PASS |
| `test_cancelled_order_does_not_block` | PASS |
| `test_requested_order_blocks` | PASS |
| `test_on_my_way_order_blocks` | PASS |
| `test_completed_order_does_not_block` | PASS |
| `test_no_live_menu_uses_default_duration` | PASS |
| `test_slot_between_two_orders_allowed_when_gap_is_large` | PASS |
| `test_time_to_minutes_helper` | PASS |

```bash
cd backend && ./vendor/bin/phpunit --filter TimeslotBlockoutTest
```

#### Verification: Maestro Ad Hoc

Deferred to Step 4 (chef detail availability section) — blockout logic is backend-only and verified by unit tests. Visual verification will happen when the frontend availability section is built.

---

### Step 4: Frontend — Availability Section on Chef Detail Screen

**Files to create:**
- `frontend/app/screens/customer/chefDetail/components/availabilitySection.tsx`

**Files to modify:**
- `frontend/app/screens/customer/chefDetail/index.tsx`
- `frontend/app/services/api.ts` (if `GetAvailableTimeslotsAPI` needs any adjustment)

**What to implement:**
- New `AvailabilitySection` component:
  - Date selector: horizontal row of date pills (today + next 6 days)
  - Default to `selectedDate` from nav params
  - Horizontal `ScrollView` of time slot pills
  - Loading spinner while fetching
  - "No times available for this date" empty state
- Insert above the menu section in chef detail layout
- Fetch timeslots via `GetAvailableTimeslotsAPI(chefInfo.id, selectedDate)` on mount + date change
- Tapping a time slot stores it in state (used in Step 5)

**Layout:**
```
[Chef photo + name + rating + bio]       ← existing, unchanged
[Date: Today | Fri | Sat | Sun | ...]    ← NEW: date pills
[10:00  10:30  11:00  14:00  16:30 ...]  ← NEW: time slot pills (scrollable)
── Menu ──                                ← existing, unchanged
[Allergen filters]                        ← existing, unchanged
[Menu items...]                           ← existing, unchanged
```

#### Verification: Unit Test

No new unit tests — this is a UI component that fetches from an already-tested endpoint. Covered by Maestro.

#### Verification: Maestro Ad Hoc

1. Log in as `maestro+customer1@test.com`
2. Tap on any chef from home screen
3. **Screenshot:** Chef detail screen — verify availability section is visible above menu
4. **Inspect hierarchy:** Confirm date pills are rendered (today + next days)
5. **Inspect hierarchy:** Confirm time slot pills are rendered (or "No times available" message)
6. Tap a different date pill
7. **Screenshot:** Verify time slots updated for new date
8. **Check:** Menu items are still visible and scrollable below the availability section
9. **Check:** "CHECKOUT" button still visible at bottom when items are in cart
10. Tap a date where chef is not available (e.g., a day not in their weekly schedule)
11. **Screenshot:** Verify "No times available" message shown

**Pass criteria:**
- Availability section renders above menu
- Date pills show today + next 6 days, correct day names
- Time slots match API response for selected date
- Changing date re-fetches and updates slots
- Menu remains fully browsable below
- Empty state shown for unavailable dates
- Loading spinner appears during fetch

**Fail criteria:**
- Availability section not visible
- Time slots don't update on date change
- Menu pushed too far down / not accessible
- Layout crash on dates with many or zero slots
- Selected date not defaulting to the date from home screen

---

### Step 5: Frontend — Checkout Pre-Selection from Chef Detail

**Files to modify:**
- `frontend/app/screens/customer/chefDetail/index.tsx` (pass selected time to checkout)
- `frontend/app/screens/customer/checkout/index.tsx` (accept + apply pre-selected time)
- `frontend/app/utils/navigation.ts` (add `selectedTime?` param)

**What to implement:**
- When user taps a time slot on chef detail → store in state (`selectedTime`)
- Visually highlight the selected time slot pill
- When user taps CHECKOUT → pass `selectedDate` + `selectedTime` to checkout screen
- Checkout screen: if `selectedTime` is provided, pre-select that date + time instead of defaulting
- If no time was selected on chef detail, checkout behaves as today (user picks date+time there)

#### Verification: Unit Test

No new unit tests — checkout time selection is an existing flow, we're just pre-populating it. Covered by Maestro.

#### Verification: Maestro Ad Hoc

1. Log in as `maestro+customer1@test.com`
2. Navigate to a chef → chef detail screen
3. Tap a date pill → tap a specific time slot (e.g., "14:00")
4. **Screenshot:** Verify time slot is visually highlighted/selected
5. Add a menu item to cart → tap CHECKOUT
6. **Screenshot:** Checkout screen loads
7. **Check:** Date is pre-selected to match chef detail selection
8. **Check:** Time is pre-selected to "14:00" (or whichever was tapped)
9. **Check:** User can still change the date/time on checkout if desired
10. Go back, add a menu item WITHOUT selecting a time → tap CHECKOUT
11. **Check:** Checkout defaults to normal behavior (no pre-selection, user picks)

**Pass criteria:**
- Selected time on chef detail carries forward to checkout
- Pre-selected date + time are correctly highlighted on checkout screen
- User can override the pre-selection
- No pre-selection when user didn't tap a time slot
- Order placement still works end-to-end with pre-selected time

**Fail criteria:**
- Time not carried to checkout
- Wrong time/date shown on checkout
- Checkout crashes when receiving pre-selected time
- Pre-selection cannot be changed
- Order placement breaks

---

### Step 6: Integration — Full Flow Regression

No new code in this step. This is end-to-end verification of all features working together.

#### Verification: Backend Regression Tests

Run the full relevant test suite to ensure no regressions:

```bash
cd backend && ./vendor/bin/phpunit --filter "DemandSignalTest|TimeslotBlockoutTest|AvailabilityOverrideTest|ChatSmsServiceTest|OrderSmsServiceTest|TwilioServiceTest|WeeklyOrderReminderServiceTest|OrdersTest"
```

**Pass criteria:** All tests pass, zero failures.

#### Verification: Maestro Ad Hoc — Full Customer Journey

**Flow A: Customer sees hot badge → browses chef → sees availability → places order**

1. Log in as `maestro+customer1@test.com`
2. Home screen: verify at least one chef has fire/hot badge
3. Tap a chef (preferably one with the badge)
4. Chef detail: verify availability section shows with time slots
5. Select a date + time slot
6. Add a menu item to cart
7. Tap CHECKOUT
8. Verify date + time are pre-selected on checkout screen
9. **Screenshot:** Checkout screen with pre-selected time
10. (Optional) Complete order placement if test payment is set up

**Flow B: Blockout visible — chef with existing order has fewer slots**

Precondition: seed or place an order for `maestro+chef1@test.com` (ID 101) at 12:00 today.

1. Log in as `maestro+customer1@test.com`
2. Navigate to chef 101's detail screen
3. Select today's date
4. **Screenshot:** Available time slots — verify 12:00 and surrounding slots are missing
5. Select a different date (tomorrow) where chef has no orders
6. **Screenshot:** Full set of time slots visible
7. Compare: today should have visibly fewer slots than tomorrow

**Flow C: Fire badge determinism check**

1. Log in as customer → home screen → note which chefs have badge
2. Log out → log back in (or kill + relaunch app)
3. Home screen → verify same chefs have badge (deterministic per day)

**Pass criteria (all flows):**
- Hot badge consistent across sessions on same day
- Availability section correctly shows/hides slots based on existing orders
- Pre-selection carries to checkout
- Full order flow still works
- No crashes or layout issues

**Fail criteria:**
- Badge changes between sessions on same day
- Blocked slots still showing (or wrong slots blocked)
- Pre-selection lost between screens
- Any crash or error during the flow

---

### Summary

| Step | Scope | Est. Time | Status |
|---|---|---|---|
| 1 | Backend: demand signaling | ~1h | **DONE** — 8 unit tests passing |
| 2 | Frontend: hot badge on chef card | ~30min | **DONE** — Maestro verified |
| 3 | Backend: time blockout logic | ~2h | **DONE** — 10 unit tests passing |
| 4 | Frontend: availability on chef detail | ~1.5h | **DONE** — AvailabilitySection component, Maestro verified |
| 5 | Frontend: checkout pre-selection | ~30min | **DONE** — Time pre-selection carries to checkout, Maestro verified |
| 6 | Integration: full flow regression | ~1h | **DONE** — 137/137 backend tests, Flows A/B/C verified |

**Total estimate: ~6.5h** | ALL STEPS COMPLETE

#### Step 6 Verification Results (Feb 20, 2026)

**Backend regression:** 137/137 tests pass (292 assertions)
- DemandSignalTest, TimeslotBlockoutTest, AvailabilityOverrideTest, ChatSmsServiceTest, OrderSmsServiceTest, TwilioServiceTest, WeeklyOrderReminderServiceTest, OrdersTest

**Flow A (Full customer journey):** PASS
- Login → Home (badges visible) → Chef detail → Availability section renders → Select Sat 21 + 10:00 am → Add item → Checkout → SAT 21 pre-selected, estimated completion "Feb 21, 2026 10:20 AM" confirms 10:00 AM pre-selection

**Flow B (Blockout verification):** PASS
- Inserted test order for chef 110 at 12:00 on Sat Feb 21
- API confirmed: Sat 21 returns 25 slots (missing 11:30, 12:00, 12:30), Sun 22 returns 24 slots (all present)
- UI confirmed: date switching works, time slots update correctly per date
- Test order cleaned up after verification

**Flow C (Badge determinism):** PASS
- `computeDemandSignal()` returns identical results across multiple calls for same date
- Feb 20: chefs 111, 112, 116 = hot; chefs 110, 115 = not hot (consistent across calls)
- Feb 21: different distribution (chefs 110, 111, 112, 115, 116 all hot) — confirms different daily seed
