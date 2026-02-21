# Admin Panel Rewrite: React + shadcn/ui SPA

## Context

The current admin panel is a Laravel Blade + jQuery DataTables + Bootstrap 3 app that looks dated and is hard to maintain. We're rewriting it as a modern React + shadcn/ui + TypeScript SPA. The new panel will be built at `/admin-new` while the old panel stays fully functional at `/admin`. Swap happens only at the very end after full QA.

**Zero risk to existing functionality** — the old admin panel is never modified. If anything goes wrong, delete `backend/admin-panel/` and revert 2 small backend changes.

## Architecture

```
backend/admin-panel/      ← New React SPA (Vite + React 18 + TS + Tailwind + shadcn/ui)
  src/
    pages/                ← One page per admin view
    components/ui/        ← shadcn/ui components
    components/data-table/← Reusable TanStack Table
    components/layout/    ← Sidebar, app shell, auth guard
    lib/api.ts            ← Axios with token auth
    lib/auth.ts           ← Auth context (token in localStorage)

backend/
  routes/admin-api-v2.php          ← NEW JSON API routes
  app/Http/Controllers/
    AdminApiV2Controller.php       ← NEW controller (ports existing queries → JSON)
  routes/web.php                   ← Add 3-line catch-all for /admin-new
  app/Providers/RouteServiceProvider.php ← Add 1 method call
```

**Key decisions:**
- **TanStack Table** (headless) replaces jQuery DataTables — works natively with shadcn/ui
- **TanStack Query** for data fetching/caching — automatic refetch, loading states, error handling
- **Reuse existing `/adminapi/*` mutations** — no new mutation endpoints needed
- **New `AdminApiV2Controller`** ports the exact same DB queries from `AdminController`, returns JSON instead of `view()`
- **Client-side Excel export** via `xlsx` npm package (no server-side export endpoints needed)

## Backend Changes (minimal)

Only 2 existing files are modified:

| File | Change |
|------|--------|
| `RouteServiceProvider.php` | Add `mapAdminApiV2Routes()` (5 lines) + 1 call in `map()` |
| `routes/web.php` | Add 3-line SPA catch-all: `Route::get('/admin-new/{any?}', ...)` |

Everything else is NEW files:
- `backend/routes/admin-api-v2.php` — all new JSON endpoints
- `backend/app/Http/Controllers/AdminApiV2Controller.php` — single controller, ~600-800 lines when complete

## Phases

### Phase 1: Foundation — React scaffold + Auth + Login
**Goal:** Working React SPA at `/admin-new` with login + empty shell.

**Backend:**
- Create `AdminApiV2Controller` with: `login()`, `logout()`, `me()`
- Create `routes/admin-api-v2.php` with auth routes
- Register routes in `RouteServiceProvider`
- Add SPA catch-all in `web.php`

**Frontend (`backend/admin-panel/`):**
- Scaffold: Vite + React 18 + TypeScript + Tailwind + shadcn/ui
- Core: `lib/api.ts` (Axios + token interceptor), `lib/auth.ts` (context + localStorage)
- Layout: Sidebar with all nav links, app shell, auth guard
- Login page: email/password form → stores token → redirects
- shadcn components: button, input, card, label

**Playwright verification:**

_Auth flow:_
1. Navigate to `/admin-new/login` — login form renders with email + password fields
2. Submit with wrong password — error message visible, no redirect
3. Submit with valid `admin@taist.com` / `admin123` — redirects to `/admin-new/`
4. Sidebar visible with nav links for all 13 sections (Dashboard, Chefs, Pendings, Categories, Customers, Orders, Earnings, Contacts, Menus, Customizations, Profiles, Chats, Reviews, Transactions, Zipcodes, Discount Codes)
5. Hard refresh — stays on same page (token persisted in localStorage)
6. Logout — redirected to login, token cleared from localStorage

_Auth guard:_
7. While logged out, navigate to `/admin-new/chefs` — redirects to `/admin-new/login`
8. While logged out, call `GET /admin-api-v2/me` directly — returns 401

_Data parity:_
9. Call `GET /admin-api-v2/me` while authenticated — returns admin user object with email, name, id

---

### Phase 2: DataTable infrastructure + Dashboard + Chefs
**Goal:** Reusable DataTable + the 2 highest-priority pages.

