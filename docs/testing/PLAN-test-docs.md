# Test Documentation Plan

> **Purpose:** Define the structure and content for pre-production verification docs.
> **Tools:** Playwright (admin panel web), Maestro (mobile app)
> **Status:** PLAN — not yet implemented

---

## Document Structure

```
docs/testing/
├── PLAN-test-docs.md              ← this file (delete after implementation)
│
├── playwright/                     ← Admin panel (web) — Playwright
│   ├── README.md                  ← Setup, credentials, how to run
│   ├── 01-auth.md                 ← Login, logout, session
│   ├── 02-chef-management.md      ← Chefs list, status changes, Stripe
│   ├── 03-pending-approvals.md    ← Pending chefs, approve/reject
│   ├── 04-customers.md            ← Customer list, export
│   ├── 05-menus.md                ← Menu list, edit title/description
│   ├── 06-customizations.md       ← Customization list, edit
│   ├── 07-orders.md               ← Order list, admin cancel + refund
│   ├── 08-discount-codes.md       ← CRUD, activate/deactivate, usage
│   ├── 09-reviews.md              ← Review list, AI review creation
│   ├── 10-earnings.md             ← Revenue dashboard
│   ├── 11-support.md              ← Tickets, chats, contacts
│   ├── 12-zipcodes.md             ← Service area management
│   ├── 13-exports.md              ← Excel exports (chefs, pendings, customers)
│   └── 14-edge-cases.md           ← Cross-cutting concerns
│
├── maestro/                        ← Mobile app — Maestro
│   ├── README.md                  ← Setup, test users, how to run
│   ├── 01-auth.md                 ← Login, register, forgot password
│   ├── 02-customer-browse.md      ← Home, search, chef detail
│   ├── 03-customer-order.md       ← Add to order, checkout, payment
│   ├── 04-customer-orders.md      ← Order list, order detail, tipping
│   ├── 05-customer-messaging.md   ← Chat, inbox, notifications
│   ├── 06-customer-account.md     ← Profile, settings, drawer menu
│   ├── 07-chef-onboarding.md      ← Welcome, quiz, Stripe, background check
│   ├── 08-chef-dashboard.md       ← Home, order cards, accept/reject
│   ├── 09-chef-menu.md            ← Menu management, add item (8-step)
│   ├── 10-chef-availability.md    ← Profile tab, availability overrides
│   ├── 11-chef-orders.md          ← Order list, order detail, chat
│   ├── 12-chef-earnings.md        ← Earnings tab
│   ├── 13-shared-screens.md       ← Terms, privacy, contact, report issue
│   └── 14-edge-cases.md           ← Cross-cutting concerns
│
└── api/                            ← Backend API — direct HTTP (bonus)
    └── README.md                  ← Notes on which endpoints are covered
                                      by Playwright/Maestro vs need direct tests
```

---

## Phase 1: Playwright — Admin Panel Docs

### 1.1 `playwright/README.md`

Contents:
- Admin panel URL (local: `localhost:8005/admin`, staging, production)
- Default credentials (`admin@taist.com` / `admin123` from AdminSeeder)
- How to seed admin: `php artisan db:seed --class="Database\Seeders\AdminSeeder"`
- Playwright config requirements (base URL, auth state persistence)
- How to run: `npx playwright test`
- Folder layout explanation

### 1.2 `playwright/01-auth.md` — Authentication

| Test | Route | What to verify |
|------|-------|----------------|
| Login with valid creds | `POST /admin/login` | Redirects to `/admin/chefs`, session cookie set |
| Login with wrong password | `POST /admin/login` | Error message shown, stays on login page |
| Login with inactive admin | `POST /admin/login` | Error: "Account is not active" |
| Login with nonexistent email | `POST /admin/login` | Error message, no redirect |
| Logout | `GET /admin/logout` | Session destroyed, redirects to `/admin` |
| Session expiry | — | After timeout, redirects to login |
| Auth guard on all pages | `GET /admin/*` | Unauthenticated → redirect to login |
| CSRF protection | `POST /admin/login` | Request without CSRF token fails |

