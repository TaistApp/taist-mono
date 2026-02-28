# Admin Panel Reorganization Proposal

## Problem

The current admin panel has 16 sidebar links, each mapping 1:1 to a database table. This was fine as a quick port of the old admin, but it creates issues:

- **Redundant pages:** Chefs and Pendings show the same data with different filters
- **Scattered context:** To understand a single order, you check Orders, Chats, Reviews, and Transactions — 4 separate pages
- **Orphaned detail pages:** Profiles (just a bio field) and Customizations (children of menus) exist as standalone pages when they belong inside their parent
- **Flat navigation:** 16 undifferentiated links makes it hard to find what you need

## Proposed Structure

```
── OVERVIEW ──────────────────
   Dashboard

── PEOPLE ────────────────────
   Chefs        (absorbs Pendings + Profiles)
   Customers

── FOOD ──────────────────────
   Menus        (absorbs Customizations)
   Categories

── ORDERS ────────────────────
   Orders       (detail drawer shows Chats, Reviews, Transactions)
   Earnings

── SUPPORT ───────────────────
   Tickets      (renamed from Contacts)

── MARKETING ─────────────────
   Discount Codes

── SETTINGS ──────────────────
   Service Areas (renamed from Zipcodes)
```

**16 sidebar links → 9 links in 7 sections.**

5 pages removed by inlining their data where it belongs (Pendings, Profiles, Customizations, Chats, Reviews). 1 page moved into Order detail (Transactions).

---

## Change 1: Merge Chefs + Pendings

### Current State
- **Chefs page** (`/chefs`): Shows all 9 chefs (user_type=2) with status badges. Bulk actions: Active, Rejected, Delete Stripe, Export.
- **Pendings page** (`/pendings`): Shows only pending chefs (is_pending=1). Actions: Activate, Reject, Export.

These are the same database table (`tbl_users WHERE user_type=2`) with different filters.

### Proposed
Single **Chefs** page with filter tabs at the top:

```
┌──────────────────────────────────────────────────────┐
│  Chefs                                    [Export]   │
│                                                      │
│  ┌─────┐ ┌─────────┐ ┌──────────┐ ┌─────┐          │
│  │ All │ │Pending(3)│ │Active (5)│ │Other│          │
│  └─────┘ └─────────┘ └──────────┘ └─────┘          │
│                                                      │
│  [Activate] [Reject] [Ban] [Delete Stripe]           │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ☐ │ ID    │ Email │ Name │ Status │ Phone │ ... │ │
│  │ ☐ │ CHF002│ james │ Chen │ Active │ 312.. │ ... │ │
│  │ ☐ │ CHF113│ maest │ Pend │Pending │ 312.. │ ... │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Key changes:**
- Tab filters: All / Pending (count) / Active (count) / Rejected / Banned
- Pending tab shows the same extra context the current Pendings page shows (bio, availability, min order, max distance) — these columns appear when Pending tab is selected
- Action buttons are context-aware: Pending tab shows Activate/Reject. Active tab shows Reject/Ban. Rejected/Banned tab shows Activate.
- Single Export button works on whatever tab/filter is active
- The "Pending (3)" badge makes the pending count visible without needing a separate page

**Pages removed:** `/pendings`
**Routes removed:** None needed — just a tab state on `/chefs`

---

## Change 2: Inline Profiles into Chef Detail Drawer

### Current State
- **Profiles page** (`/profiles`): Table of 6 chef profiles from `tbl_availabilities`. Shows bio, Mon-Sun availability, min order, max distance. Edit button navigates to a page with a single bio textarea.
- **Profile Edit page** (`/profiles/:id/edit`): Just a textarea for bio. That's it.

A standalone page for one textarea field is overkill.

### Proposed
Add a **chef detail drawer** that slides open when you click a chef row or a "View" button. This drawer shows:

```
┌─────────────────────────────────┐
│  ← Chef Detail: James Chen      │
│─────────────────────────────────│
│                                  │
│  Email: james.chef@test.com      │
│  Phone: +13125551002             │
│  Status: ● Active                │
│  Address: 456 N State St, Chicago│
│                                  │
│  ── Profile ──────────────────── │
│  Bio: [editable textarea]        │
│  Award-winning Asian fusion...   │
│                                  │
│  ── Availability ─────────────── │
│  Mon: 11:00-20:00                │
│  Tue: 11:00-20:00                │
│  Wed: 11:00-19:00                │
│  ...                             │
│  Min Order: $30                  │
│  Max Distance: 8 mi              │
│                                  │
│  ── Live Menus ───────────────── │
│  • Kung Pao Chicken              │
│  • Pad Thai                      │
│  • Teriyaki Salmon Bowl          │
│                                  │
│          [Save Bio]              │
└─────────────────────────────────┘
```

**Key changes:**
- Bio is editable directly in the drawer — no separate edit page
- Availability, menus, and contact info are visible in one place
- The drawer gives full context about a chef without leaving the list
- The Profiles table page and Profile Edit page are both eliminated

**Pages removed:** `/profiles`, `/profiles/:id/edit`

---

## Change 3: Inline Customizations into Menu Edit

### Current State
- **Customizations page** (`/customizations`): Table of customization options (Extra Guacamole, etc.) from `tbl_customizations`. Each has a menu_id linking it to a menu item. Edit button navigates to a page with a single name field.
- **Customization Edit** (`/customizations/:id/edit`): Just a name textarea.

Customizations are children of menu items. Browsing them in a flat list without seeing which menu they belong to (beyond a menu_id column) loses context.

### Proposed
Show customizations **inside the Menu Edit page** as a sub-table:

```
┌──────────────────────────────────────────────┐
│  ← Edit Menu: Authentic Chicken Tacos        │
│──────────────────────────────────────────────│
│                                              │
│  Title: [Authentic Chicken Tacos (3 pack)]   │
│  Description: [.....................]         │
│                                              │
│  ── Customizations ───────────────────────── │
│  ┌──────────────────────────────────────┐    │
│  │ Name               │ Price │ Action  │    │
│  │ Extra Guacamole     │ $2.50 │ [Edit] │    │
│  │ Extra Salsa         │ $1.00 │ [Edit] │    │
│  │ No Onions           │ $0.00 │ [Edit] │    │
│  └──────────────────────────────────────┘    │
│                                              │
│                      [Save]                  │
└──────────────────────────────────────────────┘
```

**Key changes:**
- Customizations appear in context, grouped under their parent menu item
- Editing a customization name/price happens inline or in a small dialog — no page navigation
- The standalone Customizations list is removed
- If admins need to audit "all customizations across all menus," they can use Export from the Menus page

**Pages removed:** `/customizations`, `/customizations/:id/edit`

---

## Change 4: Order Detail Drawer (absorbs Chats, Reviews, Transactions)

### Current State
- **Orders page** (`/orders`): Table of orders with status, amounts, customer/chef info.
- **Chats page** (`/chats`): Flat list of all chat messages from `tbl_conversations`.
- **Reviews page** (`/reviews`): Flat list of all reviews from `tbl_reviews`.
- **Transactions page** (`/transactions`): Flat list of all transactions from `tbl_transactions`.

All four are related by `order_id`. To investigate an order issue, you visit 4 pages and manually cross-reference by order ID. Chats/Reviews/Transactions currently have 0-3 rows each — they're mostly empty noise as standalone pages.

### Proposed
Add an **order detail drawer** that opens when you click an order row:

```
┌──────────────────────────────────────┐
│  ← Order Detail: ORDER0009002        │
│──────────────────────────────────────│
│                                      │
│  Status: ● Accepted                  │
│  Order Date: 2026-02-20              │
│  Total: $55.00                       │
│                                      │
│  Customer: Test Customer             │
│            maestro+customer1@test.com│
│  Chef:     Active Chef               │
│            maestro+chef1@test.com    │
│                                      │
│  Menu Item: Test Burger Combo        │
│  Quantity: 2                         │
│                                      │
│  ── Chat ─────────────────────────── │
│  [Customer] 3:10 PM                  │
│  "Maestro E2E Twilio live phone      │
│   check 9002"                        │
│                                      │
│  ── Review ───────────────────────── │
│  No review yet.                      │
│                                      │
│  ── Transaction ──────────────────── │
│  No transactions recorded.           │
│                                      │
│  ── Actions ──────────────────────── │
│  [Cancel Order]                      │
└──────────────────────────────────────┘
```

**Key changes:**
- All order context in one place: details, chat thread, review, payment
- Chat messages shown as a conversation thread (not a flat table row)
- Cancel Order action lives in the detail drawer instead of the table
- The 3 standalone read-only pages (Chats, Reviews, Transactions) are eliminated
- The Orders table itself stays the same — just gains a click-to-expand behavior

**Pages removed:** `/chats`, `/reviews`, `/transactions`

**Note:** If the dataset grows large enough that admins need to browse "all reviews" independently (e.g., for moderation), a Reviews page can be added back later. For now with 0 reviews and 3 chats, standalone pages add no value.

---

## Change 5: Rename Contacts → Tickets

### Current State
The page is called "Contacts" but it shows support tickets from `tbl_tickets` with structured issue context (issue type, platform, device info). "Contacts" implies a contact list or address book.

### Proposed
Rename to **Tickets** (sidebar label, page heading, search placeholder). No functional changes.

---

## Change 6: Rename Zipcodes → Service Areas (under Settings)

### Current State
"Zipcodes" is a standalone sidebar link for a single textarea of comma-separated zip codes.

### Proposed
Move under a **Settings** section in the sidebar. Rename to **Service Areas** — more descriptive of what it controls (the geographic area where the platform operates). No functional changes to the page itself.

This section can grow to include other platform config in the future (platform fee %, notification settings, etc.) without cluttering the sidebar.

---

## Change 7: Sidebar Section Headers

### Current State
16 links in a flat list with no visual grouping.

### Proposed
Add non-clickable section headers to visually group related links:

```
── OVERVIEW ──
   Dashboard

