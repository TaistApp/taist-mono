# Taist — Sprint 2 Development Estimate

**Prepared:** February 12, 2026
**Prepared by:** Billy Groble

---

## Summary

This document outlines the development scope, requirements, and hour estimates for Sprint 2 of the Taist mobile platform. Items are grouped by priority and include estimates for design, development, and testing.

### Hour Totals

| Priority | Items | Estimated Hours |
|----------|-------|----------------|
| High     | 6     | 19 hrs         |
| Medium   | 16    | 39 hrs         |
| Low      | 14    | 23 hrs         |
| **Total**| **36**| **81 hrs**     |

### All Items at a Glance

| # | Ticket | Item | Hours |
|---|--------|------|-------|
| | | **HIGH PRIORITY** | |
| 1 | TMA-063 | Weekly Order Reminder Notifications | 3 |
| 2 | TMA-026 | Email Campaign Automation | 3 |
| 3 | TMA-037 | Order Time Blockout Logic | 6 |
| 4 | TMA-054 | In-App Bug & Issue Reporting | 4 |
| 5 | TMA-055 | SMS Notifications for Chat Messages | 2 |
| 6 | TMA-036 | Privacy Policy & Terms of Service Pages | 1 |
| | | **High Subtotal** | **19** |
| | | **MEDIUM PRIORITY** | |
| 7 | TMA-022 | Chef Profile Visibility in Admin (Pre-Activation) | 1 |
| 8 | TMA-025 | Stripe Transaction Notifications | 5 |
| 9 | TMA-027 | Increase Review Character Limit (100 → 200) | 0.5 |
| 10 | TMA-040 | Chef Safety Reminder on Departure | 0.5 |
| 11 | TMA-041 | Standard vs. Meal Prep Menu Item Type | 3 |
| 12 | TMA-042 | Chef Messaging: Avoid Frozen Ingredients | 0.5 |
| 13 | TMA-043 | Chef Cleanup Reminder on Order Completion | 0.5 |
| 14 | TMA-048 | Android: Profile Not Clearing After Deletion | 1 |
| 15 | TMA-049 | Performance: Chef Availability Loading Speed | 5 |
| 16 | TMA-050 | Real-Time Chef Activation Status Update | 2 |
| 17 | TMA-053 | Google & Apple Sign-In | 10 |
| 18 | TMA-030 | Stripe Statement Descriptor Issue (iOS) | 1 |
| 19 | TMA-032 | Stripe Email Mismatch Strategy | 1 |
| 20 | TMA-033 | Menu Item Enhancements (MOQ Field) | 3 |
| 21 | TMA-061 | Unable to Order from Chef for Tomorrow | 4 |
| 22 | TMA-037b | Cannot Decline Permissions During Signup | 1 |
| | | **Medium Subtotal** | **39** |
| | | **LOW PRIORITY** | |
| 23 | TMA-023 | Replace Serving Size with MOQ | 2 |
| 24 | TMA-024 | Automatic App Update Prompts | 2 |
| 25 | TMA-028 | Admin Panel Timezone Consistency (Eastern) | 1 |
| 26 | TMA-038 | Update Onboarding Graphics | 0.5 |
| 27 | TMA-039 | Chef "I've Arrived" Notification Button | 2 |
| 28 | TMA-044 | Order Completion Time Reminder for Chef | 3 |
| 29 | TMA-045 | Android Time Selection Layout | 2 |
| 30 | TMA-046 | Chef: Request a New Allergen | 1 |
| 31 | TMA-047 | "Free Parking Available?" Checkbox | 1 |
| 32 | TMA-051 | Birthday Date Display Fix in Admin | 0.5 |
| 33 | TMA-052 | Deep Links in SMS Notifications | 3 |
| 34 | TMA-031 | Customization Quantity Buttons | 2 |
| 35 | TMA-034 | Category Overhaul ("Other" Category) | 1 |
| 36 | TMA-035 | Demand-Gated Background Checks | 2 |
| | | **Low Subtotal** | **23** |
| | | **TOTAL** | **81** |

> **Note:** Estimates assume designs/assets/copy are provided where noted. Items marked with open questions may require additional scoping once decisions are made.

---

## Pricing & Terms

