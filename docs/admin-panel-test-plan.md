# Admin Panel — Functional Test Plan

Every page tested for real functionality. "Verify in DB" items confirm the action actually took effect, not just that the UI updated.

**Legend:** UI = visual/interaction check | DB = database verification via SQL query

---

## Login Page

- [x] Valid login (admin@taist.com / admin123) → redirects to Dashboard ✅
- [x] **DB:** Token stored in `tbl_admins.api_token` for logged-in admin ✅
- [x] Invalid password → inline error message shown ✅ "The email or password is incorrect"
- [x] Invalid email → inline error message shown ✅ same error message
- [ ] "Signing in..." disabled state while request is in flight (not tested — too fast to observe)

---

## Sidebar & Layout

### Desktop (≥ 1024px)
- [x] Sidebar visible with 9 nav links in 7 sections (Overview, People, Food, Orders, Support, Marketing, Settings) ✅
- [x] Dark sidebar theme (bg-gray-900) with white text ✅
- [x] Active link highlighted with white/10 background ✅
- [x] Each nav link navigates to correct page ✅
- [x] User email shown in sidebar header ✅ admin@taist.com
- [x] Section headers (OVERVIEW, PEOPLE, etc.) visible as muted uppercase labels ✅

### Mobile (< 1024px)
- [ ] Sidebar hidden by default, hamburger opens it (not tested)
- [ ] Nav link click navigates AND closes sidebar (not tested)
- [ ] Overlay click closes sidebar (not tested)

### Change Password
- [x] Wrong current password → "Current password is incorrect" error ✅
- [x] New password < 6 chars → "New password must be at least 6 characters." ✅
- [x] New password ≠ confirm → "New passwords do not match." ✅
- [x] Valid change → "Password changed successfully" toast ✅
- [x] **DB:** Verified by logging out and logging back in with new password ✅
- [x] **Cleanup:** Changed password back to admin123, verified with toast ✅

### Logout
- [x] "Logout" button → redirected to login page ✅
- [x] **DB:** `tbl_admins.api_token` set to empty string (effectively logged out) ✅
- [x] After logout, accessing /admin-new/ redirects to login ✅

---

## Dashboard

- [x] 5 stat cards render (Total Chefs, Total Customers, Total Orders, Pending Chefs, Monthly Revenue) ✅
- [x] **DB:** Verify each number matches ✅
  - Total Chefs: UI=9, DB `SELECT COUNT(*) FROM tbl_users WHERE user_type=2` = 9 (counts ALL chefs, not just verified)
  - Total Customers: UI=6, DB=6 ✅
  - Total Orders: UI=5, DB=5 ✅
  - Pending Chefs: UI=3, DB=3 ✅
  - Monthly Revenue: UI=$122.50 (not independently verified)

---

## Chefs (merged with Pendings — Phase 9 reorganization)

### Table Display
- [x] Table loads with all chefs (user_type=2) ✅ 9 chefs loaded
- [x] All expected columns present ✅
- [x] Status badges color-coded (Active=emerald, Pending=amber, Rejected=red, Banned=gray) ✅
- [x] Tab filters: All / Pending (3) / Active (8) / Rejected / Banned ✅
- [x] Pending tab shows extra columns (bio, availability days, min order, max distance) ✅
- [x] Context-aware action buttons per tab ✅

### Chef Detail Drawer
- [x] Click row → detail drawer slides open from right ✅
- [x] Shows contact info, status badge, address, photo ✅
- [x] Coordinates (latitude/longitude) displayed when available ✅ (added in data gap fix)
- [x] Editable bio textarea with Save button ✅
- [x] Availability schedule (Mon-Sun) ✅
- [x] Min Order / Max Distance shown ✅
- [x] Live Menus list ✅
- [x] Live Overrides with color-coded status ✅

### Search & Sort
- [ ] Search filters table by text
- [ ] Column headers sort asc/desc

### Bulk Status Change → Rejected
- [x] Picked CHEF0000114 (NoQuiz Chef), originally Active ✅
- [x] Selected chef → clicked "Rejected" → confirmed → toast "Status changed to Rejected" shown ✅
- [x] **DB:** `SELECT verified FROM tbl_users WHERE id=114` → verified=2 ✅

### Bulk Status Change → Active (Restore)
- [x] Selected same chef → clicked "Active" → confirmed → toast "Status changed to Active" shown ✅
- [x] **DB:** `SELECT verified FROM tbl_users WHERE id=114` → verified=1 ✅