**Backend:** Add `dashboard()`, `chefs()` endpoints to controller

**Frontend:**
- `components/data-table/` — TanStack Table with sorting, search, pagination, row selection, column visibility
- Dashboard page — stat cards (total chefs/customers/orders, pending count, monthly revenue)
- Chefs page — 18-column table, status badges, bulk status change, Stripe delete, export

**Playwright verification:**

_Dashboard — API:_
1. `GET /admin-api-v2/dashboard` returns JSON with `total_chefs`, `total_customers`, `total_orders`, `pending_count`, `monthly_revenue` (all numeric)

_Dashboard — UI:_
2. Navigate to `/admin-new/` — stat cards render with non-zero numbers
3. Each stat card shows label + formatted number (revenue with `$` prefix)

_Chefs — API:_
4. `GET /admin-api-v2/chefs` returns array of chef objects, each with: id, email, first_name, last_name, status, phone, birthday, address, city, state, zip, latitude, longitude, created_at, weekly_availability, live_overrides, live_menus, photo

_Chefs — UI rendering:_
5. Navigate to `/admin-new/chefs` — table renders with rows
6. Chef IDs displayed in `CHEF0000001` format
7. Status shown as color-coded badge (Pending/Active/Rejected/Banned/Deleted)
8. Weekly availability column shows day abbreviations + time ranges (e.g., "M: 9:00am-5:00pm")
9. Photo column shows thumbnail image
10. Birthday column shows formatted date

_Chefs — DataTable interactions:_
11. Click "Email" column header — rows re-sort alphabetically; click again — reverses
12. Type a chef name in search box — table filters to matching rows; clear search — all rows return
13. Pagination: if >10 rows, page controls visible; click next page — shows next set
14. Column visibility toggle: hide a column — column disappears; show it — column reappears

_Chefs — Mutations:_
15. Select 1+ rows via checkbox → click "Active" status button → confirmation dialog appears → confirm → status badges update to Active, rows remain visible
16. Select 1+ rows → click "Rejected" → confirm → status updates to Rejected
17. Select 1+ rejected/disabled rows → click "Delete Stripe Account" → confirm → success toast

_Chefs — Export:_
18. Click "Export to Excel" — `.xlsx` file downloads with columns: Email, First Name, Last Name, Phone, Birthday, Address, City, State, Zip, Status, Created At

---

### Phase 3: Pendings + Categories + Customers
**Goal:** Three more DataTable pages with distinct features.

**Backend:** Add `pendings()`, `categories()`, `customers()` endpoints

**Frontend:**
- Pendings page — 23 columns, status change buttons
- Categories page — filter buttons (Requested/Approved/Rejected/All) with count badges
- Customers page — 14 columns, status change, export
- Shared: `StatusBadge` component, `ConfirmDialog` component

**Playwright verification:**

_Pendings — API:_
1. `GET /admin-api-v2/pendings` returns array of pending chef objects, each with: id, email, first_name, last_name, phone, birthday, address, city, state, zip, bio, availability (Mon-Sun times as "HH:MM - HH:MM"), min_order_amount, max_order_distance, status, photo, created_at

_Pendings — UI:_
2. Navigate to `/admin-new/pendings` — table renders with all 23 columns visible
3. Chef IDs in `CHEF0000001` format; availability times in "HH:MM - HH:MM" format per day
4. Bio column shows text content
5. Click column header → sorts; type in search → filters
6. Select rows → click "Activate" → confirm → status updates + approval notification sent (verify via toast)
7. Select rows → click "Reject" → confirm → status updates
8. Export to Excel downloads `.xlsx` with correct data

_Categories — API:_
9. `GET /admin-api-v2/categories` returns array with: id, name, chef_email, menu_id, status (1/2/3), created_at

_Categories — UI:_
10. Navigate to `/admin-new/categories` — table renders; filter buttons visible: Requested (with count badge), Approved, Rejected, All
11. Category IDs in `CAT0000001` format; menu item IDs in `MI0000001` format
12. Click "Requested" filter → only status=1 rows shown; count badge matches row count
13. Click "Approved" → only status=2; click "All" → all rows shown
14. Select rows → click "Approved" status button → confirm → status badges change to Approved
15. Select rows → click "Rejected" → confirm → status changes to Rejected
16. Sorting and search work across all filter states