| | Rate | Applies When |
|---|---|---|
| **Standard Rate** | $110/hr | Under 80 hours |
| **Volume Rate** | $100/hr | 80+ hours committed |

**Minimum engagement:** 40 hours. If the total engagement falls below 40 hours, the rate is $200/hr.

### Estimated Total

| Hours | Rate | Total |
|-------|------|-------|
| 81 hrs | $100/hr | **$8,100** |

### Cost Protection
All hour estimates listed in this document are minimums. If actual development exceeds the quoted hours for any item, the maximum cost increase is capped at **10% above the quoted estimate** for that item.

### Scope Flexibility
If priorities shift during development (e.g., new items are requested in place of existing ones), work can be redirected. Any items not delivered within the committed hours will be deferred — you only pay for hours worked.

### Timeline
- **First 40 hours:** ~3 weeks of development
- **Each additional 20 hours:** ~1 additional week
- At 81 hours total, estimated timeline is approximately **5 weeks**
- App Store submissions (Apple App Store + Google Play) occur after sufficient development and testing is complete

---

# HIGH PRIORITY

---

## TMA-063 — Weekly Order Reminder Notifications
**Estimate: 3 hours**

### What It Does
Sends a weekly push notification to all customers nudging them to browse and order. The notification arrives around 2pm in each customer's local timezone, on a randomized weekday so it doesn't feel repetitive.

### Details
- Push notification only (no SMS costs)
- Targets all customers with notifications enabled
- Frequency: once per week, random weekday (Mon–Fri), configurable
- Time: approximately 2pm in the customer's timezone
- Message content is easily configurable without a code change

### Open Questions
- Should there be a user opt-out toggle for these reminders?
- Preferred notification copy, or should we draft something?

---

## TMA-026 — Email Campaign Automation
**Estimate: 3 hours**

### What It Does
Sets up an email marketing platform so the Taist team can compose, design, and send marketing emails to customers and chefs — no technical skills required.

### Recommended Approach: Brevo (formerly Sendinblue)
After evaluating Resend, Mailchimp, SendGrid, Brevo, and others, **Brevo** is the best fit:
- **Drag-and-drop email builder** — 40+ templates, non-technical users can design professional marketing emails with images, buttons, and layouts
- **$9–18/month** — unlimited contacts, pay only for email volume (vs. Mailchimp at $75–90/mo for 5k contacts)
- **Audience segmentation** — create segments like "All Customers" or "All Chefs" from the dashboard
- **Unsubscribe handling** — legally required, built-in
- **Room to grow** — also offers SMS marketing, WhatsApp campaigns, and a built-in CRM

Customer and chef contact lists will sync automatically from the Taist database. New signups are added in real-time. The team logs into Brevo's dashboard to create and send campaigns.

> **Why not Resend?** Resend is excellent for transactional emails (order confirmations, password resets) but its email editor is text-only — no drag-and-drop design. Non-technical users would struggle to create visually appealing marketing campaigns. We recommend keeping Resend for transactional emails and using Brevo for marketing.

### Dependencies
- Brevo account (free plan supports up to 100k contacts)
- Verified sending domain (e.g., mail.taist.com)

### Open Questions
- What email address should campaigns send from? (e.g., hello@taist.com)
- Any specific branding or template design needed?

---

## TMA-037 — Order Time Blockout Logic
**Estimate: 6 hours**

### What It Does
When a chef has an accepted order, blocks out time slots before (travel/prep), during (cooking), and after (cleanup) so other customers can't double-book. Currently, the booking calendar does not account for existing orders.

### Details
- Configurable buffer times for before, during, and after each order
- Only active orders (Requested, Accepted, On The Way) block time slots
- Blocked slots are hidden from the customer-facing booking view

### Decision
For now, all orders will use a fixed duration (e.g., 2 hours). **Future enhancement:** allow chefs to set estimated cook time per menu item or enter a duration when accepting — this would require additional hours to scope and build.

### Open Questions
- Preferred default buffer sizes (e.g., 1 hour before, 30 minutes after)?

---

## TMA-054 — In-App Bug & Issue Reporting
**Estimate: 4 hours**

### What It Does
Lets users (both customers and chefs) report bugs directly from the app, with useful context automatically attached — device info, app version, current screen, and optional screenshot. Reports are visible in the admin panel.