Edge cases:
- Double login (already logged in, visit login page → should redirect to dashboard)
- Concurrent sessions (same admin in two browsers)

### 1.3 `playwright/02-chef-management.md` — Chefs

| Test | Route | What to verify |
|------|-------|----------------|
| Load chefs list | `GET /admin/chefs` | Table renders, columns: name, email, status, location, menus, availability |
| Chef status shows correctly | — | Status badges: Pending (0), Active (1), Denied (2), Banned (3) |
| Bulk approve chefs | `GET /adminapi/change_chef_status?ids=X&status=1` | Status updates, ChefApprovedNotification sent |
| Bulk reject chefs | `GET /adminapi/change_chef_status?ids=X&status=2` | Status updates to rejected |
| Bulk delete chefs | `GET /adminapi/change_chef_status?ids=X&status=4` | Chef removed/soft-deleted |
| Delete Stripe accounts | `POST /adminapi/delete_stripe_accounts` | Stripe Connect accounts removed for selected chefs |
| Chef availability display | — | Shows weekly schedule + overrides |
| Chef menus display | — | Shows menu items linked to chef |

Edge cases:
- Approve chef with no Stripe account
- Delete chef with active orders
- Chef with zero menus
- Chef with expired availability overrides

### 1.4 `playwright/03-pending-approvals.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Load pendings list | `GET /admin/pendings` | Only `status=0` chefs shown |
| Approve pending chef | — | Moves to active, sends notification |
| Reject pending chef | — | Moves to rejected |
| Export pendings | `GET /admin/export_pendings` | Downloads .xlsx file |
| Empty state | — | Message when no pending chefs |

### 1.5 `playwright/04-customers.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Load customers list | `GET /admin/customers` | Table renders with customer data |
| Export customers | `GET /admin/export_customers` | Downloads .xlsx file |
| Customer count | — | Total count displayed |
| Empty state | — | Handle zero customers |

### 1.6 `playwright/05-menus.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Load menus list | `GET /admin/menus` | Table: name, chef, category, allergens, appliances, price |
| Navigate to edit | `GET /admin/menus/{id}` | Form loads with current values |
| Update menu title | `POST /admin/menus/{id}` | Title saved, redirects back |
| Update menu description | `POST /admin/menus/{id}` | Description saved |
| Allergen/appliance mapping | — | Comma-separated IDs correctly resolved to names |
| Empty description | — | Allow saving blank description |

### 1.7 `playwright/06-customizations.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Load customizations list | `GET /admin/customizations` | Table renders |
| Edit customization | `GET /admin/customizations/{id}` | Form loads with current name |
| Update customization name | `POST /admin/customizations/{id}` | Name saved |
| Customization linked to menu | — | Shows parent menu reference |

### 1.8 `playwright/07-orders.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Load orders list | `GET /admin/orders` | Table: order ID, customer, chef, items, status, amount, date |
| Order status display | — | Status codes (1-7) mapped to labels |
| Admin cancel order | `POST /adminapi/orders/{id}/cancel` | Order cancelled, reason recorded |
| Admin cancel + full refund | — | Stripe refund at 100%, amount verified |
| Admin cancel + partial refund | — | Stripe refund at X%, refund amount correct |
| Admin cancel + no refund | — | Cancel with 0% refund, no Stripe call |
| Cancel already-completed order | — | Should handle gracefully (error or warning) |
| Order with no payment intent | — | Cancel without Stripe processing |
| View order details | — | Customer info, chef info, menu items, customizations, review, tip |

Edge cases:
- Cancel order that's already cancelled
- Refund percentage > 100 or < 0 (validation)
- Order with multiple menu items
- Order with discount code applied

### 1.9 `playwright/08-discount-codes.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Load discount codes list | `GET /admin/discount-codes` | Table with all codes |
| Create fixed discount | `POST /admin/discount-codes` | Code created with flat $ off |
| Create percentage discount | `POST /admin/discount-codes` | Code created with % off |
| Set usage limit | — | `max_uses` enforced |
| Set min order amount | — | `min_order_amount` enforced |
| Set date range | — | `valid_from` / `valid_until` enforced |
| Update discount code | `PUT /admin/discount-codes/{id}` | Fields updated |
| Deactivate code | `POST /admin/discount-codes/{id}/deactivate` | Status set inactive |
| Reactivate code | `POST /admin/discount-codes/{id}/activate` | Status set active |
| View usage stats | `GET /admin/discount-codes/{id}/usage` | Shows customer, order, date |
| Duplicate code name | — | Should error or warn |