### BUG FOUND & FIXED
- **Issue:** All mutation endpoints returned 404. Frontend `api.ts` has `baseURL: /admin-api-v2`, so calls to `/adminapi/change_chef_status` became `/admin-api-v2/adminapi/change_chef_status` which didn't exist.
- **Fix:** Added proxy routes in `backend/routes/admin-api-v2.php` forwarding legacy mutation calls (`change_chef_status`, `change_ticket_status`, `change_category_status`, `delete_stripe_accounts`, `orders/{id}/cancel`) to `AdminapiController`.

### Delete Stripe
- [ ] Select a rejected/banned chef → click "Delete Stripe" → confirm → toast shown
- [ ] **DB/API:** Stripe account removed (check response/logs)

### Export
- [ ] Click Export → file downloads as `Taist - Chefs.xlsx`
- [ ] Open file → verify columns and row count match table

---

## ~~Pendings~~ (REMOVED — absorbed into Chefs page as Pending tab, Phase 9)

> Standalone page removed. Pending chefs now appear as a tab filter on the Chefs page.
> Original test results preserved below for reference.

### Activate/Reject (historical — now done from Chefs → Pending tab)
- [x] Activate pending chef → verified=1, is_pending=0 ✅
- [x] Reject pending chef → verified=2, is_pending=0 ✅
- [x] **DB:** Both verified and restored ✅

---

## Categories

### Table Display
- [x] Table loads with 8 categories from `tbl_categories` — matches DB ✅
- [x] Status badges: Approved (2) shown correctly ✅
- [x] Filter buttons present: Requested / Approved / Rejected / All ✅

### Reject Category
- [x] Selected CAT0000029 (BBQ), originally Approved ✅
- [x] Select → "Reject" → confirm → toast "Category status changed to Rejected", badge updated ✅
- [x] **DB:** `SELECT status FROM tbl_categories WHERE id=29` → status=3 ✅

### Approve Category (Restore)
- [x] Selected same category (BBQ, still selected) → "Approve" → confirm ✅
- [x] Toast "Category status changed to Approved", badge updated to Approved ✅
- [x] **DB:** `SELECT status FROM tbl_categories WHERE id=29` → status=2 (restored) ✅

---

## Customers

### Table Display
- [x] Table loads with 6 customers (user_type=1) — matches DB ✅
- [x] All expected columns present ✅

### Bulk Status Change → Banned
- [x] Selected C0000103 (maestro+customer-new@test.com / New Customer), originally Active ✅
- [x] Select → "Banned" → confirm → toast "Status changed to Banned", badge updated ✅
- [x] **DB:** `SELECT verified FROM tbl_users WHERE id=103` → verified=3 ✅

### Bulk Status Change → Active (Restore)
- [x] Selected same customer → "Active" → confirm → toast "Status changed to Active" ✅
- [x] **DB:** `SELECT verified FROM tbl_users WHERE id=103` → verified=1 (restored) ✅

### Export
- [ ] Click Export → downloads `Taist - Customers.xlsx`

---

## Orders (gains detail drawer — Phase 9 reorganization)

### Table Display
- [x] Table loads with 5 orders — matches DB count ✅
- [x] All expected columns present (Order ID, Customer, Chef, Menu Item, Qty, Total, Order Date, Status, Cancellation, Refund, Review, Created) ✅
- [x] Status badges correct: Completed (3), Accepted (1), Requested (1) ✅
- [x] Status badges vibrant (emerald/blue/amber/violet/red) ✅
- [x] **DB:** Totals match: $55, $30, $67.50, $22.50, $45 ✅
- [x] Filter buttons present: All / Requested / Accepted / Completed / Cancelled ✅

### Order Detail Drawer (NEW — absorbs Chats, Reviews, Transactions)
- [x] Click row → detail drawer slides open from right ✅
- [x] Shows order info: status badge, dates, total, customer/chef info ✅
- [x] Shows menu item, quantity, notes ✅
- [x] Chat section: messages filtered by order_id, rendered as conversation ✅
- [x] Review section: shows review inline or "No review yet" ✅
- [x] Transaction section: shows transaction or "No transactions recorded" ✅
- [x] Cancellation section shows cancellation_type and is_auto_closed badge ✅ (added in data gap fix)
- [x] Cancel Order action available in drawer ✅

### Cancel Order (SKIPPED — Real Stripe Refund)
- [ ] **NOT TESTED** — Cancel Order triggers a real Stripe refund. Test only with a dedicated test order.
- Cancel Order button present and visible ✅
- Dialog expected to open with: order ID, reason field (min 10 chars), refund slider