### Details
- Accessible from the app menu for both customer and chef users
- Auto-captures: device model, OS version, app version, and current screen
- Optional screenshot attachment
- Reports viewable in admin panel with all context
- Builds on the existing feedback/ticket system

### Open Questions
- Should this be accessible via a floating button or shake gesture, or is a menu item sufficient?

---

## TMA-055 — SMS Notifications for Chat Messages
**Estimate: 2 hours**

### What It Does
When a customer or chef sends a chat message, the recipient gets an SMS so they don't miss it. Includes throttling to prevent spam during rapid back-and-forth conversations.

### Details
- Works both directions: customer → chef and chef → customer
- Includes sender name and a message preview
- Throttled to one SMS per conversation per 5 minutes to control costs
- Uses the existing Twilio SMS integration

### Open Questions
- Should we also send a push notification (free) in addition to SMS (per-message cost)?
- Is a 5-minute throttle window appropriate?

---

## TMA-036 — Privacy Policy & Terms of Service Pages
**Estimate: 1 hour**

### What It Does
Creates the Privacy Policy and Terms of Service pages that the app tries to display. Currently, these screens show a loading spinner because the actual content files don't exist on the server.

### Details
- The app is already wired to display these pages — only the content files need to be created
- Pages are mobile-friendly HTML, styled to match Taist branding
- Easily updatable without a code deploy

### Dependencies
- **Blocker:** Taist team must provide the legal text for both pages (or have counsel draft them)

### Open Questions
- Does Taist have existing Privacy Policy / Terms of Service text?
- Should these also be published on a public website (e.g., taist.com/privacy)?

---

# MEDIUM PRIORITY

---

## TMA-022 — Chef Profile Visibility in Admin Panel (Pre-Activation)
**Estimate: 1 hour**

### What It Does
Fixes an issue where admins can't fully view a chef's profile (bio, availability hours) while the chef is still in "pending" status. Currently, the pending chefs view doesn't display all profile fields.

---

## TMA-025 — Stripe Transaction Notifications
**Estimate: 5 hours**

### What It Does
Sets up real-time Stripe webhook notifications so the system is informed when payments, refunds, and payouts occur. Enables features like notifying chefs when a payout lands in their bank account and alerting admins to failed payments.

### Details
- Webhook handler for key Stripe events (payment succeeded, refund processed, payout completed, etc.)
- Transaction event logging
- Push notifications to chefs on payout, admin alerts on failures

### Dependencies
- Stripe dashboard access to configure webhook endpoint

---

## TMA-027 — Increase Review Character Limit
**Estimate: 0.5 hours**

### What It Does
Increases the review text limit from 100 characters to 200 characters so customers can write more detailed reviews.

---

## TMA-040 — Chef Safety Reminder on Departure
**Estimate: 0.5 hours**

### What It Does
When a chef marks "On My Way" for an order, displays a reminder to put their bag/cooler on the floor and wash hands upon arrival. A food safety compliance prompt.

---

## TMA-041 — Standard vs. Meal Prep Menu Item Type
**Estimate: 3 hours**

### What It Does
Adds a new step at the beginning of the menu item creation flow where chefs choose between "Standard" (dish for that evening) and "Meal Prep" (reheat over a week). This categorization affects item behavior and minimum order quantities.

### Dependencies
- Related to TMA-023 (MOQ) and TMA-033 (menu item enhancements)

---

## TMA-042 — Chef Messaging: Avoid Frozen Ingredients
**Estimate: 0.5 hours**

### What It Does
Displays a tip during menu item creation reminding chefs to avoid using frozen ingredients (particularly proteins). A quality assurance messaging feature.

---

## TMA-043 — Chef Cleanup Reminder on Order Completion
**Estimate: 0.5 hours**

### What It Does
When a chef marks an order as complete, displays a reminder to turn off appliances and wipe down surfaces. A food safety and courtesy compliance prompt. Same pattern as TMA-040 — can be built together.

---

## TMA-048 — Android: Chef Profile Not Clearing After Account Deletion
**Estimate: 1 hour**

### What It Does
Fixes a bug where a deleted chef's profile data persists in the Android app after account deletion. The account is deleted on the server, but cached data in the app is not properly cleared.

