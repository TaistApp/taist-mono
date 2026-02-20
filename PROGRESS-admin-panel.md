# Admin Panel Rewrite — Progress

Plan: `docs/admin-panel-rewrite-plan.md`

## Phase 1: Foundation — COMPLETE ✅

### Backend (new files)
- `backend/app/Http/Controllers/AdminApiV2Controller.php` — login, logout, me
- `backend/routes/admin-api-v2.php` — auth routes under `/admin-api-v2`

### Backend (modified files)
- `backend/app/Providers/RouteServiceProvider.php` — added `mapAdminApiV2Routes()`
- `backend/app/Exceptions/Handler.php` — JSON 401 for API routes
- `backend/routes/web.php` — SPA catch-all for `/admin-new/{any?}`
- `backend/server.php` — handle SPA paths for `artisan serve` (PHP built-in server quirk: directory paths under document root bypass router)

### Frontend (`admin-panel/`)
- Vite + React 18 + TypeScript + Tailwind v4 + shadcn/ui
- `src/lib/api.ts` — Axios with token interceptor
- `src/lib/auth.tsx` — AuthProvider context + localStorage token
- `src/pages/login.tsx` — email/password form
- `src/pages/dashboard.tsx` — placeholder
- `src/components/layout/sidebar.tsx` — 16 nav links
- `src/components/layout/auth-guard.tsx` — redirects to login if unauthenticated
- `src/components/layout/app-shell.tsx` — sidebar + main content
- `src/App.tsx` — router with all placeholder routes
- shadcn components: button, input, card, label, sonner (toast)
- Build output: `backend/public/admin-new/`

### Verified (Playwright)
- ✅ Login form renders
- ✅ Wrong password → error message, no redirect
- ✅ Valid login → redirects to dashboard with sidebar
- ✅ All 16 nav sections in sidebar
- ✅ Hard refresh → stays authenticated
- ✅ Logout → redirects to login
- ✅ Auth guard → /admin-new/chefs while logged out → redirects to login
- ✅ GET /admin-api-v2/me without token → 401 JSON
- ✅ Old admin panel at /admin still works