_Customers — API:_
17. `GET /admin-api-v2/customers` returns array with: id, email, first_name, last_name, phone, birthday, address, city, state, zip, status, latitude, longitude, created_at

_Customers — UI:_
18. Navigate to `/admin-new/customers` — table renders with all 14 columns
19. Customer IDs in `C0000001` format
20. Status shown as badge (Pending/Active/Rejected/Banned)
21. Select rows → click "Rejected" → confirm → status updates
22. Sorting, search, and pagination work
23. Export to Excel downloads `.xlsx` with correct columns

---

### Phase 4: Orders + Earnings + Contacts
**Goal:** Three complex pages with rich formatting.

**Backend:** Add `orders()`, `earnings()`, `contacts()` endpoints

**Frontend:**
- Orders page — status badges, cancelled row styling, cancel dialog (reason + refund %), refund details
- Earnings page — currency/number formatting, monthly/yearly aggregates
- Contacts page — message parsing (splits message from context JSON), status change

**Playwright verification:**

_Orders — API:_
1. `GET /admin-api-v2/orders` returns array with: id, customer (name + email), chef (name + email), menu_title, quantity, total_price, order_date, status (1-7), cancellation details (cancelled_by, cancelled_at, cancellation_type, cancellation_reason), refund details (refund_amount, refund_percentage, refund_stripe_id), review (rating, text), created_at

_Orders — UI rendering:_
2. Navigate to `/admin-new/orders` — table renders with all columns
3. Order IDs in `ORDER0000001` format
4. Status badges color-coded: Requested, Accepted, Completed, Cancelled, Rejected, Expired, On My Way
5. Cancelled/rejected/expired orders have distinct row styling (muted/strikethrough)
6. Cancelled orders show inline: cancelled by (Admin/Customer/Chef + name), cancelled on (timestamp), cancellation type, reason
7. Orders with refunds show: refund amount with `$` + percentage, refund date, truncated Stripe refund ID
8. Review column shows star rating (e.g., "4/5") + preview of review text (first 30 chars)

_Orders — Cancel mutation:_
9. Click "Cancel" on a non-cancelled order → dialog opens with reason textarea + refund percentage slider/input (0-100%)
10. Submit with reason < 10 chars → validation error shown
11. Submit with valid reason (10+ chars) + refund % → order status changes to Cancelled, cancellation details appear, refund info shown
12. Click "Cancel" on already-cancelled order → not available / error toast

_Orders — Interactions:_
13. Sorting, search, and pagination work

_Earnings — API:_
14. `GET /admin-api-v2/earnings` returns array with: chef_id, email, name, monthly_earning, monthly_orders, monthly_items, yearly_earning, yearly_orders, yearly_items

_Earnings — UI:_
15. Navigate to `/admin-new/earnings` — table renders (only active verified chefs)
16. Chef IDs in `CHEF0000001` format
17. Dollar amounts formatted as currency (e.g., `$1,234.56`)
18. Order counts and item quantities as plain numbers
19. Monthly = last 30 days of completed orders; yearly = last 365 days
20. Sorting works on all columns (numeric sort on dollar/count columns, not alphabetical)
21. Search filters by chef name or email

_Contacts — API:_
22. `GET /admin-api-v2/contacts` returns array with: id, email, subject, message, issue_context (object with: issue_type, origin_screen, current_screen, entry_point, platform, device_model, device_os, app_version, app_build, app_env, client_timestamp, screenshot_url), status (1=In Review, 2=Resolved), created_at

_Contacts — UI rendering:_
23. Navigate to `/admin-new/contacts` — table renders
24. Ticket IDs in `T0000001` format
25. Message column shows message text; issue context expandable inline or in separate section
26. Context section renders all device/platform fields: issue type, origin screen, platform (iOS/Android), device model, OS version, app version, build number, environment
27. Screenshot URL rendered as clickable link (if present)
28. Status shown as badge: "In Review" or "Resolved"

_Contacts — Mutations:_
29. Select rows → click "Resolved" → confirm → status badges change from "In Review" to "Resolved"
30. Select rows → click "In Review" → confirm → status reverts
31. Sorting and search work

---

### Phase 5: Menus + Customizations + Profiles (list + edit)
**Goal:** Three pages with edit forms (only pages with write-back forms).

**Backend:** Add list + get + update endpoints for menus, customizations, profiles