---

## TMA-049 — Performance: Chef Availability Loading Speed
**Estimate: 5 hours**

### What It Does
Improves loading speed when browsing available chefs by date on the Home tab. Includes investigating the bottleneck (backend queries, frontend rendering, or both) and optimizing accordingly.

### Details
- Includes profiling and investigation time
- Likely involves optimizing database queries and frontend rendering

---

## TMA-050 — Real-Time Chef Activation Status Update
**Estimate: 2 hours**

### What It Does
When an admin activates a pending chef, the chef's app updates in real-time without requiring a restart. Currently, chefs must close and reopen the app to see their new active status.

---

## TMA-053 — Google & Apple Sign-In
**Estimate: 10 hours**

### What It Does
Adds "Sign in with Google" and "Sign in with Apple" as login options alongside the existing email/password method. Apple Sign In is required by App Store policy when offering any third-party social login.

### Details
- Both Google and Apple authentication on login and signup screens
- Automatic account linking if a user already has an email/password account with the same email
- Handles Apple's private relay email (hidden email) gracefully
- Post-social-auth signup still collects required fields (phone, location, etc.)

### Dependencies
- Google Cloud Console access for OAuth credentials
- Apple Developer account access for Sign In with Apple capability

---

## TMA-030 — Stripe Statement Descriptor Issue on iOS
**Estimate: 1 hour**

### What It Does
Fixes an issue where Stripe's hosted onboarding asks chefs to manually fill in a "Statement Descriptor" field on iOS, even though it should be pre-filled with "TAIST." May require a configuration adjustment to skip this step entirely.

### Dependencies
- Stripe dashboard access for testing

---

## TMA-032 — Stripe Email Mismatch Strategy
**Estimate: 1 hour**

### What It Does
Handles the case where a chef's Stripe Connect account uses a different email than their Taist account. Implements detection and a warning notification to prevent confusion and payment issues.

---

## TMA-033 — Menu Item Enhancements (Minimum Order Quantity)
**Estimate: 3 hours**

### What It Does
Adds a minimum order quantity (MOQ) field to the menu item creation form, enforced during customer ordering. Part of the broader menu item improvement initiative.

### Dependencies
- Related to TMA-041 (Standard vs. Meal Prep) and TMA-023 (MOQ replacing serving size)

---

## TMA-061 — Unable to Order from Chef for Tomorrow
**Estimate: 4 hours**

### What It Does
Fixes an issue where customers can't easily order from a chef for the next day. The app will default the date selector to the first upcoming date where chefs have confirmed availability, rather than always defaulting to today.

### Dependencies
- Related to TMA-037 (time blockout logic)

### Open Questions
- Should "tomorrow" use the chef's weekly schedule without requiring an explicit confirmation?

---

## TMA-037b — Cannot Decline Permissions During Signup
**Estimate: 1 hour**

### What It Does
Fixes a bug where users cannot decline push notification and location services permissions during signup. The app should gracefully handle permission denials and allow signup to continue regardless.

---

# LOW PRIORITY

---

## TMA-023 — Replace Serving Size with Minimum Order Quantity
**Estimate: 2 hours**

### What It Does
Replaces the current "Serving Size" slider with a Minimum Order Quantity (MOQ) concept. Every item serves 1 person by default, except meal prep items which may require a higher minimum.

### Dependencies
- TMA-034 (Category overhaul) and TMA-041 (Standard vs. Meal Prep)

---

## TMA-024 — Automatic App Update Prompts
**Estimate: 2 hours**

### What It Does
Ensures users are prompted to update when a new version of the app is available. Supports both over-the-air updates (for non-native changes, no app store review required) and store-based update prompts for major releases.

---

## TMA-028 — Admin Panel Timezone Consistency (Eastern Time)
**Estimate: 1 hour**

### What It Does
Ensures all timestamps in the admin panel are consistently displayed in Eastern Time (EST/EDT). Currently, some time values display in raw format without proper timezone conversion.

---

## TMA-038 — Update Onboarding Graphics
**Estimate: 0.5 hours**

### What It Does
Replaces onboarding graphics that show people wearing masks with updated non-mask versions.

### Dependencies
- **Blocker:** New graphics must be provided by the design team

