# Sprint 2 SOW - Implementation Status

Last updated: February 20, 2026
Source of scope: `docs/sprint2-sow.md`

## SOW2 Scope (Complete List)

| # | Ticket | Deliverable | SOW Estimate | Status |
|---|---|---|---:|---|
| 1 | TMA-063 | Weekly Order Reminder Notifications | 3h | Implemented, verification complete (staging data validation pending) |
| 2 | TMA-061 | Chef Availability on Current Day | 4h | Implemented, verification complete (staging behavior validation pending) |
| 3 | TMA-037 | Order Time Blockout Logic | 6h | Completed, verified on simulator |
| 4 | TMA-054 | In-App Bug & Issue Reporting | 4h | Implemented in code, pending trusted Maestro + manual smoke verification |
| 5 | TMA-055 | SMS Notifications for Chat Messages | 2h | Implemented, backend verification complete (staging SMS delivery pending) |
| 6 | TMA-036 | Privacy Policy & Terms of Service Pages | 1h | Completed |

## Implemented Fix: TMA-036 (Privacy + Terms)

### Problem
The app already had Privacy and Terms screens, but they opened URLs pointing to:

- `.../assets/uploads/html/privacy.html`
- `.../assets/uploads/html/terms.html`

Those files were missing from the backend public assets path, so users saw a spinner/failure flow when opening legal pages.

### What We Implemented

1. Located legal copy in:
   - `extracted-legal/privacy.html`
   - `extracted-legal/terms.html`
2. Added/copy-deployed legal HTML into app-served backend path:
   - `backend/public/assets/uploads/html/privacy.html`
   - `backend/public/assets/uploads/html/terms.html`
3. Committed and pushed:
   - Commit: `07efd86`

### Result
Legal links now resolve as long as the deployed backend contains these files.

## Implemented Fix: TMA-055 (Chat SMS Notifications)

### Decision Summary

- SMS type: alert-only (no chat preview text)
- Link target: inbox-first
- Throttle window: 5 minutes per conversation
- Reply policy: explicitly tells users replies are app-only

### Problem
`create_conversation` saved chat messages but did not notify recipients by SMS.

### What We Implemented

1. Added chat SMS service with throttle + message formatting:
   - `backend/app/Services/ChatSmsService.php`
2. Triggered chat SMS on message creation:
   - `backend/app/Http/Controllers/MapiController.php`
3. Added link endpoint used inside SMS to open app inbox:
   - `backend/routes/web.php` (`GET /open/inbox` -> `taistexpo://screens/common/inbox`)
4. Added environment flags:
   - `backend/.env.example`
   - `CHAT_SMS_ENABLED=true`
   - `CHAT_SMS_THROTTLE_MINUTES=5`
5. Added new unit tests:
   - `backend/tests/Unit/Services/ChatSmsServiceTest.php`

### SMS Copy Implemented

`Taist: New message from {sender}. Open inbox: {APP_URL}/open/inbox. Reply in the app only - this SMS inbox is not monitored.`

## Verification Status (Tests + Maestro)

### 1) Backend Unit Tests

Executed in `backend/`:

```bash
./vendor/bin/phpunit --filter "ChatSmsServiceTest|TwilioServiceTest|OrderSmsServiceTest"
```

Result (February 18, 2026):

- `OK (50 tests, 113 assertions)`

Coverage verified:

- `ChatSmsServiceTest` passes all cases:
  - sends alert SMS
  - applies throttle
  - honors disabled flag
- Existing SMS service tests still pass.

### 2) Manual API Smoke Test (Staging)

Preconditions:

- Twilio env vars configured (`TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`)
- Chat SMS enabled:
  - `CHAT_SMS_ENABLED=true`
  - `CHAT_SMS_THROTTLE_MINUTES=5`

Test cases:

1. Customer sends message to chef -> chef gets one SMS.
2. Additional messages in same conversation within 5 min -> no additional SMS.
3. After 5+ min, send another message -> one new SMS.
4. SMS text includes one-way instruction (cannot reply by SMS).
5. SMS link opens app inbox.

### 3) Maestro MCP Verification (Ad Hoc, No Flow Files)

Reference users and env setup:

- `docs/maestro-test-users.md`
- `frontend/.maestro/test-users.env.yaml`

