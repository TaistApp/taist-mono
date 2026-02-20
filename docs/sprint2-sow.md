# Taist — Sprint 2 Statement of Work

**Prepared:** February 13, 2026
**Prepared for:** Dayne Arnett & Daryl Arnett, Taist
**Prepared by:** Billy Groble

---

## Scope of Work

This Statement of Work covers the development of 6 high-priority items for Sprint 2 of the Taist mobile platform (iOS and Android). All items include development, integration, and developer testing.

---

## Deliverables

| # | Ticket | Deliverable | Hours |
|---|--------|-------------|-------|
| 1 | TMA-063 | Weekly Order Reminder Notifications | 3 |
| 2 | TMA-061 | Chef Availability on Current Day | 4 |
| 3 | TMA-037 | Order Time Blockout Logic | 6 |
| 4 | TMA-054 | In-App Bug & Issue Reporting | 4 |
| 5 | TMA-055 | SMS Notifications for Chat Messages | 2 |
| 6 | TMA-036 | Privacy Policy & Terms of Service Pages | 1 |
| | | **Total** | **20** |

---

## Deliverable Details

### 1. TMA-063 — Weekly Order Reminder Notifications
**Estimate: 3 hours**

Sends a weekly push notification to all customers encouraging them to browse and order. The notification arrives around 2pm in each customer's local timezone, on a randomized weekday so it doesn't feel repetitive.

- Push notification only (no SMS costs)
- Targets all customers with notifications enabled
- Frequency: once per week, random weekday (Mon–Fri), configurable
- Time: approximately 2pm in the customer's timezone
- Message content is easily configurable without a code change

**Open Questions:**
- Should there be a user opt-out toggle for these reminders?
- Preferred notification copy, or should we draft something?

---

### 2. TMA-061 — Chef Availability on Current Day
**Estimate: 4 hours**

Fixes an issue where chefs don't appear as available when a customer opens the app on the current day. The app will default the date selector to the first upcoming date where chefs have confirmed availability, rather than always defaulting to today.

- Customers will see available chefs immediately upon opening the app
- Date selector defaults to the nearest date with confirmed chef availability
- Removes friction from the ordering flow

**Open Questions:**
- Should "tomorrow" use the chef's weekly schedule without requiring an explicit confirmation?

---

### 3. TMA-037 — Order Time Blockout Logic
**Estimate: 6 hours**

When a chef has an accepted order, blocks out time slots before (travel/prep), during (cooking), and after (cleanup) so other customers can't double-book. Currently, the booking calendar does not account for existing orders.

- Configurable buffer times for before, during, and after each order
- Only active orders (Requested, Accepted, On The Way) block time slots
- Blocked slots are hidden from the customer-facing booking view

For now, all orders will use a fixed duration (e.g., 2 hours). **Future enhancement:** allow chefs to set estimated cook time per menu item or enter a duration when accepting — this would require additional hours to scope and build.

**Open Questions:**
- Preferred default buffer sizes (e.g., 1 hour before, 30 minutes after)?

---

### 4. TMA-054 — In-App Bug & Issue Reporting
**Estimate: 4 hours**

Lets users (both customers and chefs) report bugs directly from the app, with useful context automatically attached — device info, app version, current screen, and optional screenshot. Reports are visible in the admin panel.

- Accessible from the app menu for both customer and chef users
- Auto-captures: device model, OS version, app version, and current screen
- Optional screenshot attachment
- Reports viewable in admin panel with all context
- Builds on the existing feedback/ticket system

**Open Questions:**
- Should this be accessible via a floating button or shake gesture, or is a menu item sufficient?

---

### 5. TMA-055 — SMS Notifications for Chat Messages
**Estimate: 2 hours**

When a customer or chef sends a chat message, the recipient gets an SMS so they don't miss it. Includes throttling to prevent spam during rapid back-and-forth conversations.

- Works both directions: customer to chef and chef to customer
- Includes sender name and a message preview
- Throttled to one SMS per conversation per 5 minutes to control costs
- Uses the existing Twilio SMS integration

**Open Questions:**
- Should we also send a push notification (free) in addition to SMS (per-message cost)?
- Is a 5-minute throttle window appropriate?

---

### 6. TMA-036 — Privacy Policy & Terms of Service Pages
**Estimate: 1 hour**

Creates the Privacy Policy and Terms of Service pages that the app links to. Currently, these screens show a loading spinner because the content files don't exist on the server.

- The app is already wired to display these pages — only the content files need to be created
- Pages are mobile-friendly HTML, styled to match Taist branding
- Easily updatable without a code deploy

**Dependency:** Taist team must provide the legal text for both pages (or have counsel draft them).

**Open Questions:**
- Does Taist have existing Privacy Policy / Terms of Service text?
- Should these also be published on a public website (e.g., taist.com/privacy)?

---

## Pricing

| Hours | Rate | Total |
|-------|------|-------|
| 20 hrs | $100/hr | **$2,000** |

The total cost is a minimum of **$2,000**. If any items require additional development time beyond the quoted estimates, the total may be up to **$2,200**.

### Payment
Payment is due via Zelle upon **approval** of the builds by the Apple App Store and Google Play Store. If Apple or Google rejects the build for reasons unrelated to the development work produced by Billy Groble (e.g., Apple flags pre-existing parts of the app not built by Billy Groble, retroactive policy enforcement, account or metadata issues), payment is still due at that time.

In the event that additional work is required to resolve rejection issues outside the scope of this SOW, Billy Groble will be compensated at **$150/hr** for that additional work, or a new contract must be signed before work begins.

### Scope Flexibility
If priorities shift during development, work can be redirected. Any items not delivered within the committed hours will be deferred — you only pay for hours worked.

---

## Timeline

- Development begins: **Monday, February 17, 2026**
- Estimated completion: **Monday, March 9, 2026**
- App Store submissions (Apple App Store + Google Play) will be coordinated upon completion of development and testing

---

## Assumptions

- Estimates cover development and basic testing. They do not include design work, copywriting, legal document drafting, or QA beyond developer testing.
- Items requiring third-party assets (legal text) are blocked until those assets are provided.
- Hour estimates account for standard development complexity. The 10% cost protection cap covers edge cases, debugging, and cross-platform testing.

---

## Dependencies

| Item | Depends On |
|------|-----------|
| TMA-061 (Chef availability) | TMA-037 (Time blockout) — related logic |
| TMA-036 (Privacy/Terms) | Legal text from Taist team |

---

## Agreement

By signing below, both parties agree to the scope, pricing, timeline, and terms outlined in this Statement of Work.

<br><br>

**Developer:**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Billy Groble

Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

<br><br>

**Client:**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Dayne Arnett / Daryl Arnett, Taist

Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