### Export
- [ ] Click Export → downloads `Taist - Orders.xlsx`

---

## Earnings

### Table Display
- [x] Table loads with 2 chefs with earnings (read-only aggregation) ✅
- [x] Currency columns formatted as $XX.XX ✅ ($67.50, $55.00)
- [x] Columns sortable ✅

### Export
- [ ] Click Export → downloads `Taist - Earnings.xlsx`

---

## Tickets (renamed from Contacts — Phase 9 reorganization)

### Table Display
- [x] Table loads with 4 support tickets from `tbl_tickets` — matches DB ✅
- [x] Issue Context structured data renders (Issue Type, Platform, Device, etc.) ✅
- [x] Page heading says "Tickets" (not "Contacts") ✅

### Filter Buttons
- [x] In Review badge shows count (4) ✅
- [x] Filter buttons present: In Review / Resolved / All ✅

### Change Ticket Status → Resolved
- [x] Selected T0000003 (Bug Report / "Maestro smoke test") ✅
- [x] Select → "Resolved" → confirm → toast "Ticket status changed to Resolved", badge updated ✅
- [x] **DB:** `SELECT status FROM tbl_tickets WHERE id=3` → status=2 ✅
- [x] In Review badge count decreased from 4 to 3 ✅

### Cleanup
- [x] **DB:** Restored T0000003 to status=1 (In Review) ✅

---

## Menus

### Table Display
- [x] Table loads with all menu items (page 1 of 2) ✅
- [x] All expected columns present (Menu ID, Chef Email, Chef Name, Title, Description, Price, Servings, Categories, Allergens, Appliances, Est. Time, Live?, Created, Actions) ✅
- [x] Edit button present on each row ✅

### Edit Navigation
- [x] Click "Edit" on MI0000133 → navigates to /admin-new/menus/133/edit ✅

---

## Menu Edit (gains inline customizations — Phase 9 reorganization)

- [x] Page loads with current title ("Authentic Chicken Tacos (3 pack)") and description pre-filled ✅
- [x] Edit title to "TEST EDIT TITLE" → Save → toast "Menu updated", redirected to list ✅
- [x] **DB:** `SELECT title FROM tbl_menus WHERE id=133` → "TEST EDIT TITLE" ✅
- [x] Table shows updated title in list ✅
- [x] **Cleanup:** Edit title back to "Authentic Chicken Tacos (3 pack)" → Save → toast "Menu updated" ✅
- [x] **DB:** Confirmed title restored in DB ✅

### Inline Customizations (NEW — absorbs standalone Customizations page)
- [x] Customizations sub-table visible below title/description form ✅
- [x] Shows customizations filtered by this menu's ID ✅
- [x] Each row: name, upcharge price, Edit button ✅
- [x] Edit opens inline form or dialog (not page navigation) ✅
- [x] Save calls PUT /customizations/:id ✅

---

## ~~Customizations~~ (REMOVED — absorbed into Menu Edit, Phase 9)

> Standalone page removed. Customizations now appear inline in the Menu Edit page.
> Original test results preserved below for reference.

### Table Display (historical)
- [x] Table loads with 8 customization options from `tbl_customizations` ✅

### Edit (historical)
- [x] Edit name "Extra Guacamole" → "TEST CUST NAME" → Save → toast ✅
- [x] **DB:** Verified and restored ✅

---

## ~~Profiles~~ (REMOVED — absorbed into Chef Detail Drawer, Phase 9)

> Standalone page removed. Profile data (bio, availability, min order, max distance) now appears in the Chef Detail Drawer on the Chefs page.
> Original test results preserved below for reference.

### Profile Edit (historical)
- [x] Bio editable in Chef Detail Drawer textarea → Save → toast ✅
- [x] **DB:** Verified bio updates persist ✅

---

## ~~Chats~~ (REMOVED — absorbed into Order Detail Drawer, Phase 9)

> Standalone page removed. Chat messages now appear in the Order Detail Drawer, filtered by order_id.

---

## ~~Reviews~~ (REMOVED — absorbed into Order Detail Drawer, Phase 9)

> Standalone page removed. Reviews now appear in the Order Detail Drawer.

---

## ~~Transactions~~ (REMOVED — absorbed into Order Detail Drawer, Phase 9)

> Standalone page removed. Transactions now appear in the Order Detail Drawer.

---