Edge cases:
- Discount code at max usage limit
- Expired code still showing as active
- Zero-amount discount
- Code with no end date (perpetual)

### 1.10 `playwright/09-reviews.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Load reviews list | `GET /admin/reviews` | Table renders |
| Create AI review | `POST /adminapi/create-authentic-review` | Seed review + 3 AI variants created |
| AI review attribution | — | Reviews show as anonymous customer |
| Review rating range | — | Rating 1-5, enforced |

Edge cases:
- Create review for chef with zero orders
- AI generation failure (OpenAI down)

### 1.11 `playwright/10-earnings.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Load earnings page | `GET /admin/earnings` | Revenue data renders |
| Monthly aggregation | — | Correct sum by month per chef |
| Yearly aggregation | — | Correct sum by year |
| Chef with no earnings | — | Shows $0 or empty row |

### 1.12 `playwright/11-support.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Load contacts (tickets) | `GET /admin/contacts` | Table renders |
| Load chats | `GET /admin/chats` | Conversation history |
| Load transactions | `GET /admin/transactions` | Payment logs |
| Bulk update ticket status | `GET /adminapi/change_ticket_status` | Status updates |
| Bulk update category status | `GET /adminapi/change_category_status` | Status updates |

### 1.13 `playwright/12-zipcodes.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Load zipcodes page | `GET /admin/zipcodes` | Current service area codes |
| Add new zipcode | `POST /admin/zipcodes` | Code added, Firebase notification sent |
| Remove zipcode | — | Code removed from service area |
| Duplicate zipcode | — | Handled gracefully |
| Invalid zipcode format | — | Validation error |

Edge cases:
- Adding zipcode triggers notification — verify push sent
- Removing zipcode with active chefs in that area

### 1.14 `playwright/13-exports.md`

| Test | Route | What to verify |
|------|-------|----------------|
| Export chefs XLSX | `GET /admin/export_chefs` | Valid .xlsx downloaded, correct columns |
| Export pendings XLSX | `GET /admin/export_pendings` | Valid .xlsx downloaded |
| Export customers XLSX | `GET /admin/export_customers` | Valid .xlsx downloaded |
| Large dataset export | — | Doesn't timeout on 1000+ rows |
| Empty dataset export | — | Downloads empty file or shows message |

### 1.15 `playwright/14-edge-cases.md` — Cross-Cutting

| Test | What to verify |
|------|----------------|
| Navigation sidebar links | All sidebar links navigate to correct pages |
| Pagination | Tables paginate at configured limit (10) |
| Bootstrap Table sorting | Column sort works on all tables |
| Bootstrap Table search | Table search/filter works |
| API token in JS | `api_token` correctly passed to frontend JS for API calls |
| Mobile responsiveness | Admin panel usable on tablet widths (not required on phone) |
| Concurrent admin actions | Two admins approving same chef simultaneously |
| SQL injection on search | Table search inputs sanitized |
| XSS in user-submitted data | Chef names, menu descriptions with HTML/script tags |
| Timestamp formatting | Unix timestamps display correctly in Pacific timezone |

---

## Phase 2: Maestro — Mobile App Docs

### 2.1 `maestro/README.md`

Contents:
- How to seed test users: `php artisan db:seed --class="Database\Seeders\MaestroTestUserSeeder"`
- Test user credentials (reference `frontend/.maestro/test-users.env.yaml`)
- How to start backend (`port 8005`) and frontend (`npm run dev:local`)
- How to run: `maestro test frontend/.maestro/ --env frontend/.maestro/test-users.env.yaml`
- Test user matrix:

| Email | Type | State | Purpose |
|-------|------|-------|---------|
| `maestro+customer1@test.com` | Customer | Active | Happy path |
| `maestro+customer2@test.com` | Customer | Active | Second customer (order conflicts) |
| `maestro+customer-new@test.com` | Customer | Active | Fresh account (no orders) |
| `maestro+chef1@test.com` | Chef | Active | Happy path |
| `maestro+chef2@test.com` | Chef | Active | Second chef |
| `maestro+chef-pending@test.com` | Chef | Pending | Onboarding flow |
| `maestro+chef-noquiz@test.com` | Chef | No quiz | Safety quiz flow |

### 2.2 `maestro/01-auth.md` — Authentication

| Test | Screen | What to verify |
|------|--------|----------------|
| Login as customer | Login | Redirects to customer tabs |
| Login as chef | Login | Redirects to chef tabs (or onboarding if pending) |
| Login with wrong password | Login | Error toast shown |
| Login with nonexistent email | Login | Error message |
| Logout (customer) | Drawer → Logout | Returns to login screen |
| Logout (chef) | Drawer → Logout | Returns to login screen |
| Register customer | Signup | Multi-step: email → password → name → location → preferences |
| Register chef | Signup | Multi-step: email → password → phone → name → birthday → location → photo |
| Forgot password | Forgot | Sends reset code, enters new password |
| Remember me toggle | Login | Persists login on app restart |
| Password visibility toggle | Login | Eye icon shows/hides password |

Edge cases:
- Register with existing email
- Register with weak password
- Login immediately after register
- Network offline during login

### 2.3 `maestro/02-customer-browse.md` — Browsing

| Test | Screen | What to verify |
|------|--------|----------------|
| Home loads chefs | Customer Home | Chef cards appear with names, ratings, availability |
| Filter by location | Customer Home | Only chefs in selected area shown |
| Tap chef card | Customer Home → Chef Detail | Chef profile loads with menus, reviews, ratings |
| Chef menu items display | Chef Detail | Menu cards show name, price, photo, allergens |
| Chef reviews display | Chef Detail | Reviews with ratings shown |
| Chef availability display | Chef Detail | Available dates/times shown |
| Back navigation | Chef Detail → Home | Returns to home screen |
| Empty search results | Customer Home | "No chefs found" message |

Edge cases:
- Chef with zero menus
- Chef with NULL allergens on menu (was a bug — fixed in commit 621b890)
- Chef who went offline after customer opened their profile
- Slow image loading on chef cards

### 2.4 `maestro/03-customer-order.md` — Ordering

| Test | Screen | What to verify |
|------|--------|----------------|
| Add item to order | Add to Order | Item appears with price, customizations available |
| Select customizations | Add to Order | Add-ons reflect in price |
| View allergen info | Add to Order | Allergen warnings shown |
| Navigate to checkout | Add to Order → Checkout | Items carry over, total calculated |
| Select delivery date | Checkout | Calendar shows available dates |
| Select delivery time | Checkout | Time slots match chef availability |
| Add payment method | Checkout → Credit Card | Stripe card input, validation |
| Apply discount code | Checkout | Code validated, discount reflected in total |
| Invalid discount code | Checkout | Error message shown |
| Place order | Checkout | Order created, confirmation shown |
| Order total calculation | Checkout | Items + customizations + tax - discount = correct total |

Edge cases:
- Order from chef with no available timeslots
- Apply expired discount code
- Apply discount code below minimum order amount
- Payment method declined by Stripe
- Double-tap place order (prevent duplicate orders)
- Network timeout during payment
- Chef goes offline between adding to cart and checkout

### 2.5 `maestro/04-customer-orders.md` — Order Management

| Test | Screen | What to verify |
|------|--------|----------------|
| Orders list loads | Customer Orders Tab | Active and past orders shown |
| Order detail view | Order Detail | Items, status, chef info, delivery details |
| Order status updates | Order Detail | Status changes reflected (pending → accepted → ready → completed) |
| Leave review | Order Detail | Rating (1-5) + comment submitted |
| Add tip | Order Detail | Tip amount added to payment |
| Cancel order (customer) | Order Detail | Cancellation processed |