**Frontend:**
- Menu list → click Edit → form (title + description) → save → redirect back
- Customization list → Edit → form (name) → save
- Profile list → Edit → form (bio textarea) → save
- Shared: `EditFormLayout` component with back button + save

**Playwright verification:**

_Menus — API:_
1. `GET /admin-api-v2/menus` returns array with: id, user_email, user_name, user_photo, category_names, allergen_names, appliance_names, title, description
2. `GET /admin-api-v2/menus/:id` returns single menu with all editable fields
3. `PUT /admin-api-v2/menus/:id` with `{title, description}` updates and returns updated menu

_Menus — UI list:_
4. Navigate to `/admin-new/menus` — table renders with columns: menu ID, chef email, chef name, photo, categories, allergens, appliances, title, description
5. Sorting and search work

_Menus — Edit flow:_
6. Click "Edit" on a menu row → navigates to `/admin-new/menus/:id/edit`
7. Form pre-fills with current title + description
8. Edit title to new value → click Save → success toast → redirects to menu list
9. Verify updated title appears in list
10. Click "Back" button without saving → returns to list, no changes persisted

_Customizations — API:_
11. `GET /admin-api-v2/customizations` returns array with: id, menu_title, customization details (name, options)
12. `GET /admin-api-v2/customizations/:id` returns single customization
13. `PUT /admin-api-v2/customizations/:id` with `{name}` updates and returns updated record

_Customizations — UI:_
14. Navigate to `/admin-new/customizations` — table renders with columns: customization ID, menu title, name/details
15. Click "Edit" → navigates to edit form → name field pre-filled
16. Edit name → Save → toast → redirects to list → updated name visible
17. Back button returns to list without saving

_Profiles — API:_
18. `GET /admin-api-v2/profiles` returns array of active verified chefs with: user fields + bio, availability hours, min/max order info
19. `GET /admin-api-v2/profiles/:id` returns single availability record with bio
20. `PUT /admin-api-v2/profiles/:id` with `{bio}` updates and returns updated record

_Profiles — UI:_
21. Navigate to `/admin-new/profiles` — table renders (only active verified chefs)
22. Click "Edit" → navigates to edit form → bio textarea pre-filled with current bio
23. Edit bio text → Save → toast → redirects to list → updated bio visible
24. Back button returns to list without saving

---

### Phase 6: Chats + Reviews + Transactions (read-only)
**Goal:** Three simple read-only DataTable pages.

**Backend:** Add `chats()`, `reviews()`, `transactions()` endpoints

**Frontend:**
- Chats — participant names/emails, message, order ID
- Reviews — star rating display, review text, tip amount
- Transactions — from/to users, amount

**Playwright verification:**

_Chats — API:_
1. `GET /admin-api-v2/chats` returns array with: conversation_id, from_user (email + name), to_user (email + name), message content, order_id

_Chats — UI:_
2. Navigate to `/admin-new/chats` — table renders with columns: conversation ID, from user (name + email), to user (name + email), message, order ID
3. Sorting works on all columns
4. Search filters by user name or email
5. Pagination works if >10 rows

_Reviews — API:_
6. `GET /admin-api-v2/reviews` returns array with: id, from_user_email, to_user_email, rating (1-5), review_text, tip_amount

_Reviews — UI:_
7. Navigate to `/admin-new/reviews` — table renders with columns: review ID, from email, to email, rating, review text, tip amount
8. Rating displayed as stars or numeric format (e.g., "4/5")
9. Tip amount formatted as currency (`$X.XX`)
10. Sorting works (numeric sort on rating and tip columns)
11. Search filters by email or review text

_Transactions — API:_
12. `GET /admin-api-v2/transactions` returns array with: id, from_user (name + email), to_user (name + email), amount, timestamp

_Transactions — UI:_
13. Navigate to `/admin-new/transactions` — table renders with columns: transaction ID, from user, to user, amount, date
14. Amount formatted as currency
15. Sorting and search work
16. Pagination works if >10 rows

---

### Phase 7: Zipcodes + Discount Codes (CRUD + special features)
**Goal:** Two remaining pages with mutations beyond status changes.

**Backend:** Add zipcodes + discount code CRUD + usage endpoints (including Firebase notification logic for new zipcodes)

**Frontend:**
- Zipcodes — textarea for comma-separated zips, save button, success toast
- Discount Codes — full CRUD: create dialog (8 fields), edit dialog, activate/deactivate, usage history modal