## Service Areas (renamed from Zipcodes, moved under Settings — Phase 9 reorganization)

- [x] Textarea loads with current zipcodes (comma-separated, 59 Chicago-area codes) ✅
- [x] Page heading says "Service Areas" (not "Zipcodes") ✅
- [x] **DB:** Value matches `SELECT zipcodes FROM tbl_zipcodes LIMIT 1` ✅
- [x] Add test zipcode "00000" to the list → Save → "Service areas updated" toast ✅
- [x] **DB:** `SELECT RIGHT(zipcodes, 30) FROM tbl_zipcodes` → ends with ",00000" ✅
- [x] Reload page → "00000" still present (persisted) ✅
- [x] **Cleanup:** Remove "00000" and save → "Service areas updated" toast ✅
- [x] **DB:** Confirmed "00000" is gone, original zipcodes restored ✅
- [x] V2 zipcodesUpdate now sends FCM notifications to customers in newly added zipcodes ✅ (ported from old AdminController)

---

## Discount Codes

### Table Display
- [x] Table loads — 0 codes initially, shows "No results." ✅
- [x] Columns: Code, Type, Value, Uses, Valid Until, Status, Actions ✅

### Create Discount Code
- [x] Click "Create Code" → dialog opens with fields: Code, Description, Type (combobox), Value, Max Uses, Max Uses/Customer, Valid From/Until, Min/Max Order Amount ✅
- [x] Fill in: Code=TESTADMIN99, Type=percentage, Value=10, Max Uses=5, Valid Until=2026-02-21 ✅
- [x] Submit → toast "Discount code created", dialog closes, new code appears in table ✅
- [x] **DB:** `SELECT * FROM tbl_discount_codes WHERE code='TESTADMIN99'` → exists, is_active=1, discount_type='percentage', discount_value=10.00, max_uses=5 ✅

### Edit Discount Code
- [x] Click "Edit" on TESTADMIN99 → dialog opens with editable fields only (Description, Max Uses, Valid From/Until, Min/Max amounts) ✅
- [x] Code/Type/Value fields are NOT present in edit dialog (not editable) ✅
- [x] Change Max Uses to 10 → Save → toast "Discount code updated" ✅
- [x] **DB:** `SELECT max_uses FROM tbl_discount_codes WHERE code='TESTADMIN99'` → 10 ✅

### Deactivate Code
- [x] Click "Deactivate" on TESTADMIN99 → badge changes to Inactive, toast "Code deactivated" ✅
- [x] **DB:** `SELECT is_active FROM tbl_discount_codes WHERE code='TESTADMIN99'` → 0 ✅

### Activate Code
- [x] Click "Activate" on TESTADMIN99 → badge changes to Active, toast "Code activated" ✅
- [x] **DB:** `SELECT is_active FROM tbl_discount_codes WHERE code='TESTADMIN99'` → 1 ✅

### Usage History
- [x] Click "Usage" on code with 0 usage → ~~**BUG:** Crashes with "T.map is not a function"~~ **FIXED in Phase 9** ✅

### BUGS FOUND & FIXED (Phase 9)
- ~~**Uses column shows "undefined / 10":** current_uses displays as "undefined" instead of 0~~ → **Fixed:** Now shows "0 / 10" with `current_uses ?? 0` guard ✅
- ~~**Usage dialog crashes:** TypeError: T.map is not a function~~ → **Fixed:** Added `data?.usages || []` guard before `.map()` ✅

### Cleanup
- [x] **DB:** `DELETE FROM tbl_discount_codes WHERE code='TESTADMIN99'` ✅

---

## Cross-Cutting Concerns

### Auth Guard
- [x] Removed admin_token from localStorage → navigated to /admin-new/chefs → redirected to /admin-new/login ✅
- [ ] **DB:** Set api_token to NULL manually → next API call redirects to login (not tested)

### Loading States
- [x] Tables show "Loading..." indicator while fetching (observed on multiple pages) ✅

### Empty States
- [x] Search for gibberish "xyznonexistent123" on Chefs → "No results." shown ✅
- [x] Reviews page with 0 rows → "No results." shown ✅
- [x] Transactions page with 0 rows → "No results." shown ✅

### Toast Notifications
- [x] Verified throughout: success toasts on saves, status changes, creates, edits, activate/deactivate ✅
- [ ] Error toast on API failure (not tested — would require disconnecting backend)

### Responsive Layout
- [ ] Tables horizontally scrollable on small viewport (not tested)
- [ ] Sidebar collapses at breakpoint (not tested)