---

## TMA-039 — Chef "I've Arrived" Notification Button
**Estimate: 2 hours**

### What It Does
Adds a button for chefs to tap when they arrive at the customer's location, sending a push notification: "Your chef has arrived."

---

## TMA-044 — Order Completion Time Reminder for Chef
**Estimate: 3 hours**

### What It Does
Sends a push notification to the chef 10 minutes before the estimated order completion time, reminding them to wrap up.

### Dependencies
- TMA-037 (time blockout logic) — shares the order duration concept

---

## TMA-045 — Android Time Selection Layout
**Estimate: 2 hours**

### What It Does
Provides an alternative, more native-feeling time slot selection layout on Android devices for the checkout flow.

---

## TMA-046 — Chef: Request a New Allergen
**Estimate: 1 hour**

### What It Does
Lets chefs request a new allergen to be added if it's not in the predefined list. The request goes to admin for approval. Follows the same pattern as the existing "Request a new Category" feature.

---

## TMA-047 — "Free Parking Available?" Checkbox
**Estimate: 1 hour**

### What It Does
Adds a "Free parking available?" checkbox during the customer checkout flow so chefs know whether parking is available at the location.

---

## TMA-051 — Birthday Date Display Fix in Admin Panel
**Estimate: 0.5 hours**

### What It Does
Fixes incorrect birthday date display on the Customers page in the admin panel. A date formatting issue.

---

## TMA-052 — Deep Links in SMS Notifications
**Estimate: 3 hours**

### What It Does
Adds clickable deep links to SMS notifications so users can tap to go directly to relevant app screens (e.g., leave a review, view order details). Currently, SMS messages have no actionable links.

---

## TMA-031 — Customization Quantity Buttons
**Estimate: 2 hours**

### What It Does
Allows customers to adjust quantities on individual customizations (add-ons) when ordering — e.g., "Extra cheese x2." Currently, customizations are simple on/off toggles.

---

## TMA-034 — Category Overhaul ("Other" Category)
**Estimate: 1 hour**

### What It Does
Allows menu items to go live with an "Other" category selected, rather than requiring a specific predefined category. Useful when a dish doesn't fit neatly into existing categories.

---

## TMA-035 — Demand-Gated Background Checks
**Estimate: 2 hours**

### What It Does
Restricts chef onboarding (background check submission) to areas with existing customer demand, using the same zip code filtering applied to customer signups. Prevents background check costs in areas without active users.

### Open Questions
- How does this interact with pre-building chef profiles in new markets before launch?

---

# Appendix

## Assumptions
- Estimates cover development and basic testing. They do not include design work, copywriting, legal document drafting, or QA beyond developer testing.
- Items requiring third-party assets (graphics, legal text) are blocked until those assets are provided.
- Estimates assume sequential development. Some items can be built in parallel by multiple developers, which would reduce calendar time but not total hours.
- Hour estimates account for standard development complexity. The 10% cost protection cap covers edge cases, debugging, and cross-platform testing.

## Dependencies Summary
| Item | Depends On |
|------|-----------|
| TMA-023 (MOQ) | TMA-034 (Category overhaul), TMA-041 (Standard vs. Meal Prep) |
| TMA-033 (Menu enhancements) | TMA-041, TMA-023 |
| TMA-044 (Completion reminder) | TMA-037 (Time blockout) |
| TMA-061 (Order for tomorrow) | TMA-037 (Time blockout) |
| TMA-036 (Privacy/Terms) | Legal text from Taist team |
| TMA-038 (Onboarding graphics) | New graphics from design team |
| TMA-053 (Google/Apple Sign-In) | Google Cloud Console + Apple Developer access |
| TMA-025 (Stripe webhooks) | Stripe dashboard access |

## Notes
- TMA-040 and TMA-043 (chef safety reminders) can be combined into a single deliverable to reduce overhead.
- TMA-037 (time blockout) uses a fixed order duration for now. Allowing chefs to set per-item cook times or enter duration at acceptance are future enhancements that would require additional scoping.
- TMA-026 (email campaigns) uses Brevo for marketing campaigns (drag-and-drop editor, audience segmentation). The team will use Brevo's web dashboard directly — no custom email UI is being built.