Edge cases:
- Review order that was cancelled
- Tip on already-tipped order
- Order list with 50+ orders (scroll performance)
- Order with removed menu item (menu deleted after order placed)

### 2.6 `maestro/05-customer-messaging.md`

| Test | Screen | What to verify |
|------|--------|----------------|
| Open inbox | Inbox | Conversation list loads |
| Open chat | Chat | Message history loads |
| Send message | Chat | Message appears in thread |
| Receive message | Chat | New message from chef appears |
| Notification tap | Notification → Chat | Deep links to correct chat |
| Empty inbox | Inbox | "No conversations" state |

Edge cases:
- Long message text
- Rapid message sending
- Chat with deleted user

### 2.7 `maestro/06-customer-account.md`

| Test | Screen | What to verify |
|------|--------|----------------|
| View profile | Account | Name, email, photo, address displayed |
| Edit profile fields | Account | Name, phone, address updated |
| Change photo | Account | New photo uploaded and displayed |
| View notifications | Notifications | Notification list loads |
| Drawer menu links | Drawer | All links navigate correctly |
| Terms page | Terms | HTML content renders |
| Privacy page | Privacy | HTML content renders |
| Contact Us | Contact Us | Form submits ticket |
| Report Issue | Report Issue | Form submits with origin screen |
| Delete account | Drawer → Delete | Confirmation dialog, account deleted |
| Earn by Cooking | Drawer → Earn by Cooking | Chef signup modal shown |

### 2.8 `maestro/07-chef-onboarding.md`

| Test | Screen | What to verify |
|------|--------|----------------|
| Pending chef login | Login → Onboarding | `is_pending==1` → onboarding screen |
| Chef welcome | Chef Welcome | Welcome content displays |
| Safety quiz | Safety Quiz | Quiz loads, can answer, submits |
| Safety quiz pass | Safety Quiz | Marks `quiz_completed`, advances |
| Background check | Background Check | Form: SSN, DOB, address |
| Stripe setup | Setup Stripe | Deep link to Stripe Connect |
| Stripe return | — | Deep link back to app, account verified |
| Cancel application | Cancel Application | Chef removed from pending |
| Onboarding resume | Login (mid-onboarding) | Returns to correct onboarding step |

Edge cases:
- Stripe setup timeout (user abandons Stripe flow)
- Background check API failure
- Quiz with incorrect answers (fail state)
- Chef who completed quiz but not Stripe

### 2.9 `maestro/08-chef-dashboard.md`

| Test | Screen | What to verify |
|------|--------|----------------|
| Dashboard loads | Chef Home | Today's requested orders shown |
| Requested orders | Chef Home | Status=1 orders in "Requested" section |
| Accepted orders | Chef Home | Status=2,7 orders in "Accepted" section |
| Accept order | Chef Home → Order Detail | Status changes to accepted |
| Reject order | Chef Home → Order Detail | Status changes to rejected |
| Payment status display | Chef Home | Shows payment state per order |
| Empty dashboard | Chef Home | "No orders" state |
| Refresh | Chef Home | Pull-to-refresh updates orders |

### 2.10 `maestro/09-chef-menu.md`

| Test | Screen | What to verify |
|------|--------|----------------|
| Menu list loads | Chef Menu Tab | All menu items shown |
| Add menu item (8 steps) | Add Menu Item | Full flow: name → description → categories → pricing → allergens → kitchen → customizations → review |
| AI description generation | Add Menu Item (step 2) | Description generated from name + ingredients |
| AI description enhancement | Add Menu Item (step 2) | Existing description improved |
| Add customization | Add-on Customization | Add-on with name + price created |
| Edit menu item | Menu Tab → Edit | Fields update correctly |
| Delete menu item | Menu Tab → Delete | Item removed from list |
| Activate/deactivate menu | Menu Tab | Toggle visibility |

Edge cases:
- Menu item with no photo
- Menu item with 10+ customizations
- Menu description with special characters
- AI generation when OpenAI is down (graceful fallback)
- Price with more than 2 decimal places

### 2.11 `maestro/10-chef-availability.md`