Executed checks (February 18, 2026):

- Safari + `openLink` to `/assets/uploads/html/privacy.html` -> `Privacy Policy` visible.
- Safari + `openLink` to `/assets/uploads/html/terms.html` -> `Terms and Conditions` visible.
- Safari + `openLink` to `/open/inbox` -> `Open in “Taist”?` prompt visible (proves redirect to app deep link target).

Remaining Maestro gap for TMA-055:

- No dedicated chat send/receive + throttle E2E flows exist yet in `frontend/.maestro/`.

## Implemented Fix: TMA-063 (Weekly Order Reminder Push Notifications)

### Requirements Applied

- Push notifications only (no SMS)
- Randomized weekdays: Mon-Thu
- Max frequency: 2 reminders per user per week
- Time window: 10:00-16:00 user local timezone
- Static rotating message set, including:
  - `Feeling behind? Order Taist and get ahead on other stuff tonight. See chefs now.`

### What We Implemented

1. Added weekly reminder service with deterministic weekly random slot assignment:
   - `backend/app/Services/WeeklyOrderReminderService.php`
2. Added new scheduler command:
   - `backend/app/Console/Commands/SendWeeklyOrderReminders.php`
3. Scheduled command every 15 minutes in Laravel scheduler:
   - `backend/app/Console/Kernel.php`
4. Added persistent send log table/model for weekly cap and dedupe:
   - `backend/database/migrations/2026_02_18_000003_create_weekly_order_reminder_logs_table.php`
   - `backend/app/Models/WeeklyOrderReminderLog.php`
5. Added env configuration:
   - `backend/.env.example`
   - `WEEKLY_ORDER_REMINDERS_ENABLED`
   - `WEEKLY_ORDER_REMINDERS_MAX_PER_WEEK`
   - `WEEKLY_ORDER_REMINDERS_START_HOUR`
   - `WEEKLY_ORDER_REMINDERS_END_HOUR`
   - `WEEKLY_ORDER_REMINDERS_WEEKDAYS`
   - `WEEKLY_ORDER_REMINDER_TITLE`
   - `WEEKLY_ORDER_REMINDERS_MESSAGES` (JSON array)

### Scheduling Behavior

- Railway should keep running `php artisan schedule:run` on its cron cadence.
- Laravel runs `reminders:send-weekly-order` every 15 minutes.
- For each customer (verified + FCM token), service computes local time from state timezone and only sends when:
  - local weekday is Mon-Thu
  - local time is between 10:00 and 15:59
  - current quarter-hour matches one of 2 deterministic random slots for that user/week
  - user is below 2 sends for the week

### Message Rotation

- Messages are static and non-time-dependent.
- Message index rotates by user using historical send count modulo message list size.

### Verification Completed

1. Syntax checks:
   - `php -l` passed for all new/edited TMA-063 PHP files.
2. Unit tests:
   - `backend/tests/Unit/Services/WeeklyOrderReminderServiceTest.php` passes.
3. Regression subset (SMS + reminder services):
   - `phpunit --filter "WeeklyOrderReminderServiceTest|ChatSmsServiceTest|TwilioServiceTest|OrderSmsServiceTest"`
   - Result: `OK (52 tests, 119 assertions)`
4. Command registration:
   - `php artisan list` includes `reminders:send-weekly-order`.
5. Dry-run command execution:
   - `php artisan reminders:send-weekly-order --dry-run` executed successfully.
   - Current local DB result: scanned `0` users (no eligible local data in this environment).

## Implemented Fix: TMA-061 (Chef Availability on Current Day)

### Requirements Applied

- Same-day availability now defaults to weekly schedule (no manual check-in required)
- Chef can still manually override availability for today/tomorrow
- Manual "Not Available" still blocks same-day ordering for that date
- 24-hour chef reminder copy now states tomorrow schedule and update action only
- Chef header "Live" reflects live-today availability by any rule

### What We Implemented

1. Updated order-time availability validation:
   - `backend/app/Listener.php`
   - Removed "today without override = unavailable"
   - No-override now falls back to weekly schedule for today and future
2. Updated same-day timeslot generation:
   - `backend/app/Http/Controllers/MapiController.php` (`getAvailableTimeslots`)
   - Removed forced empty result for today without override