**Playwright verification:**

_Zipcodes — API:_
1. `GET /admin-api-v2/zipcodes` returns current comma-separated zipcode string
2. `PUT /admin-api-v2/zipcodes` with `{zipcodes}` updates and triggers notifications for new zips

_Zipcodes — UI:_
3. Navigate to `/admin-new/zipcodes` — textarea renders pre-filled with current zipcodes
4. Add a new zipcode to the list → click Save → success toast appears
5. Refresh page → new zipcode persists in textarea
6. Remove a zipcode → Save → toast → refresh → zipcode gone

_Discount Codes — API:_
7. `GET /admin-api-v2/discount-codes` returns array with: code, discount_type (fixed/percentage), discount_value, current_uses, max_uses, max_uses_per_customer, valid_from, valid_until, minimum_order_amount, maximum_discount_amount, is_active, created_at
8. `POST /admin-api-v2/discount-codes` creates new code (required: code, discount_type, discount_value)
9. `PUT /admin-api-v2/discount-codes/:id` updates mutable fields (description, max_uses, max_uses_per_customer, valid dates, min/max amounts — NOT code/type/value)
10. `POST /admin-api-v2/discount-codes/:id/deactivate` sets is_active=0
11. `POST /admin-api-v2/discount-codes/:id/activate` sets is_active=1
12. `GET /admin-api-v2/discount-codes/:id/usage` returns usage history with customer names, order IDs, discount amounts, timestamps

_Discount Codes — UI list:_
13. Navigate to `/admin-new/discount-codes` — table renders with columns: code, type badge (Fixed Amount / Percentage), value ($X or X%), uses (current/max), valid until, status badge (Active/Inactive), actions
14. Sorting and search work

_Discount Codes — Create:_
15. Click "Create" → modal opens with fields: Code (required), Description, Discount Type (required: Fixed/Percentage), Discount Value (required, numeric), Max Total Uses, Max Uses Per Customer (default 1), Valid From (datetime), Valid Until (datetime), Minimum Order Amount, Maximum Discount Amount
16. Submit with missing required fields → validation errors shown
17. Submit with duplicate code → error message
18. Submit with valid data → success toast → new code appears in table with correct type badge + value

_Discount Codes — Edit:_
19. Click "Edit" on a code → modal opens with mutable fields pre-filled (description, max_uses, valid dates, min/max amounts)
20. Code, type, and value fields are read-only / not shown in edit form
21. Edit max_uses → save → updated value shown in table

_Discount Codes — Activate/Deactivate:_
22. Click "Deactivate" on active code → confirm → status badge changes to Inactive
23. Click "Activate" on inactive code → confirm → status badge changes to Active

_Discount Codes — Usage history:_
24. Click "View Usage" on a code → modal opens showing: customer name, order ID, discount amount, used_at timestamp
25. Code with no usage → modal shows empty state message

---

### Phase 8: Polish + Password Change + Route Swap
**Goal:** Complete UX polish and prepare for cutover.

**Backend:** Add `changePassword()` endpoint

**Frontend:**
- Password change dialog (from sidebar)
- Skeleton loading states for all tables
- Error boundary component
- Empty state components
- Toast notifications for all mutations
- Responsive sidebar (collapsible)
- Production build → `backend/public/admin-new/`

**Route swap (separate PR after QA):**
- Move old Blade routes: `/admin` → `/admin-legacy`
- Move new SPA: `/admin-new` → `/admin`

**Playwright verification — full regression:**

_Password change:_
1. Click password change option in sidebar → dialog opens with old password + new password + confirm fields
2. Submit with wrong old password → error message
3. Submit with mismatched new/confirm → validation error
4. Submit with valid old password + matching new password → success toast → dialog closes
5. Logout → login with new password → succeeds
6. Login with old password → fails

_Loading & error states:_
7. Throttle network to slow 3G → navigate to any table page → skeleton loaders visible while data loads → table renders when complete
8. Block API endpoint → navigate to page → error boundary renders with user-friendly error message + retry button
9. Navigate to a table page with no data → empty state component shown (not a broken/blank table)

_Toast notifications:_
10. Perform any mutation (status change, edit save, create, delete) → toast notification appears confirming action
11. Force a mutation error (e.g., invalid data) → error toast appears with descriptive message