| Test | Screen | What to verify |
|------|--------|----------------|
| View availability | Chef Profile Tab | Weekly schedule shown |
| Set daily availability | Chef Profile Tab | Open/close times saved |
| Set availability override | — | Specific date override applied |
| Get available timeslots | — | API returns correct slots |
| Toggle online status | — | Online/offline state reflected |

Edge cases:
- Override on a day with no base availability
- Overlapping time slots
- Past-date override (should be ignored)
- Midnight crossing availability (11pm-1am)

### 2.12 `maestro/11-chef-orders.md`

| Test | Screen | What to verify |
|------|--------|----------------|
| Orders list loads | Chef Orders Tab | All orders with filter by status |
| Order detail view | Chef Order Detail | Full order info + customer details |
| Chat with customer | Chef Order Detail | Message thread works |
| Update order status | Chef Order Detail | Status progression: accepted → preparing → ready → completed |

### 2.13 `maestro/12-chef-earnings.md`

| Test | Screen | What to verify |
|------|--------|----------------|
| Earnings tab loads | Chef Earnings Tab | Revenue data displays |
| Earnings calculation | — | Matches completed order totals |
| Payout history | — | Stripe payout records shown |
| Zero earnings state | — | "No earnings yet" message |

### 2.14 `maestro/13-shared-screens.md`

| Test | Screen | What to verify |
|------|--------|----------------|
| Terms and Conditions | Terms | HTML content renders from backend |
| Privacy Policy | Privacy | HTML content renders from backend |
| Contact Taist | Contact Us | Form submits support ticket |
| Report Issue | Report Issue | Form submits with origin screen |
| Map view | Map | Chef location pin on map |
| Notification center | Notifications | List renders, tap navigates |
| App version check | Splash | Version check passes |

### 2.15 `maestro/14-edge-cases.md` — Cross-Cutting

| Test | What to verify |
|------|----------------|
| Network offline | Error handling / offline indicators on all screens |
| Slow network | Loading spinners appear, no duplicate requests |
| Deep linking | Push notification taps navigate to correct screen |
| Protected routes | Customer can't access chef screens, vice versa |
| Session expiry | Token invalidated → redirect to login |
| App backgrounding | State preserved when app returns from background |
| Stripe deep link return | App handles `taistexpo://stripe-complete` and `taistexpo://stripe-refresh` |
| Large data sets | Scroll performance with 100+ items |
| Special characters | Names, descriptions with emojis, unicode |
| Photo upload | Large images resize/compress correctly |
| Pull-to-refresh | All list screens refresh data |
| Empty states | Every list screen handles zero items gracefully |
| Android vs iOS | Platform-specific behaviors (keyboard, navigation gestures) |

---

## Phase 3: API Coverage Gap Analysis (Bonus)

### `api/README.md`

Document which of the 80+ backend endpoints are exercised by Playwright or Maestro tests vs which need standalone API tests. Organize by:

**Covered by Playwright (admin panel):**
- All `/admin/*` web routes
- All `/adminapi/*` API routes

**Covered by Maestro (mobile app):**
- All `/mapi/*` routes exercised through UI flows

**Gaps needing direct API tests:**
- Endpoints not reachable through current UI (e.g., deprecated endpoints)
- Rate limiting verification (`throttle:60,1`)
- Concurrent request handling
- Malformed request payloads (400 responses)
- Auth bypass attempts (missing token, expired token, wrong user type)

---

## Implementation Order

1. **Playwright README + auth** — foundation for all admin tests
2. **Maestro README + auth** — foundation for all mobile tests
3. **Playwright admin pages** — highest risk (payments, chef approval, refunds)
4. **Maestro customer happy path** — browse → order → pay → review
5. **Maestro chef happy path** — onboard → menu → accept order → earn
6. **Edge cases for both** — last, after happy paths are solid
7. **API gap analysis** — identify untested endpoints

---

## Estimated Doc Count

| Category | Files | Tests (approx) |
|----------|-------|-----------------|
| Playwright admin | 15 docs | ~120 test cases |
| Maestro mobile | 15 docs | ~150 test cases |
| API gap analysis | 1 doc | — |
| **Total** | **31 docs** | **~270 test cases** |
