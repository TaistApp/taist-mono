# Sprint 2 — Scoping Document

Generated: 2026-02-12
Source: 20260205_Dev Tracker_Sprint 2_v01.xlsx

---

## TMA-063 — Regular reminder notifications to order
**Type:** Task | **Priority:** High | **Status:** Not Started

### Summary
Send a push notification to all customers once per week on a random weekday around 2pm (in the customer's local timezone) nudging them to order. The day should be randomized per week so it doesn't feel robotic.

### Requirements
- Push notification only (Firebase/FCM), no SMS
- Target: all customers with a valid `fcm_token`
- Frequency: 1x per week, random weekday (Mon-Fri), configurable
- Time: ~2pm in the customer's timezone (derived from their `state` via `TimezoneHelper`)
- Content: single static message to start (configurable in code/env)
- Must track which customers were already notified this week to avoid duplicates

### Affected Files
| File | Change |
|------|--------|
| `backend/app/Console/Commands/SendOrderReminderNotifications.php` | **NEW** — Artisan command that queries customers, checks timezone, sends push |
| `backend/app/Notifications/OrderReminderNotification.php` | **NEW** — Notification class (Firebase + database channels) |
| `backend/app/Console/Kernel.php` | **EDIT** — Schedule the command to run frequently (every 15-30 min) so it can catch each timezone's 2pm window |
| `backend/database/migrations/xxxx_add_order_reminder_tracking.php` | **NEW** — Add `last_order_reminder_sent_at` and `next_order_reminder_day` to `tbl_users` (or a separate small table) |

### Implementation Approach
1. **Weekly day selection**: A scheduled job runs early Monday (or Sunday night) and assigns each customer a random weekday (1-5) for that week, stored in `next_order_reminder_day`.
2. **Notification dispatch**: A second scheduled job runs every 15 min. For each customer whose `next_order_reminder_day` is today and who hasn't been notified this week (`last_order_reminder_sent_at` < start of current week), check if it's within the 2pm window in their timezone (e.g., 1:45-2:15 PM). If so, fire the notification.
3. **Timezone**: Use existing `TimezoneHelper::getTimezoneForState($customer->state)` — already maps all US states.
4. **Notification content**: "Craving something fresh? Browse chefs cooking near you!" (or similar — stored as a constant, easy to swap).

### Complexity: Low-Medium
- Pattern already exists (see `SendOrderReminders` command + `FirebaseChannel`)
- Main nuance is the per-timezone 2pm targeting and weekly randomization
- Estimate: **3-4 hours**

### Dependencies
- None

### Open Questions
- Should we respect any notification preferences / opt-out? (Could add later as a settings toggle)
- Any specific copy for the notification message, or should I just pick something reasonable?

---

## TMA-026 — Email Campaign Automation
**Type:** Task | **Priority:** High | **Status:** Not Started

### Summary
Set up an email marketing platform so the Taist team (non-technical) can compose and send marketing emails to customers and chefs. This involves picking a tool, syncing the contact lists from the database, and giving the team a way to create/send campaigns.

### Requirements
- Non-technical owners need a UI to compose, design, and send marketing emails
- Contact lists (customers and chefs) must sync from the Taist database automatically
- Support for audience segmentation (at minimum: customers vs. chefs)
- Ability to schedule emails for future send
- Unsubscribe handling (legally required — CAN-SPAM)

### Recommended Approach: Resend
Resend is already partially configured in the codebase (`RESEND_API_KEY` in `.env.example`). It supports:
- **Audiences** — managed contact lists with metadata (name, role, location, etc.)
- **Broadcasts** — compose and send emails to audiences from the Resend dashboard (no code needed)
- **Templates** — reusable email designs
- Unsubscribe handling built-in
- Simple API for contact sync

**Why not Make.com?** Make.com is an automation/workflow tool — good for triggers, but doesn't give you a place to *compose* emails. You'd still need an email platform underneath it. Resend covers both sending and composing.

### Affected Files
| File | Change |
|------|--------|
| `backend/app/Console/Commands/SyncResendAudiences.php` | **NEW** — Artisan command to sync customers & chefs to Resend Audiences |
| `backend/app/Console/Kernel.php` | **EDIT** — Schedule audience sync (daily or on-demand) |
| `backend/config/services.php` | **EDIT** — Add Resend config |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — On new user registration, add contact to Resend audience |
| `backend/app/Http/Controllers/Admin/AdminController.php` | **EDIT** — (Optional) Add "Sync Contacts" button in admin panel |

### Implementation Approach
1. **Resend Audiences setup**: Create two audiences via Resend API — "Customers" and "Chefs"
2. **Initial sync command**: Artisan command queries all users from `tbl_users`, splits by `user_type`, and pushes to the corresponding Resend audience with metadata (first_name, last_name, email, city, state, zip)
3. **Ongoing sync**: On new user registration, add to the appropriate audience. Schedule a daily full sync to catch any changes.
4. **Team workflow**: Owners log into Resend dashboard (resend.com) to compose and send campaigns — no custom UI needed.
5. **Unsubscribe**: Resend handles this automatically with footer links.

### Complexity: Low
- Resend API is simple (REST calls to create contacts/audiences)
- Most of the work is the sync command + registration hook
- Estimate: **3-4 hours**

### Dependencies
- Resend account with Audiences feature enabled (may require paid plan)
- Verified sending domain (e.g., mail.taist.com or similar)

### Open Questions
- What email address should campaigns come from? (e.g., hello@taist.com, team@taist.com)
- Do the owners have Resend access yet, or do we need to set up the account?
- Any branding/template design needed, or will they use Resend's default editor?

---

## TMA-037 — Add time blockout logic for before, during, and after accepted orders
**Type:** Task | **Priority:** High | **Status:** Not Started

### Summary
When a chef has an accepted order at a given time, block out time slots before (travel/prep), during (cooking), and after (cleanup) that order so other customers can't book overlapping slots. Currently the timeslot system (`getAvailableTimeslots`) only checks the chef's weekly schedule and overrides — it does NOT account for existing orders.

### Requirements
- When generating available timeslots for a chef on a given date, exclude slots that conflict with already-accepted orders
- Buffer times needed: before (travel/prep), during (cooking), and after (cleanup)
- Buffer durations should be configurable (e.g., env vars or config values)
- Only active orders should block slots (status: Requested=1, Accepted=2, OnTheWay=7)

### Affected Files
| File | Change |
|------|--------|
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — `getAvailableTimeslots()` (~line 890): after generating slots from availability, filter out slots that overlap with existing orders + buffers |
| `backend/app/Listener.php` | **EDIT** — `isAvailableForOrder()` (~line 116): same blockout check so order placement is consistent with what the customer sees |
| `backend/config/taist.php` (or similar) | **NEW** — Config file for buffer durations (e.g., `order_buffer_before_minutes`, `order_buffer_after_minutes`, `order_duration_minutes`) |
| `backend/app/Models/Orders.php` | **EDIT** — (Optional) Add helper method `getBlockedTimeRange()` that returns the full blocked window for an order |

### Implementation Approach
1. **Define buffer config**: Default values like 60 min before (travel/prep), 120 min during (cooking duration — or derive from order data if available), 30 min after (cleanup). These are configurable.
2. **Query existing orders**: In `getAvailableTimeslots()`, fetch all active orders for this chef on the requested date. Each order has `order_time` (e.g., "17:00") and `order_date_new` (e.g., "2026-03-01").
3. **Calculate blocked windows**: For each order, compute: `[order_time - before_buffer, order_time + duration + after_buffer]`. Convert to a list of blocked 30-min slots.
4. **Filter slots**: Remove any generated timeslot that falls within a blocked window.
5. **Same logic in `isAvailableForOrder()`**: When a customer tries to place an order, run the same check to prevent race conditions.

### Complexity: Medium
- The timeslot generation logic is already well-structured and easy to extend
- Main challenge: determining order "duration" — currently orders only store `order_time` (arrival), not a duration or end time. Need to either add a duration field or use a fixed estimate.
- Estimate: **5-6 hours**

### Dependencies
- None, but related to TMA-041 (menu item type Standard vs. Meal Prep) which could affect duration assumptions

### Decision
- **Order duration**: Fixed duration for all orders (e.g., 2 hours) for now. **Future enhancement**: allow chefs to set estimated cook time per menu item (B) or enter duration when accepting (C) — would require additional scoping and hours.
- **Buffer sizes**: TBD — need input on reasonable defaults (e.g., 1hr before, 30min after?)

---

## TMA-054 — In-app bug/issue reporting
**Type:** Task | **Priority:** High | **Status:** Not Started

### Summary
Enhance the existing feedback/ticket system so users can report bugs directly from the app with useful context (screenshots, device info, app version) that helps the team reproduce and fix issues faster.

### What Already Exists
- **Chef side**: Feedback screen (`frontend/app/screens/chef/feedback/index.tsx`) — subject + message → `CreateTicketAPI`
- **Common**: Contact Us screen (`frontend/app/screens/common/contactUs/index.tsx`) — same flow
- **Backend**: `create_ticket` endpoint stores tickets in DB, viewable in admin panel

### Requirements
- Users (both customer and chef) can report a bug from anywhere in the app
- Report should auto-capture: device info (OS, version), app version, current screen/route
- User can optionally attach a screenshot or photo
- Reports should be visible in the admin panel with all context
- Accessible via a persistent "Report Issue" option (e.g., in drawer menu or settings)

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/common/reportIssue/index.tsx` | **NEW** — Bug report screen with auto-captured device info, screenshot attachment, description field |
| `frontend/app/screens/common/reportIssue/styles.ts` | **NEW** — Styles |
| `frontend/app/services/api.ts` | **EDIT** — Add `ReportIssueAPI` call (or extend `CreateTicketAPI` with additional fields) |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Extend `create_ticket` to accept device_info, app_version, screenshot attachment |
| `backend/database/migrations/xxxx_add_bug_report_fields_to_tickets.php` | **NEW** — Add columns: `device_info`, `app_version`, `screenshot_path`, `report_type` (feedback vs bug) |
| `backend/resources/views/admin/tickets.blade.php` | **EDIT** — Show device info, screenshot, and report type in admin panel |
| `frontend/app/screens/chef/_layout.tsx` | **EDIT** — Add "Report Issue" nav option |
| `frontend/app/screens/customer/(tabs)/account/` | **EDIT** — Add "Report Issue" link in customer account/settings |

### Implementation Approach
1. **New screen**: Build a "Report Issue" form with: issue type dropdown (bug, feedback, other), description (required), optional screenshot picker (reuse `styledPhotoPicker`), auto-captured device info (via `expo-device` and `expo-application`).
2. **Auto-capture**: On mount, collect device model, OS version, app version, current route name. Display as read-only info at bottom of form so user sees what's being sent.
3. **Backend**: Extend ticket creation to accept and store the additional fields. Upload screenshot to existing image upload path.
4. **Admin panel**: Add columns to the tickets view showing device info, app version, and a thumbnail link to the screenshot.
5. **Navigation**: Add "Report a Bug" option in both chef drawer menu and customer account screen.

### Complexity: Low-Medium
- Mostly extending an existing system (tickets) with more fields
- Screenshot upload follows the same pattern as profile photo upload
- Estimate: **4-5 hours**

### Dependencies
- None

### Open Questions
- Should "Report Issue" also be accessible via a floating button or shake gesture, or is a menu item sufficient?

---

## TMA-055 — SMS notifications for chats between customer and chef
**Type:** Task | **Priority:** High | **Status:** Not Started

### Summary
When a customer or chef sends a chat message, send an SMS to the other party so they don't miss it. Currently, `createConversation` just inserts a row in the DB with zero notifications — the recipient only sees it if they open the chat screen.

### Requirements
- When a new chat message is created, send an SMS to the recipient
- SMS should include: sender name, a preview of the message, and ideally a deep link to open the chat
- Respect rate limiting — don't spam if there's a rapid back-and-forth (e.g., throttle to 1 SMS per conversation per 5 minutes)
- Both customer→chef and chef→customer directions

### Affected Files
| File | Change |
|------|--------|
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — `createConversation()` (~line 1513): after inserting message, trigger SMS to recipient |
| `backend/app/Services/OrderSmsService.php` | **EDIT** — Add `sendChatNotification($fromUser, $toUser, $messagePreview)` method (or new ChatSmsService) |
| `backend/app/Models/Conversations.php` | **EDIT** — (Optional) Add `last_sms_sent_at` or use a simple cache/throttle to prevent spam |

### Implementation Approach
1. **In `createConversation()`**: After inserting the message, look up the recipient (`to_user_id`), get their phone number, and call the SMS service.
2. **SMS content**: "New message from {first_name}: '{message_preview}'" — truncate message to ~100 chars.
3. **Throttle**: Use a simple check — query the most recent SMS-notified conversation for this pair within the last 5 minutes. If one was sent recently, skip. Could also use Laravel's cache (`Cache::has("chat_sms_{from}_{to}")`) for simplicity.
4. **Deep link**: Include a link that opens the app to the chat screen (if deep linking is set up), or just the message preview.

### Complexity: Low
- Twilio SMS service already exists and is well-tested
- Just adding a hook into the existing `createConversation` method
- Throttling is the only nuance
- Estimate: **2-3 hours**

### Dependencies
- None (Twilio already integrated)

### Open Questions
- Should we also send a push notification (Firebase) in addition to SMS? Push is free, SMS costs money per message.
- Throttle window — 5 minutes reasonable, or should it be longer?

---

## TMA-036 — Link Privacy Policy and Terms pages
**Type:** Task | **Priority:** High | **Status:** Not Started

### Summary
The Privacy Policy and Terms of Service screens in the app try to open `privacy.html` and `terms.html` from the server, but the files don't exist (`backend/public/assets/uploads/html/` is empty). Both screens just show a loading spinner and fail silently.

### Requirements
- Privacy Policy and Terms of Service pages must load real content
- Content needs to be accessible from within the app
- Pages should be easily updatable by the team without a code deploy

### Affected Files
| File | Change |
|------|--------|
| `backend/public/assets/uploads/html/privacy.html` | **NEW** — Privacy Policy HTML page |
| `backend/public/assets/uploads/html/terms.html` | **NEW** — Terms of Service HTML page |

### Implementation Approach
1. **Get the legal copy**: The Taist team needs to provide (or have a lawyer draft) the actual Privacy Policy and Terms of Service text.
2. **Create HTML files**: Build simple, mobile-friendly HTML pages with the legal content, styled to match Taist branding. Place them in `backend/public/assets/uploads/html/`.
3. **Done**: The existing frontend code already handles opening these URLs in a web browser — no frontend changes needed.

### Complexity: Very Low
- The frontend code is already wired up correctly
- Just need to create two HTML files on the server
- Estimate: **1-2 hours** (dev work — assumes legal copy is provided)

### Dependencies
- **Blocker**: Taist team must provide the legal text for both pages. This is a content dependency, not a code dependency.

### Open Questions
- Does Taist have existing Privacy Policy / Terms of Service text, or does this need to be drafted?
- Should these also be linked on a public website (e.g., taist.com/privacy)?

---

# MEDIUM PRIORITY

---

## TMA-022 — Profile (bio and hours) not visible from Admin Panel pre-activation
**Type:** Bug | **Priority:** Medium | **Status:** Not Started

### Summary
When a chef is in "pending" status (pre-activation), admins cannot fully view their profile details (bio, hours) from the admin panel. The pendings view queries data differently than the active chefs view — the pendings page does a `leftJoin` with `tbl_availabilities` but may not display all fields, while the profiles view (`profiles.blade.php`) explicitly filters to only show active chefs (`is_pending => 0, verified => 1`).

### Affected Files
| File | Change |
|------|--------|
| `backend/resources/views/admin/pendings.blade.php` | **EDIT** — Ensure bio, availability hours, and profile photo are displayed for pending chefs |
| `backend/app/Http/Controllers/Admin/AdminController.php` | **EDIT** — Ensure the pendings query includes all necessary profile data |

### Complexity: Low
- Admin panel Blade template adjustments + query tweak
- Estimate: **1-2 hours**

### Dependencies
- None

---

## TMA-025 — Add Stripe Transaction notifications
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
Set up Stripe webhooks so the app receives real-time notifications when transactions occur (payments, refunds, payouts). Currently there are zero webhook handlers — the backend only has redirect endpoints for Stripe Connect return URLs.

### Requirements
- Receive Stripe webhook events for key transaction types (payment succeeded, refund processed, payout completed, etc.)
- Log/store transaction events
- Optionally notify admins or users of important events (e.g., payout to chef completed)

### Affected Files
| File | Change |
|------|--------|
| `backend/routes/web.php` | **EDIT** — Add webhook endpoint route |
| `backend/app/Http/Controllers/StripeWebhookController.php` | **NEW** — Handle incoming Stripe webhook events |
| `backend/app/Http/Middleware/VerifyCsrfToken.php` | **EDIT** — Exclude webhook route from CSRF |
| `backend/config/services.php` | **EDIT** — Add Stripe webhook secret |

### Implementation Approach
1. **Register webhook** in Stripe dashboard pointing to `https://taist-mono-production.up.railway.app/stripe/webhook`
2. **Create handler**: Verify webhook signature, parse event type, handle `payment_intent.succeeded`, `charge.refunded`, `payout.paid`, etc.
3. **Log events**: Store in a `stripe_events` table or just log for now.
4. **Notifications**: Push notification to chef when payout lands, admin notification on failed payments.

### Complexity: Medium
- Stripe PHP SDK is already bundled in the codebase
- Main work is event handling logic and deciding which events matter
- Estimate: **4-5 hours**

### Dependencies
- Stripe dashboard access to configure webhook endpoint

---

## TMA-027 — Switch Review character limit from 100 to 200
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
The review text input is hardcoded to 100 characters on the frontend. Change it to 200. Backend already accepts any length (stored as `text` column), so this is frontend-only.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/customer/orderDetail/index.tsx` | **EDIT** — Line ~434: change `text.slice(0, 100)` to `text.slice(0, 200)` and update the counter text `{reviewText.length}/200 Characters` |

### Complexity: Trivial
- Single file, two line changes
- Estimate: **< 0.5 hours**

### Dependencies
- None

---

## TMA-040 — Reminder to Chef to put bag/cooler on floor and wash hands
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
When a chef marks "On My Way" for an order, show an in-app reminder/modal telling them to put their bag/cooler on the floor and wash their hands upon arrival. This is a food safety compliance feature.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/chef/orderDetail/` | **EDIT** — When chef taps "On My Way" status button, show an Alert/modal with the safety reminder before proceeding |

### Complexity: Very Low
- Simple `Alert.alert()` or modal before the status update API call
- Estimate: **0.5-1 hour**

### Dependencies
- None

---

## TMA-041 — Create Menu Item flow: "Standard" vs "Meal Prep" choice
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
Add a step at the beginning of the menu item creation flow where chefs choose between "Standard" (dish for that evening) and "Meal Prep" (reheat over a week). This affects how the item is categorized and potentially its serving size / MOQ behavior.

### What Already Exists
The menu item creation is already an 8-step wizard (`frontend/app/screens/chef/addMenuItem/index.tsx`). No `type` or `meal_type` field exists on the `tbl_menus` table or the `IMenu` interface.

### Affected Files
| File | Change |
|------|--------|
| `backend/database/migrations/xxxx_add_menu_type_to_menus.php` | **NEW** — Add `menu_type` enum column ('standard', 'meal_prep') to `tbl_menus` |
| `backend/app/Models/Menus.php` | **EDIT** — Add to fillable |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Accept `menu_type` in create/update menu endpoints |
| `frontend/app/types/menu.interface.ts` | **EDIT** — Add `menu_type` field to `IMenu` |
| `frontend/app/screens/chef/addMenuItem/index.tsx` | **EDIT** — Add new Step 0 (type selection) before current Step 1, shift other steps |
| `frontend/app/screens/chef/addMenuItem/steps/StepMenuItemType.tsx` | **NEW** — Two-card selection screen: "Standard" vs "Meal Prep" with descriptions |
| `frontend/app/screens/chef/addMenuItem/steps/StepMenuItemPricing.tsx` | **EDIT** — Conditionally show MOQ field for meal prep items (ties into TMA-023) |

### Complexity: Low-Medium
- New step in existing wizard + migration + backend field
- Estimate: **3-4 hours**

### Dependencies
- Related to TMA-023 (MOQ replacement) and TMA-033 (menu item overhaul)

---

## TMA-042 — Chef messaging to avoid frozen ingredients (proteins)
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
Display a tip/warning to chefs during menu item creation reminding them to avoid using frozen ingredients (particularly proteins). This is a quality messaging feature.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/chef/addMenuItem/steps/StepMenuItemDescription.tsx` or `StepMenuItemName.tsx` | **EDIT** — Add an info banner/tip at the top of the relevant step |

### Complexity: Trivial
- Static UI text/banner in the menu item creation flow
- Estimate: **< 0.5 hours**

### Dependencies
- None

---

## TMA-043 — Reminder to Chef to turn off appliances and wipe down surfaces
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
When the chef marks an order as complete, show a reminder to turn off any appliances they used and wipe down surfaces. Similar to TMA-040 — a safety/quality compliance prompt.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/chef/orderDetail/` | **EDIT** — When chef taps "Order Complete" button, show an Alert/modal with the cleanup reminder before proceeding |

### Complexity: Very Low
- Same pattern as TMA-040, simple Alert before status update
- Estimate: **0.5-1 hour**

### Dependencies
- None. Can be combined with TMA-040 into a single PR since both are order-status safety reminders.

---

## TMA-048 — Android Chef Profile Not Erasing After Deleting
**Type:** Bug | **Priority:** Medium | **Status:** Not Started

### Summary
When a chef deletes their account on Android, the profile data persists in the app. The backend deletion works (DB record removed), but the frontend Redux state is not fully cleared. The `USER_LOGOUT` dispatch does not trigger `clearChef()`, and Redux Persist may cache stale state.

### Root Cause
In `DrawerModal/index.tsx` (~line 117), account deletion dispatches `{ type: 'USER_LOGOUT' }` but does NOT explicitly call `clearChef()`, `clearCustomer()`, or reset the table slice. The `clearChef()` action is only called during "cancel application" (downgrade to customer), not full deletion.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/components/DrawerModal/index.tsx` | **EDIT** — In `handleDeleteAccount`, explicitly dispatch `clearChef()`, `clearTable()`, `setUser({})` before `ClearStorage()` |
| `frontend/app/reducers/` (root reducer or store) | **EDIT** — Ensure `USER_LOGOUT` action triggers a full state reset across all slices |

### Complexity: Low
- Redux state management fix — add explicit clear dispatches
- Estimate: **1-2 hours**

### Dependencies
- None

---

## TMA-049 — Speed/performance (Home tab chef availability)
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
Improve performance when viewing available chefs between dates on the Home tab. The description calls out this specific area as slow. Likely involves N+1 queries on the backend or excessive re-renders on the frontend.

### Affected Files
| File | Change |
|------|--------|
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Optimize chef listing/availability queries (eager loading, reduce N+1, cache frequent lookups) |
| `frontend/app/screens/customer/(tabs)/(home)/index.tsx` | **EDIT** — Profile rendering, memoization, reduce unnecessary re-renders |

### Implementation Approach
1. **Profile the backend**: Add timing logs to the chef listing endpoint, identify slow queries (likely availability checks per chef per date)
2. **Batch availability checks**: Instead of checking each chef individually, query all availabilities and overrides in bulk
3. **Frontend**: Memoize chef cards, lazy load off-screen items, debounce date range changes

### Complexity: Medium
- Requires profiling before writing code — can't estimate precisely until bottleneck is identified
- Estimate: **4-6 hours** (includes investigation)

### Dependencies
- None

---

## TMA-050 — Live updating from Pending to Active Chef UI on Android
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
When an admin activates a chef (changes from pending to active), the chef's app should update in real-time without requiring a manual refresh or restart. Currently the chef likely has to close and reopen the app to see their new active status.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/chef/(tabs)/home/` | **EDIT** — Add polling or push notification listener that checks activation status periodically |
| `backend/app/Http/Controllers/Admin/AdminController.php` | **EDIT** — When activating a chef, send a push notification via Firebase |
| `backend/app/Notifications/ChefApprovedNotification.php` | **EDIT** — Ensure this triggers a data refresh on the frontend |

### Implementation Approach
- Simplest: When admin activates chef, fire `ChefApprovedNotification` (already exists). On the frontend, when this notification is received, re-fetch user profile data which will now show `is_pending: 0`.
- May need to add a periodic profile refresh (polling every 60s) as a fallback.

### Complexity: Low-Medium
- Push notification for activation already exists — just need to ensure frontend handles it by refreshing state
- Estimate: **2-3 hours**

### Dependencies
- None

---

## TMA-053 — Google + Apple signup capability
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
Add "Sign in with Google" and "Sign in with Apple" as options alongside the existing email/password auth. Apple Sign In is required by App Store policy when offering any third-party social login. No OAuth or social login infrastructure currently exists in the codebase.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/common/login/index.tsx` | **EDIT** — Add "Sign in with Google" and "Sign in with Apple" buttons |
| `frontend/app/screens/common/signup/index.tsx` | **EDIT** — Add social signup buttons on the email/password step (Step 2) |
| `frontend/app/services/api.ts` | **EDIT** — Add `SocialLoginAPI` / `SocialRegisterAPI` |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Add `socialLogin`/`socialRegister` endpoints that accept provider + OAuth token, verify with provider, create/find user |
| `backend/routes/mapi.php` | **EDIT** — Add routes for social auth |
| `frontend/package.json` | **EDIT** — Add `@react-native-google-signin/google-signin`, `expo-apple-authentication` |
| `frontend/app.json` | **EDIT** — Add Google OAuth client IDs, enable Apple Sign In entitlement |

### Implementation Approach
1. **Google**: Create OAuth 2.0 credentials in Google Cloud Console (iOS + Android client IDs). Use `@react-native-google-signin` to get ID token.
2. **Apple**: Use `expo-apple-authentication` (built into Expo). Configure Apple Sign In capability in Apple Developer portal.
3. **Backend**: Single `socialLogin` endpoint that accepts `{provider: 'google'|'apple', id_token: '...'}`. Verify token with the respective provider, then find/create user by email. Return Passport JWT token.
4. **Account linking**: If a user already has an email/password account with the same email, link the social login to that account.
5. **Post-signup flow**: After social auth, still need to collect phone, location, etc. — skip to that step.
6. **Apple privacy**: Apple can hide the user's real email (private relay). Handle this by storing the Apple-provided proxy email and still requiring phone number.

### Complexity: Medium-High
- Two auth providers touching frontend + backend + external service configuration
- Need to handle edge cases (existing account with same email, Apple private relay email, missing profile data after OAuth)
- Estimate: **8-12 hours** (Google ~5h + Apple ~4h + shared backend/edge cases ~3h)

### Dependencies
- Google Cloud Console access for OAuth credentials
- Apple Developer account access for Sign In with Apple capability

---

## TMA-030 — iOS Stripe step asking for Statement Descriptor
**Type:** Bug | **Priority:** Medium | **Status:** Not Started

### Summary
During chef Stripe Connect onboarding on iOS, Stripe's hosted onboarding page is asking chefs to fill in a "Statement Descriptor" field. This should already be pre-filled — the backend sets `statement_descriptor => 'TAIST'` when creating the Connect account (`MapiController.php` ~line 4349). The issue may be that Stripe still shows the field even when pre-filled, or the pre-fill isn't working on iOS.

### Affected Files
| File | Change |
|------|--------|
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Verify the `settings.payments.statement_descriptor` is being sent correctly in the account creation call (~line 4349). May need to also set `statement_descriptor_suffix`. |

### Implementation Approach
1. **Debug**: Check Stripe dashboard to see if the descriptor is actually being saved on account creation
2. **Fix**: May need to set both `statement_descriptor` AND `statement_descriptor_suffix`, or use the `business_profile.support_url` field
3. **Test on iOS**: Stripe's hosted onboarding behavior may differ between platforms — might need to use `collection_options` to skip the descriptor step entirely

### Complexity: Low
- Likely a small config tweak in the Stripe account creation params
- Estimate: **1-2 hours**

### Dependencies
- Stripe dashboard access for testing

---

## TMA-032 — Strategy for Stripe accounts linked to different email
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
Handle the case where a chef's Stripe Connect account uses a different email than their Taist account. This can cause confusion and potential payment issues. Need a strategy — not necessarily code-heavy.

### Implementation Approach
- **Option A**: Detect mismatch after Stripe onboarding and show a warning to the chef / notify admin
- **Option B**: Pre-fill Stripe onboarding with the Taist email (already done — `MapiController.php` ~line 4349 uses `$user->email`) and trust Stripe's flow
- **Option C**: After Stripe account creation, fetch the account email and store it; if different from Taist email, flag in admin panel

### Complexity: Low
- Mostly a policy decision + minor backend check
- Estimate: **1-2 hours** (for detection/warning approach)

### Dependencies
- None

---

## TMA-033 — General overhaul of menu item (split form into multiple pages)
**Type:** Task | **Priority:** Medium | **Status:** Not Started

### Summary
The menu item creation form is already an 8-step wizard. The "overhaul" likely refers to UX improvements and adding a minimum order quantity field. The note says "Add minimum order qty field for chefs."

### What Already Exists
The form is already split into 8 steps: Name → Description → Categories → Allergens → Kitchen/Appliances → Pricing → Customizations → Review. It's well-structured.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/chef/addMenuItem/steps/StepMenuItemPricing.tsx` | **EDIT** — Add MOQ (minimum order quantity) field |
| `backend/database/migrations/xxxx_add_min_order_qty_to_menus.php` | **NEW** — Add `min_order_qty` column to `tbl_menus` |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Accept `min_order_qty` in menu create/update |
| `frontend/app/types/menu.interface.ts` | **EDIT** — Add `min_order_qty` to `IMenu` |
| `frontend/app/screens/customer/(tabs)/(home)/chefDetail/` | **EDIT** — Enforce MOQ when adding items to cart |

### Complexity: Low-Medium
- Adding a field to an existing step + backend + enforcement on customer side
- Estimate: **3-4 hours**

### Dependencies
- Related to TMA-041 (Standard vs Meal Prep) and TMA-023 (MOQ replacing serving size)

---

## TMA-061 — Unable to order from chef for tomorrow
**Type:** Bug | **Priority:** Medium | **Status:** Not Started

### Summary
Customers can't order from a chef for "tomorrow" without the chef manually toggling their availability live. The current system requires an override for today, and tomorrow falls back to the weekly schedule — but the UX doesn't make this clear. The suggested "middle ground" is to open the app to the first day where chefs are confirmed available.

### Root Cause
In `getAvailableTimeslots()` and `isAvailableForOrder()`, "today" requires an explicit override (chef must toggle on). Tomorrow and beyond use the weekly schedule. But if a chef hasn't confirmed tomorrow via an override, the weekly schedule may show availability that the chef hasn't explicitly confirmed.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/customer/(tabs)/(home)/index.tsx` | **EDIT** — Default the date selector to the first upcoming date with confirmed chef availability rather than "today" |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — (Optional) Add endpoint or param to `getAvailableTimeslots` that returns the next date with availability |

### Complexity: Medium
- Needs careful thought about what "confirmed available" means (override vs. weekly schedule)
- Estimate: **3-4 hours**

### Dependencies
- Related to TMA-037 (time blockout logic) since both affect availability display

### Open Questions
- Should "tomorrow" use the weekly schedule without requiring an override? Or should chefs need to confirm each day?

---

## TMA-037b — Not able to disable PNs and Location Services upon signup
**Type:** Bug | **Priority:** Medium | **Status:** Not Started

*Note: This ticket shares the TMA-037 ID in the spreadsheet but is a separate bug.*

### Summary
During signup, users are unable to decline push notifications and location services permissions. The app may be forcing these permissions or not properly handling the "deny" case.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/common/signup/` | **EDIT** — Ensure permission requests gracefully handle denial and allow signup to continue |
| `frontend/app/firebase/index.ts` | **EDIT** — Ensure FCM token registration handles permission denial gracefully |

### Complexity: Low
- Permission handling adjustments in signup flow
- Estimate: **1-2 hours**

### Dependencies
- None

---

# LOW PRIORITY

---

## TMA-023 — Remove Serving Size and replace with MOQ
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Replace the current "Serving Size" slider (1-10 people) with a Minimum Order Quantity (MOQ) concept. Every item serves 1 person to start, except meal prep items which may have higher MOQ. Currently, serving size is a slider on the pricing step and displayed as "(X Person/People)" to customers.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/chef/addMenuItem/steps/StepMenuItemPricing.tsx` | **EDIT** — Replace serving size slider with MOQ number input |
| `frontend/app/screens/customer/addToOrder/index.tsx` | **EDIT** — Update display from "X Person" to MOQ enforcement |
| `frontend/app/screens/customer/chefDetail/components/chefMenuItem.tsx` | **EDIT** — Update display text |
| `backend/database/migrations/xxxx_rename_serving_size_to_min_order_qty.php` | **NEW** — Rename/repurpose column (or add new one) |
| `frontend/app/types/menu.interface.ts` | **EDIT** — Update field name |

### Complexity: Low-Medium
- Mostly renaming/repurposing an existing field + UI label changes
- Estimate: **2-3 hours**

### Dependencies
- TMA-034 (Category overhaul) — listed as a dependency in the tracker
- TMA-041 (Standard vs Meal Prep) — MOQ behavior may differ by menu type

---

## TMA-024 — Automatic app updates for users
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Ensure users are prompted to update the app when a new version is available. This is about implementing an update check, not literally auto-updating (app stores handle the actual update).

### Implementation Approach
- **Option A (Recommended)**: Use `expo-updates` for OTA (over-the-air) updates for JS bundle changes — no app store review needed for non-native changes
- **Option B**: Use a version check endpoint — backend stores the latest required version, app checks on launch and shows a "Please update" modal if behind
- Both approaches are common and can coexist

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/common/splash/` or root `_layout.tsx` | **EDIT** — Add version check on app launch |
| `backend/config/version.php` | **EDIT** — Store minimum required app version |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Add `check_version` endpoint |

### Complexity: Low
- `expo-updates` may already be partially configured
- Estimate: **2-3 hours**

### Dependencies
- None

---

## TMA-028 — Assure all time values in Admin Panel are set to EST (or EDT)
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Time values displayed in the admin panel (order dates, created timestamps, etc.) should consistently show in Eastern Time. Currently timestamps are displayed as raw Unix timestamps or server-local time without explicit timezone conversion.

### Affected Files
| File | Change |
|------|--------|
| `backend/resources/views/admin/orders.blade.php` | **EDIT** — Format timestamps with EST/EDT conversion |
| `backend/resources/views/admin/chefs.blade.php` | **EDIT** — Same |
| `backend/resources/views/admin/customers.blade.php` | **EDIT** — Same |
| `backend/resources/views/admin/pendings.blade.php` | **EDIT** — Same |
| Other admin Blade templates | **EDIT** — Audit and fix any time displays |

### Implementation Approach
Create a Blade helper or PHP function that takes a timestamp and formats it in `America/New_York` timezone. Apply it across all admin views.

### Complexity: Low
- TimezoneHelper already exists — just need to use it in Blade templates
- Estimate: **1-2 hours**

### Dependencies
- None

---

## TMA-038 — Replace onboarding graphics with masks for ones without masks
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Update onboarding/tutorial images to remove any graphics showing people wearing masks. Replace with non-mask versions.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/common/signup/onBoarding/` | **EDIT** — Replace image assets |
| Frontend image assets directory | **EDIT** — Swap graphic files |

### Complexity: Very Low
- Asset swap — no code logic changes
- Estimate: **0.5-1 hour** (assumes new graphics are provided)

### Dependencies
- **Blocker**: New graphics must be provided by the design team

---

## TMA-039 — Chef button to notify customer of arrival
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Add a button for the chef to tap when they arrive at the customer's location, sending a push notification: "Your chef has arrived."

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/chef/orderDetail/` | **EDIT** — Add "I've Arrived" button (visible when status is "On The Way") |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Add endpoint or extend `update_order_status` to handle "arrived" status |
| `backend/app/Notifications/ChefArrivedNotification.php` | **NEW** — Push notification to customer |

### Complexity: Low
- Follows existing notification pattern (like ChefOnTheWayNotification)
- Estimate: **2-3 hours**

### Dependencies
- None

---

## TMA-044 — Reminder to Chef that order should almost be complete
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Send a push notification to the chef 10 minutes before the estimated order completion time, reminding them to wrap up. Based on arrival time + estimated cooking duration.

### Affected Files
| File | Change |
|------|--------|
| `backend/app/Console/Commands/SendOrderCompletionReminders.php` | **NEW** — Artisan command that checks active orders and sends 10-min warnings |
| `backend/app/Notifications/OrderAlmostCompleteNotification.php` | **NEW** — Push notification |
| `backend/app/Console/Kernel.php` | **EDIT** — Schedule the command every 5 minutes |

### Complexity: Low-Medium
- Requires tracking when the chef arrived (or using order_time + fixed duration)
- Same challenge as TMA-037 — need a duration concept
- Estimate: **2-3 hours**

### Dependencies
- TMA-037 (time blockout logic) — shares the order duration concept

---

## TMA-045 — Alternate time selection field layouts for Android
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
The current time selection uses custom horizontal scroll buttons. On Android this may feel non-native. Provide an alternative layout or use Android's native time picker patterns.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/customer/checkout/index.tsx` | **EDIT** — Platform-specific time slot rendering for Android |
| `frontend/app/screens/customer/checkout/components/` | **EDIT** — Alternative Android-friendly time picker component |

### Complexity: Low
- Platform-specific UI variant using `Platform.OS` checks
- Estimate: **2-3 hours**

### Dependencies
- None

---

## TMA-046 — Option for chef to request a New Allergen
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Let chefs request a new allergen to be added if it's not in the predefined list. Similar to the existing "Request a new Category" feature (which already exists in StepMenuItemCategories.tsx with a toggle + text input).

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/chef/addMenuItem/steps/StepMenuItemAllergens.tsx` | **EDIT** — Add "Request a new Allergen?" toggle + text input (same pattern as categories) |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Accept `is_new_allergen` / `new_allergen_name` in menu create/update |
| `backend/resources/views/admin/` | **EDIT** — Show allergen requests for admin review |

### Complexity: Very Low
- Copy the exact pattern from StepMenuItemCategories (lines 98-114)
- Estimate: **1-2 hours**

### Dependencies
- None

---

## TMA-047 — "Free parking available?" checkbox on Customer side for Chef
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Add a "Free parking available?" checkbox during the customer ordering flow so chefs know if parking is available at the customer's location.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/customer/checkout/index.tsx` | **EDIT** — Add checkbox for "Free parking available?" |
| `backend/database/migrations/xxxx_add_free_parking_to_orders.php` | **NEW** — Add `free_parking` boolean to `tbl_orders` |
| `backend/app/Models/Orders.php` | **EDIT** — Add to fillable |
| `frontend/app/screens/chef/orderDetail/` | **EDIT** — Display parking info |

### Complexity: Very Low
- Single checkbox + boolean field
- Estimate: **1-2 hours**

### Dependencies
- None

---

## TMA-051 — Birthday date field inaccurate for Customers page on STAGING admin panel
**Type:** Bug | **Priority:** Low | **Status:** Not Started

### Summary
Birthday dates are displaying incorrectly on the Customers page in the staging admin panel. Likely a timezone offset issue or date formatting bug when displaying stored birthday values.

### Affected Files
| File | Change |
|------|--------|
| `backend/resources/views/admin/customers.blade.php` | **EDIT** — Fix birthday date formatting |

### Complexity: Very Low
- Date formatting fix in Blade template
- Estimate: **0.5-1 hour**

### Dependencies
- None

---

## TMA-052 — Link Tip/Review page and other pages in Twilio notification
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Add deep links to SMS notifications so users can tap to go directly to the Tip/Review page or other relevant screens. Currently SMS messages just say "View in app." with no clickable link.

### Affected Files
| File | Change |
|------|--------|
| `backend/app/Services/OrderSmsService.php` | **EDIT** — Add deep link URLs to SMS message templates |
| `frontend/app.json` | **EDIT** — Ensure deep link scheme (`taistexpo://`) is configured for relevant routes |
| `frontend/app/` (root layout or linking config) | **EDIT** — Handle incoming deep links to route to correct screens |

### Implementation Approach
- Use the existing `taistexpo://` scheme to build links like `taistexpo://order/{orderId}/review`
- Add link handling in the frontend router to navigate to the correct screen
- Include the link in SMS: "Tap to leave a review: taistexpo://order/123/review"

### Complexity: Medium
- Deep link infrastructure may need to be set up or extended
- Estimate: **3-4 hours**

### Dependencies
- None

---

## TMA-031 — Add qty adjustment buttons to Customizations when ordering
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
When a customer is adding an item to their order, allow them to adjust quantities on individual customizations (add-ons) — e.g., "Extra cheese x2". Currently customizations are likely just on/off toggles.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/customer/addToOrder/index.tsx` | **EDIT** — Add +/- quantity buttons next to each customization |
| `frontend/app/types/menu.customization.interface.ts` | **EDIT** — Add quantity tracking |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Accept customization quantities in order creation |

### Complexity: Low-Medium
- UI change + data model adjustment for customization quantities
- Estimate: **2-3 hours**

### Dependencies
- None

---

## TMA-034 — Category overhaul (allow items to go live with an "Other" category)
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Allow menu items to go live even if they only have an "Other" category selected. Currently there may be validation that requires a "real" category. The "Request a new Category" feature already exists in the form but doesn't let items go live pending category approval.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/chef/addMenuItem/steps/StepMenuItemCategories.tsx` | **EDIT** — Add "Other" as a selectable default category, allow items to go live with it |
| `backend/database/seeds/` or admin panel | **EDIT** — Ensure "Other" category exists in the database |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Remove any validation blocking items with "Other" category |

### Complexity: Low
- Mostly a validation/seed data change
- Estimate: **1-2 hours**

### Dependencies
- None (but TMA-023 depends on this)

---

## TMA-035 — Demand-gated background checks
**Type:** Task | **Priority:** Low | **Status:** Not Started

### Summary
Only allow chefs to proceed with background checks (and full onboarding) if they're in an area with customer demand. Currently uses zip code filtering for customer signups — extend this to gate chef signups too. The tradeoff: can't build up chef profiles in areas before launching.

### Affected Files
| File | Change |
|------|--------|
| `frontend/app/screens/chef/backgroundCheck/index.tsx` | **EDIT** — Check chef's zip code against allowed zip codes before allowing background check submission |
| `backend/app/Http/Controllers/MapiController.php` | **EDIT** — Add zip code validation to background check endpoint |
| `backend/app/Models/Zipcodes.php` | Already exists — reuse the zip code filtering logic |

### Implementation Approach
- Before chef submits background check, validate their zip code against the `tbl_zipcodes` whitelist (same list used for customer signups)
- If zip code not in list, show message: "We're not yet available in your area. We'll notify you when we expand."
- Store the chef's interest for future outreach

### Complexity: Low
- Zip code filtering logic already exists — just apply it to a new flow
- Estimate: **2-3 hours**

### Dependencies
- None

### Open Questions
- How does this interact with the desire to pre-build chef profiles in new markets?

---