3. Updated customer chef search filtering:
   - `backend/app/Http/Controllers/MapiController.php` (`getSearchChefs`)
   - Removed today/no-override exclusion in post-filter
4. Updated 24-hour reminder wording:
   - `backend/app/Services/ChefConfirmationReminderService.php`
   - Removed "must check in to receive same-day orders" language
5. Updated chef app toggle UX copy and status behavior:
   - `frontend/app/components/GoLiveToggle/index.tsx`
   - "Live" now derives from today override OR current weekly schedule window (unless today is explicitly cancelled)
   - Modal subtitle now clarifies weekly schedule remains default
6. Updated availability feature documentation:
   - `docs/features/chef-availability-system.md`

### Verification Completed

1. PHP syntax checks:
   - `php -l backend/app/Listener.php`
   - `php -l backend/app/Http/Controllers/MapiController.php`
   - `php -l backend/app/Services/ChefConfirmationReminderService.php`
   - Result: no syntax errors
2. Backend regression subset:
   - `cd backend && ./vendor/bin/phpunit --filter "AvailabilityOverrideTest|ChatSmsServiceTest|OrderSmsServiceTest|TwilioServiceTest|WeeklyOrderReminderServiceTest"`
   - Result: `OK (84 tests, 176 assertions)`
3. Frontend lint:
   - `cd frontend && npm run lint`
   - Result: fails due large pre-existing repository lint debt (`724 problems`, many unrelated to this change)

## TMA-054 Verification Plan (In-App Bug & Issue Reporting)

Purpose: verify the new top-right report-issue icon flow, issue report form submission, and admin visibility without relying on assumptions.

### Maestro Confirmation Checklist (Ad Hoc via MCP)

Run these checks on one dedicated simulator only (do not share device session across Codex windows):

1. Launch app and log in as customer.
2. Confirm header report-issue icon is visible on a standard screen using `Container` header.
3. Tap report-issue icon -> confirm `Report Issue` screen opens.
4. Confirm form fields render:
   - Subject
   - Message
   - Optional screenshot picker
5. Submit a report with subject + message only.
6. Confirm success toast/message and return/back behavior.
7. Repeat as chef user to confirm icon/flow parity.
8. Optional: include screenshot and confirm submit succeeds.

Evidence to capture:

- Maestro command log snippets for each step
- One screenshot of report-issue icon visible
- One screenshot of report screen
- One screenshot after successful submit

### Ad Hoc Smoke Test (Manual + Backend/Admin Cross-Check)

Preconditions:

- Backend running locally (`:8005`) with mobile API reachable
- Test user can authenticate
- Admin panel accessible

Smoke steps:

1. In app, open report-issue icon flow.
2. Submit unique subject/message token (example: `TMA054-SMOKE-20260218-01`).
3. If testing screenshot path, attach one screenshot and submit.
4. In admin panel contacts/tickets list, verify a new ticket entry exists for the same unique token.
5. Open entry details and verify:
   - Subject preserved
   - Message preserved
   - Context block appended (origin_screen/current_screen/platform/app/device metadata)
   - If screenshot used, screenshot URL appears in message context
   - Admin Contacts page renders context fields in a readable key/value block (not just raw text)
6. Regression check existing contact/ticket views still render correctly.

Pass criteria:

- App submission succeeds (no crash/no silent failure)
- Ticket appears in admin with matching unique token
- Context metadata present and readable
- Existing ticket functionality remains intact

Fail criteria:

- Icon missing where expected
- Submit fails or hangs
- Ticket not persisted/visible in admin
- Metadata or screenshot reference missing when provided

### Maestro Ad Hoc Smoke Test (Required Confirmation Checklist)

Goal: confirm TMA-061 behavior in-app with test users, without relying only on unit tests.

Environment prerequisites:

- Backend running on `:8005` with latest TMA-061 code
- Frontend running with local API config
- Maestro test users seeded:
  - `cd backend && php artisan db:seed --class="Database\\Seeders\\MaestroTestUserSeeder"`
- Test user credentials from:
  - `docs/maestro-test-users.md`
  - `frontend/.maestro/test-users.env.yaml`

What must be confirmed:

1. Same-day chef visibility defaults from weekly schedule:
   - Chef with no today override and in scheduled window appears bookable to customer.
2. Manual same-day OFF override blocks ordering:
   - Chef sets today to not available; customer no longer sees bookable slots for today.
3. Manual same-day ON/custom override still works:
   - Chef sets explicit today available/custom hours; customer sees slots matching override.
4. Chef "Live" header reflects any valid rule:
   - Live when in weekly window without override.
   - Not live when today is explicitly cancelled.
5. Tomorrow reminder copy no longer requires check-in:
   - Message references tomorrow schedule/update availability only.
   - No "must go live/check in" wording.

Ad hoc Maestro execution flow:

1. Start isolated simulator instance (do not reuse busy shared device):
   - pick a unique UDID from `maestro list-devices`
   - launch Taist on that device only
2. Customer baseline check:
   - log in as customer test user
   - open today in discover/search
   - capture screenshot + hierarchy showing target chef and/or available slots
3. Chef override OFF check:
   - log out customer, log in as chef test user
   - go to availability/go-live for today and set not available
   - capture screenshot proving today override is off/cancelled
4. Customer re-check after OFF:
   - log back in as customer
   - verify same chef is unavailable for today (no same-day slots / not bookable)
   - capture screenshot + hierarchy
5. Chef override ON/custom check:
   - log in as chef again
   - set today available (or custom time window)
   - capture screenshot of saved override
6. Customer re-check after ON:
   - log in as customer
   - verify same-day slots return and align with override window
   - capture screenshot + hierarchy
7. Reminder copy validation:
   - trigger or inspect reminder content path used for 24h message
   - confirm wording matches new copy (scheduled tomorrow + update availability)

Evidence to attach in handoff:

- Device UDID used
- Timestamps for each check
- Screenshots for steps 2-7
- Pass/fail per required confirmation item above
- Any mismatch with exact screen/API payload details

## Implemented Fix: TMA-037 (Order Time Blockout + Demand Signaling + Chef Detail Availability)

Full implementation plan: `docs/tma-037-implementation-plan.md`

### What We Implemented

Three sub-features shipped together:

1. **Demand Signaling ("Popular" Badge)**
   - Backend: CRC32 hash-based deterministic ~40% badge assignment per day
   - Frontend: Orange badge overlay on chef profile pic + thin orange card border
   - `backend/app/Http/Controllers/MapiController.php` (`getSearchChefs`)
   - `frontend/app/screens/customer/home/components/chefCard.tsx`

2. **Arrival Time Blockout Logic**
   - Backend endpoint `getAvailableTimeslots` filters out past times with 3-hour minimum buffer
   - Checks overrides vs weekly schedule, filters cancelled days
   - `backend/app/Http/Controllers/MapiController.php`

3. **Chef Detail Availability Section**
   - New pill-based date/time picker on chef detail page (30-day range)
   - Auto-scrolls to availability section on page load
   - Pre-selects date/time and passes to checkout
   - `frontend/app/screens/customer/chefDetail/components/availabilitySection.tsx`
   - `frontend/app/screens/customer/chefDetail/index.tsx`

4. **Checkout UI Overhaul (Pill-Based)**
   - Replaced `CustomCalendar` week-view + `StyledTabButton` time selection with horizontal pill-based design matching chef detail
   - 30-day scrollable date pills with working-day filtering
   - Rounded time pills with loading/empty states
   - Deleted `checkout/components/customCalendar.tsx`
   - `frontend/app/screens/customer/checkout/index.tsx`
   - `frontend/app/screens/customer/checkout/styles.ts`

5. **Home Screen Calendar Polish**
   - Replaced hardcoded hex colors with `AppColors.*` theme constants
   - Changed selected-day styling from white+border to orange-fill+white-text (matches pill design)
   - `frontend/app/screens/customer/home/components/customCalendar.tsx`

### Verification Completed

1. Simulator verification (Maestro MCP):
   - Chef cards show "Popular" badge on ~40% of chefs
   - Chef detail auto-scrolls to availability, date pills load timeslots
   - Checkout pill UI: date selection loads timeslots, time selection updates estimated time
   - Home calendar: orange-fill selected state renders correctly
2. Backend: existing unit tests pass (availability override + SMS suites)
3. No logic changes to order submission flow — checkout state management preserved