### Key decisions
- `server.php` serves SPA HTML directly for `/admin-new/*` non-asset paths (PHP built-in server quirk with `artisan serve` — cwd is `public/`, so directory paths don't reach Laravel routes)
- Laravel `web.php` catch-all kept as fallback for production servers (Nginx/Apache)
- Vite base path: `/admin-new/`
- Build target: `../backend/public/admin-new/`

## Phase 2: DataTable + Dashboard + Chefs — COMPLETE ✅

### Backend (modified)
- `backend/app/Http/Controllers/AdminApiV2Controller.php` — added `dashboard()`, `chefs()`
- `backend/routes/admin-api-v2.php` — added GET `/dashboard`, GET `/chefs`

### Frontend (new files)
- `src/components/data-table/data-table.tsx` — reusable DataTable (sorting, global filter, pagination, column visibility, row selection)
- `src/components/data-table/column-header.tsx` — sortable column header with arrow icons
- `src/pages/dashboard.tsx` — 5 stat cards (Total Chefs, Total Customers, Total Orders, Pending Chefs, Monthly Revenue)
- `src/pages/chefs.tsx` — 18-column table with row selection, status badges, bulk actions (Active/Rejected/Delete Stripe), confirm dialog, Excel export
- shadcn components added: table, dialog, badge, checkbox, dropdown-menu
- npm package: `xlsx` for Excel export

### Frontend (modified)
- `src/App.tsx` — imported ChefsPage, replaced placeholder route

### API patterns
- Dashboard: GET `/admin-api-v2/dashboard` → aggregate stats
- Chefs: GET `/admin-api-v2/chefs` → all chefs with availability, overrides, live menus
- Mutations: reuses existing `/adminapi/change_chef_status`, `/adminapi/delete_stripe_accounts`

### Verified (Playwright)
- ✅ Dashboard renders 5 stat cards with real data
- ✅ Chefs table renders all 9 chefs with all columns
- ✅ Status badges show Active (green) / Pending (yellow)
- ✅ Weekly availability displayed per chef
- ✅ Live menus displayed per chef
- ✅ Row selection checkboxes work
- ✅ Toolbar buttons: Active, Rejected, Delete Stripe, Export, Columns
- ✅ TypeScript check passes, build succeeds

## Phase 3: Pendings + Categories + Customers — COMPLETE ✅

### Backend (modified)
- `backend/app/Http/Controllers/AdminApiV2Controller.php` — added `pendings()`, `categories()`, `customers()`
- `backend/routes/admin-api-v2.php` — added GET `/pendings`, GET `/categories`, GET `/customers`

### Frontend (new files)
- `src/pages/pendings.tsx` — 23-column table (Chef ID, email, name, phone, birthday, address, city, state, zip, bio, Mon-Sun availability, min order, max distance, photo, created); Activate/Reject actions; Excel export
- `src/pages/categories.tsx` — Table with filter buttons (Requested w/count badge, Approved, Rejected, All); Approve/Reject actions; CAT0000001 ID format
- `src/pages/customers.tsx` — 15-column table (Customer ID C0000001, email, name, phone, birthday, address, city, state, zip, status badge, lat, lng, created); Active/Rejected/Banned actions; Excel export

### Frontend (modified)
- `src/App.tsx` — imported PendingsPage, CategoriesPage, CustomersPage; replaced placeholder routes

### API patterns
- Pendings: GET `/admin-api-v2/pendings` → pending chefs with availability from `tbl_availabilities` join
- Categories: GET `/admin-api-v2/categories` → all categories with chef email + menu title joins, plus `requested_count`
- Customers: GET `/admin-api-v2/customers` → all user_type=1 with status mapping
- Mutations: reuses existing `/adminapi/change_chef_status`, `/adminapi/change_category_status`

### Verified (Playwright)
- ✅ Pendings: 3 pending chefs rendered with all 23 columns
- ✅ Pendings: availability times show "HH:MM - HH:MM" per day, bio truncated
- ✅ Pendings: Activate/Reject/Export toolbar buttons present
- ✅ Categories: 8 categories rendered with status badges
- ✅ Categories: filter buttons (Requested, Approved, Rejected, All) with count badge
- ✅ Categories: Approve/Reject action buttons present
- ✅ Customers: 6 customers rendered with all 15 columns
- ✅ Customers: Customer ID format C0000001, status badges
- ✅ Customers: Active/Rejected/Banned/Export toolbar buttons present
- ✅ TypeScript check passes, build succeeds

## Phase 4: Orders + Earnings + Contacts — COMPLETE ✅

### Backend (modified)
- `backend/app/Http/Controllers/AdminApiV2Controller.php` — added `orders()`, `earnings()`, `contacts()`
- `backend/routes/admin-api-v2.php` — added GET `/orders`, GET `/earnings`, GET `/contacts`

### Frontend (new files)
- `src/pages/orders.tsx` — 13-column table (Order ID ORDER0000001, customer name+email, chef name+email, menu item, qty, total $, order date, status badge, cancellation details, refund info, review, created); filter buttons (All/Requested/Accepted/Completed/Cancelled); Cancel Order dialog (reason textarea + refund % slider); Excel export
- `src/pages/earnings.tsx` — 9-column table (Chef ID CHEF0000001, email, name, $/month, orders/month, items/month, $/year, orders/year, items/year); currency formatted $1,234.56; numeric sorting; Excel export
- `src/pages/contacts.tsx` — 8-column table (Ticket ID T0000001, email, subject, message truncated, issue context parsed with all device fields, status badge, created); filter buttons (In Review w/count badge, Resolved, All); In Review/Resolved status change actions
- shadcn components added: textarea

### Frontend (modified)
- `src/App.tsx` — imported OrdersPage, EarningsPage, ContactsPage; replaced placeholder routes

### API patterns
- Orders: GET `/admin-api-v2/orders` → all orders with customer/chef/menu/review joins, cancellation columns conditional (Schema::hasColumn check)
- Earnings: GET `/admin-api-v2/earnings` → active chefs with completed order aggregates (monthly=30d, yearly=365d), explicit GROUP BY
- Contacts: GET `/admin-api-v2/contacts` → tickets with server-side message/context parsing (splits at `\n---\nIssue Context:\n` marker)
- Mutations: reuses existing `/adminapi/orders/{id}/cancel`, `/adminapi/change_ticket_status`

### Verified (Playwright)
- ✅ Orders: 5 orders rendered with all 13 columns, ORDER ID format
- ✅ Orders: Status badges (Completed green, Accepted blue, Requested yellow)
- ✅ Orders: Customer/Chef shown as name + email per row
- ✅ Orders: Filter buttons (All/Requested/Accepted/Completed/Cancelled), Cancel Order, Export
- ✅ Earnings: 2 chefs with monthly/yearly earnings, CHEF ID format
- ✅ Earnings: Currency columns formatted as $67.50, $55.00
- ✅ Contacts: 4 tickets with full issue context parsed (Issue Type, Platform, Device, OS, App Version, Build, Environment, Client Time)
- ✅ Contacts: Ticket ID T0000001 format, In Review count badge (4)
- ✅ Contacts: Filter buttons + In Review/Resolved action buttons
- ✅ TypeScript check passes, build succeeds

## Phase 5: Menus + Customizations + Profiles — COMPLETE ✅

### Backend (modified)
- `backend/app/Http/Controllers/AdminApiV2Controller.php` — added `menus()`, `menuShow()`, `menuUpdate()`, `customizations()`, `customizationShow()`, `customizationUpdate()`, `profiles()`, `profileShow()`, `profileUpdate()`
- `backend/routes/admin-api-v2.php` — added 9 routes (GET/PUT for menus, customizations, profiles)
- Added imports: Allergens, Appliances, Menus, Customizations, Availabilities

### Frontend (new files)
- `src/pages/menus.tsx` — 14-column table with Edit button
- `src/pages/menu-edit.tsx` — Edit form (title + description)
- `src/pages/customizations.tsx` — 7-column table with Edit button
- `src/pages/customization-edit.tsx` — Edit form (name)
- `src/pages/profiles.tsx` — 15-column table with Edit button
- `src/pages/profile-edit.tsx` — Edit form (bio)

### Verified
- ✅ API: 12 menus, 8 customizations, 6 profiles returned
- ✅ TypeScript + build passes
- ✅ Menus: 12 menus with all 14 columns, categories/allergens/appliances names mapped, Edit buttons
- ✅ Customizations: 8 items with menu MI IDs, prices, Edit buttons
- ✅ Profiles: 6 chefs with Mon-Sun availability, bio, min order, max distance, Edit buttons

## Phase 6: Chats + Reviews + Transactions — COMPLETE ✅

### Backend (modified)
- `AdminApiV2Controller.php` — added `chats()`, `reviews()`, `transactions()`
- `admin-api-v2.php` — added 3 GET routes

### Frontend (new files)
- `src/pages/chats.tsx` — 6-column read-only table
- `src/pages/reviews.tsx` — 7-column read-only table
- `src/pages/transactions.tsx` — 7-column read-only table

### Verified
- ✅ API: 3 chats returned, reviews/transactions return empty (no test data)
- ✅ TypeScript + build passes
- ✅ Chats: 3 messages with sender/recipient name+email, message text, timestamps
- ✅ Reviews: empty table with correct columns (no test data)
- ✅ Transactions: empty table with correct columns (no test data)

## Phase 7: Zipcodes + Discount Codes — COMPLETE ✅

### Backend (modified)
- `AdminApiV2Controller.php` — added `zipcodes()`, `zipcodesUpdate()`, `discountCodes()`, `discountCodeCreate()`, `discountCodeUpdate()`, `discountCodeDeactivate()`, `discountCodeActivate()`, `discountCodeUsage()`
- `admin-api-v2.php` — added 8 routes (GET/PUT zipcodes, full CRUD + actions for discount codes)
- Created tbl_discount_codes + tbl_discount_code_usage tables locally via SQL

### Frontend (new files)
- `src/pages/zipcodes.tsx` — Textarea form for comma-separated zipcodes, Save button
- `src/pages/discount-codes.tsx` — Full CRUD: DataTable with status badges, Create/Edit dialogs (10 fields: code, description, type select, value, max uses, max/customer, valid from/until, min order amount, max discount amount), Activate/Deactivate toggle, Usage History modal

### App.tsx wiring
- All Phase 5/6/7 pages imported and routed (11 imports, 11 routes including 3 edit routes)
- Removed Placeholder component (no longer needed)

### Verified
- ✅ API: zipcodes returns string, discount-codes returns empty array
- ✅ TypeScript check passes (`npx tsc --noEmit`)
- ✅ Build succeeds (`npm run build`)
- ✅ Zipcodes: textarea pre-filled with 59 zipcodes, Save button
- ✅ Discount Codes: empty table with correct columns, Create Code button opens dialog with all 10 fields (code, description, type select, value, max uses, max/customer, valid from/until, min/max order amounts)

## Phase 8: Polish + Password Change + Route Swap — COMPLETE ✅

### Backend (modified)
- `AdminApiV2Controller.php` — added `changePassword()` (validates current password, hashes new, min 6 chars, confirmed)
- `admin-api-v2.php` — added `POST /change-password`

### Frontend (new files)
- `src/components/layout/change-password-dialog.tsx` — Dialog with current/new/confirm password fields, client-side validation (min 6 chars, match check), server error display
- `src/components/layout/error-boundary.tsx` — React error boundary with "Something went wrong" message + Reload button

### Frontend (modified files)
- `src/components/layout/sidebar.tsx` — Responsive collapsible sidebar: mobile hamburger button (< lg breakpoint) with slide-in drawer + overlay, desktop always-visible sidebar (>= lg); added "Change Password" button + KeyRound icon
- `src/components/layout/app-shell.tsx` — Added mobile top padding (`pt-14 lg:pt-6`) for hamburger button clearance
- `src/App.tsx` — Wrapped entire app in ErrorBoundary, removed stale "Placeholder" comment

### Verified
- ✅ TypeScript check passes, build succeeds (896KB)
- ✅ Password change dialog opens from sidebar, shows all 3 fields
- ✅ Wrong current password → "Current password is incorrect." error
- ✅ Desktop (1280px): sidebar always visible with Change Password + Logout
- ✅ Mobile (375px): sidebar hidden, hamburger "Open menu" button visible
- ✅ Hamburger click → sidebar slides in; nav link click → navigates + closes sidebar
- ✅ Error boundary wraps entire app

### Route swap (separate PR)
- Not yet done — swap `/admin-new` → `/admin` after full QA
- Old Blade panel at `/admin` remains fully functional

## Phase 9: Reorganization (16 → 9 sidebar links) — COMPLETE ✅

Per `docs/admin-panel-reorganization-proposal.md`, consolidated the flat 16-link sidebar into 9 links in 7 sections.

### Changes (all frontend-only, no backend changes)

| Change | What | Files |
|--------|------|-------|
| Sidebar sections | Grouped 9 links into 7 sections (Overview, People, Food, Orders, Support, Marketing, Settings) | `sidebar.tsx` |
| Merge Chefs + Pendings | Tab filters (All/Pending/Active/Rejected/Banned), context-aware actions, pending count badge | `chefs.tsx` (rewrite) |
| Chef detail drawer | Slide-over with profile/availability/menus, editable bio | `chef-detail-drawer.tsx` (new), `chefs.tsx` |
| Order detail drawer | Slide-over with chat/review/transaction/cancellation | `order-detail-drawer.tsx` (new), `orders.tsx` |
| Inline customizations | Sub-table in menu edit with edit dialog | `menu-edit.tsx` |
| Rename Contacts → Tickets | Page + heading rename | `tickets.tsx` (new from contacts.tsx) |
| Rename Zipcodes → Service Areas | Page + heading rename | `service-areas.tsx` (new from zipcodes.tsx) |
| Discount code bugs | Fixed `current_uses` display + usage dialog crash | `discount-codes.tsx` |
| Route cleanup | Removed 7 routes, renamed 2, added 10 redirects for old bookmarks | `App.tsx` |
| Sheet component | shadcn/ui slide-over drawer primitive | `sheet.tsx` (new via shadcn) |
| DataTable row click | Added `onRowClick` prop for drawer integration | `data-table.tsx` |

### Pages removed from sidebar (data moved inline)
- Pendings → Chefs Pending tab
- Profiles / Profile Edit → Chef detail drawer
- Customizations / Customization Edit → Menu Edit sub-table
- Chats → Order detail drawer
- Reviews → Order detail drawer
- Transactions → Order detail drawer

### Verified
- ✅ TypeScript check passes, build succeeds
- ✅ Sidebar: 7 sections, 9 links
- ✅ Chefs: tabs filter correctly, pending tab shows extra columns
- ✅ Chef detail drawer opens on row click with profile/availability/menus
- ✅ Order detail drawer opens on row click with chat/review/transaction
- ✅ Menu edit: customizations sub-table visible, edit dialog works
- ✅ Tickets page loads (renamed from Contacts)
- ✅ Service Areas page loads (renamed from Zipcodes)
- ✅ Old URLs redirect appropriately
- ✅ Discount codes: Uses column shows "0 / N", usage dialog doesn't crash

## Phase 10: Visual Beautification — COMPLETE ✅

5 high-impact visual improvements across the admin panel.

| # | Improvement | Files | Description |
|---|------------|-------|-------------|
| 1 | Dark sidebar | `sidebar.tsx` | Dark charcoal (`bg-gray-900`) background, white text, `white/10` active highlight |
| 2 | Dashboard cards | `dashboard.tsx` | Colored icon circles (violet, blue, emerald, amber) in rounded-lg containers, card shadows |
| 3 | Table polish | `data-table.tsx` | Row hover highlight (`hover:bg-muted/50`), `rounded-lg` border with `shadow-sm` |
| 4 | Login page | `login.tsx` | Dark gradient background (`from-gray-900 via-gray-800`), "Taist" brand header, `shadow-xl` card |
| 5 | Status badges | `chefs.tsx`, `orders.tsx`, `chef-detail-drawer.tsx`, `order-detail-drawer.tsx` | Vibrant filled pills (`bg-emerald-500/15 text-emerald-700`) replacing washed-out outline badges |

### Verified (Playwright)
- ✅ Login: dark gradient background, white "Taist" brand header, shadow card
- ✅ Dashboard: colored icon circles on stat cards, all 5 cards render
- ✅ Sidebar: dark charcoal with white text, highlighted active link
- ✅ Orders: vibrant green/blue/amber status badges
- ✅ Chefs: green Active, amber Pending badges
- ✅ Build passes cleanly

## Summary

All 10 phases complete. Final state: 9-link sidebar in 7 sections, detail drawers for chefs and orders, inline customizations in menu edit, dark themed sidebar, polished login page, vibrant status badges. 20 pages built → consolidated to 11 routed pages (+ 10 redirect routes for backwards compat). Backend: ~900 lines in AdminApiV2Controller with 30+ endpoints. Frontend: React 19 + TypeScript + Vite 7 SPA with TanStack Table/Query, shadcn/ui, responsive layout.