── PEOPLE ──
   Chefs
   Customers

── FOOD ──
   Menus
   Categories

── ORDERS ──
   Orders
   Earnings

── SUPPORT ──
   Tickets

── MARKETING ──
   Discount Codes

── SETTINGS ──
   Service Areas
```

Section headers are:
- Uppercase, smaller font, muted color (e.g., `text-xs text-gray-500 uppercase tracking-wider`)
- Not clickable, not links
- Add `mt-4` spacing above each group for visual separation
- Collapsible sections are **not** needed — 9 links is few enough to show all at once

---

## Summary of Changes

| Current Page | What Happens | Lives Where Now |
|---|---|---|
| Dashboard | **Stays** | Dashboard |
| Chefs | **Stays** (gains tabs) | Chefs |
| Pendings | **Removed** — becomes a tab on Chefs | Chefs → Pending tab |
| Categories | **Stays** | Categories |
| Customers | **Stays** | Customers |
| Orders | **Stays** (gains detail drawer) | Orders |
| Earnings | **Stays** | Earnings |
| Contacts | **Renamed** → Tickets | Tickets |
| Menus | **Stays** (edit page gains customizations) | Menus |
| Customizations | **Removed** — inline in Menu Edit | Menus → Edit → Customizations section |
| Profiles | **Removed** — inline in Chef detail drawer | Chefs → Row click → Detail drawer |
| Chats | **Removed** — inline in Order detail | Orders → Row click → Chat section |
| Reviews | **Removed** — inline in Order detail | Orders → Row click → Review section |
| Transactions | **Removed** — inline in Order detail | Orders → Row click → Transaction section |
| Zipcodes | **Renamed + moved** → Service Areas under Settings | Settings → Service Areas |
| Discount Codes | **Stays** | Discount Codes |

**Net result:** 16 pages → 9 sidebar links. 5 pages removed, 2 renamed, 7 sections added.

---

## What Stays the Same

- All existing API endpoints — no backend changes needed
- DataTable component, column definitions, sorting, pagination, export
- Auth system (login, token, guards)
- Status badges and color scheme
- Toast notifications
- shadcn/ui component library
- All CRUD operations and bulk actions

---

## Implementation Order

These changes are independent and can be done in any order. Suggested priority by impact:

1. **Sidebar section headers** — Smallest change, immediate visual improvement. ~30 min.
2. **Merge Chefs + Pendings** — Biggest user-facing simplification. Remove a whole page, add tabs. ~2-3 hours.
3. **Rename Contacts → Tickets, Zipcodes → Service Areas** — Trivial renames. ~15 min.
4. **Order detail drawer** — Biggest new feature. Removes 3 pages, adds a drawer with chat/review/transaction sections. ~4-5 hours.
5. **Inline Customizations into Menu Edit** — Remove a page, add a sub-table to menu edit. ~2-3 hours.
6. **Chef detail drawer with inline Profile** — Remove Profiles page, add expandable drawer. ~3-4 hours.

Total estimate: ~12-16 hours of implementation work.

---

## Bugs to Fix Along the Way

Found during testing — should be fixed during this reorganization:

1. **Discount Codes — "undefined / N" in Uses column:** `current_uses` displays as "undefined" instead of 0. The API likely returns `null` for `current_uses` and the frontend doesn't handle it.
2. **Discount Codes — Usage dialog crash:** Clicking "Usage" with no history throws `TypeError: T.map is not a function`. The backend `discountCodeUsage` endpoint returns a non-array (likely an object or null) when there's no usage data. Frontend needs `data || []` guard, or backend should always return an array.