### Commits

- `d16347f` — TMA-037: Order time blockout, demand signaling, chef detail availability (25 files)
- `0ce693e` — Checkout pill UI replacement + customCalendar deletion
- `52e44ad` — Home calendar theme constants + orange-fill selected state

## SOW2 Tasks Ranked by Ease of Implementation

Easiest to hardest:

1. `TMA-036` Privacy Policy & Terms of Service Pages
2. `TMA-055` SMS Notifications for Chat Messages
3. `TMA-063` Weekly Order Reminder Notifications
4. `TMA-061` Chef Availability on Current Day
5. `TMA-054` In-App Bug & Issue Reporting
6. `TMA-037` Order Time Blockout Logic

## Bugfix: Order Creation Timezone Bug (February 21, 2026)

### Problem

Evening US orders (e.g. Sunday 7 PM EST) failed with "This chef is not available at the requested time" even when the chef had availability for that day and time.

**Root cause:** The frontend sent `order_date` as a Unix timestamp. The backend (Railway, UTC) called `date('l', $timestamp)` to get the day-of-week, which resolved Sunday 7 PM EST (UTC-5) to Monday 00:00 UTC — checking Monday's schedule instead of Sunday's.

### What We Fixed

1. **Frontend** (`frontend/app/screens/customer/checkout/index.tsx`):
   - Now sends `order_date_string` (YYYY-MM-DD) and `order_time_string` (HH:mm) alongside the Unix timestamp
   - These are derived from the already-selected `DAY` and `time` values, no timezone conversion needed

2. **Backend** (`backend/app/Listener.php`):
   - `isAvailableForOrder()` now accepts date+time strings and uses them directly for availability checks
   - Falls back to legacy timestamp parsing if strings not provided

3. **Backend** (`backend/app/Http/Controllers/MapiController.php`):
   - `createOrder` reads the new string fields and uses them for availability validation
   - Populates `order_date_new` and `order_time` columns on the order record (these existed but were never populated)

4. **Backend** (`backend/app/Services/OrderSmsService.php`):
   - Added missing `formatUserName()` method that was causing a 500 error on all order creation

### Verification

- Confirmed bug on staging: Sunday 7 PM order → "chef not available" (before fix)
- Confirmed fix on staging: Sunday 7 PM order → `success: 1` with correct `order_date_new=2026-02-22`, `order_time=19:00` (after fix)
- All existing unit tests pass (32 availability tests, 57 assertions)

### Commits

- `db3cb13` — Fix timezone bug in order creation availability check
- `dcaabb2` — Fix missing formatUserName method in OrderSmsService

## TMA-064 Google Play Account Deletion URL Compliance (February 18, 2026)

Issue:

- Google Play Data Safety review reported `https://taist.app/contact/` returned HTTP 404 for account deletion support URL.

Implementation:

- Added public policy page view: `backend/resources/views/account-deletion.blade.php`
- Added web route: `GET /account-deletion` -> `account-deletion` view in `backend/routes/web.php`
- Added backward-compatible route: `GET /contact` -> redirect to `/account-deletion` in `backend/routes/web.php`
- Existing `backend/public/.htaccess` trailing slash normalization keeps `/contact/` resolving to `/contact`

Verification (local route registration):

- `cd backend/public && php ../artisan route:list | rg "contact|account-deletion"`
- Confirmed route entries:
  - `GET|HEAD account-deletion` -> `Illuminate\\Routing\\ViewController`
  - `GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS contact` -> `Illuminate\\Routing\\RedirectController`
- `cd backend && php -l routes/web.php` -> no syntax errors

Repeatable local URL test command:

- Script: `backend/scripts/verify-account-deletion-url.sh`
- Run:
  - `backend/scripts/verify-account-deletion-url.sh`
- Script asserts:
  - `/account-deletion` responds `200`
  - `/contact` responds `302` to deletion page
  - `/contact/` responds `302` to deletion page
  - account deletion page body contains `Taist Account Deletion`

Deployment/Play Console follow-up:

- Deploy backend changes to production
- Verify `https://taist.app/contact/` and `https://taist.app/account-deletion` return non-404 in production
- Re-submit Data Safety account deletion URL in Google Play Console