_Responsive sidebar:_
12. At desktop width (>1024px) → sidebar fully expanded with labels
13. Resize to narrow viewport (<768px) → sidebar collapses to icons only or hamburger menu
14. Click collapsed sidebar toggle → sidebar expands; click again → collapses

_Full page navigation:_
15. Starting from login, navigate to every page in sequence: Dashboard → Chefs → Pendings → Categories → Customers → Orders → Earnings → Contacts → Menus → Customizations → Profiles → Chats → Reviews → Transactions → Zipcodes → Discount Codes — each page loads without error

_Auth persistence:_
16. Login → navigate to Chefs → hard refresh → still on Chefs page, still authenticated
17. Open new tab to `/admin-new/orders` → loads correctly (shared token)
18. Logout in one context → API calls return 401

_Production build:_
19. Run `npm run build` in `backend/admin-panel/` → output to `backend/public/admin-new/` (auto-built on Railway deploy via `railpack.json`)
20. Serve via Laravel (`php artisan serve`) → navigate to `/admin-new/` → SPA loads from built assets
21. Direct URL navigation (e.g., `/admin-new/chefs`) works (SPA catch-all serves index.html)
22. All static assets (JS, CSS, images) load correctly (no 404s in network tab)

## Page Inventory (after reorganization — 11 routed pages)

Phase 9 reorganized 20 pages down to 11 routed pages. See `docs/admin-panel-reorganization-proposal.md` for the full rationale.

| # | Page | Route | Notes |
|---|------|-------|-------|
| 1 | Login | `/admin-new/login` | Dark gradient background |
| 2 | Dashboard | `/admin-new/` | 5 stat cards with colored icons |
| 3 | Chefs | `/admin-new/chefs` | Merged with Pendings (tab filters), detail drawer with profile/availability |
| 4 | Customers | `/admin-new/customers` | Status badges, bulk actions, export |
| 5 | Categories | `/admin-new/categories` | Filter buttons with count badges |
| 6 | Menus | `/admin-new/menus` | List with Edit button |
| 7 | Menu Edit | `/admin-new/menus/:id/edit` | Title/description form + customizations sub-table |
| 8 | Orders | `/admin-new/orders` | Detail drawer with chat/review/transaction, cancel dialog |
| 9 | Earnings | `/admin-new/earnings` | Monthly/yearly aggregates |
| 10 | Tickets | `/admin-new/tickets` | Renamed from Contacts |
| 11 | Discount Codes | `/admin-new/discount-codes` | Full CRUD + activate/deactivate + usage history |
| 12 | Service Areas | `/admin-new/service-areas` | Renamed from Zipcodes |

**Removed pages** (data moved inline): Pendings, Profiles, Profile Edit, Customizations, Customization Edit, Chats, Reviews, Transactions

**Sidebar:** 9 links in 7 sections (Overview, People, Food, Orders, Support, Marketing, Settings). Dark charcoal theme.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Data Tables | TanStack Table (headless) |
| Data Fetching | TanStack Query |
| Routing | React Router v7 |
| HTTP | Axios |
| Icons | Lucide React |
| Export | xlsx (client-side) |

## Critical Source Files (reference for porting)

| File | Why |
|------|-----|
| `backend/app/Http/Controllers/Admin/AdminController.php` | All 19 data queries to port verbatim |
| `backend/app/Http/Controllers/AdminapiController.php` | 7 existing mutation endpoints the SPA calls directly |
| `backend/config/auth.php` | `adminapi` guard config (token driver) |
| `backend/app/Providers/RouteServiceProvider.php` | Route registration pattern to follow |
| `backend/resources/views/admin/chefs.blade.php` | Reference for column definitions + status logic |
| `backend/resources/views/admin/discount_codes.blade.php` | Reference for CRUD modal fields |
| `backend/resources/views/admin/orders.blade.php` | Reference for cancellation/refund display |

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Break existing admin panel | Never modified — new files only (except 2 trivial additions) |
| Auth token mismatch | Reuse exact same `auth:adminapi` guard that existing mutations use |
| Data parity issues | Port queries verbatim from AdminController; verify with Playwright |
| Build/deploy complexity | Vite builds to `backend/public/admin-new/`; Laravel serves as static files |
| Scope creep | Each phase is independently shippable; can stop after any phase |
