# Bug Investigation: Chef Menus Not Displaying

**Date:** Feb 16, 2026
**Reported by:** Dayne Arnett
**Affected users:** sgailwaller@gmail.com, daynearnett@yahoo.com (reproduced), potentially all chefs on fresh login

---

## Summary

Chefs are unable to see their menu items. Dayne initially correlated this with chefs moved from Active to Pending status, but the root cause is broader: **the `get_chef_menus` API endpoint returns zero results for every request** due to a NULL parameter bug introduced in a December 2025 refactor. The issue has been masked by Redux Persist (cached menu data survives between app sessions).

---

## Root Cause

### The Regression (commit `37d47c4`, Dec 12, 2025)

The `getChefMenus` method in `MapiController.php` (line 3504) was refactored to fix SQL injection:

**Before (original, commit `8ed0998`):**
```php
$data = app(Menus::class)->whereRaw(
    "user_id = '" . $request->user_id . "' AND FIND_IN_SET('" . $request->allergen . "', 'allergens') = 0"
)->get();
```

**After (current, commit `37d47c4`):**
```php
$data = app(Menus::class)
    ->where('user_id', $request->user_id)
    ->whereRaw('FIND_IN_SET(?, allergens) = 0', [$request->allergen])
    ->get();
```

The refactor correctly fixed SQL injection and the N+1 query problem. But it also changed the behavior of the allergen filter:

- **Original code** had `'allergens'` as a **string literal** (not the column). `FIND_IN_SET('null', 'allergens')` always returned 0, and `0 = 0` was TRUE — so the filter was effectively a no-op and all menus were always returned.
- **Refactored code** correctly references the `allergens` **column**. But when `$request->allergen` is NULL (which it always is — see below), MySQL evaluates `FIND_IN_SET(NULL, allergens)` as `NULL`, and `NULL = 0` is `NULL` (falsy). **Every row is excluded. Zero results.**

### Why allergen is always NULL

The frontend never passes an allergen parameter when fetching chef menus:

- **Login flow** (`api.ts:236`): `GetChefMenusAPI({ user_id: response.data.user.id }, dispatch)` — no allergen
- **Menu screen** (`chef/menu/index.tsx:56`): `GetChefMenusAPI({ user_id: self.id }, dispatch)` — no allergen

Customer-side allergen filtering is done entirely **client-side** in the `ChefDetail` screen — the `allergen` param in `get_chef_menus` was never used by any frontend code. The API docs don't even mention it.

### Why it appeared to work

Redux Persist stores menus in AsyncStorage. On **auto-login**, persisted menus are rehydrated before the API fetch. The `addOrUpdateMenus` reducer merges new data with existing state — an empty API response merges with cached menus, leaving them intact. So chefs who auto-login see their cached menus indefinitely.

On **fresh login** (after logout/reinstall), Redux state is cleared first (`USER_LOGOUT`), then `LoginAPI` fetches menus from the server. The server returns nothing. Menus are empty.

### Why Dayne saw the Active→Pending correlation

When testing pending chefs, Dayne explicitly logged out and back in — triggering a fresh login and exposing the bug. The "working" chefs (josesalvador66, martincandy2014) were likely still auto-logged in with cached data. **Any chef who does a fresh login would have this issue, regardless of pending status.**

---

## Verification

MySQL behavior confirmed:

| Bound Value | `FIND_IN_SET(?, allergens)` | `= 0` | WHERE result |
|---|---|---|---|
| `NULL` (current) | `NULL` | `NULL` (falsy) | Row **excluded** |
| `''` (empty string) | `0` | `TRUE` | Row **included** |
| `'3'` (allergen in list) | position > 0 | `FALSE` | Row **excluded** (correct) |
| `'3'` (allergen not in list) | `0` | `TRUE` | Row **included** (correct) |

Laravel's PDO binding passes PHP `null` as SQL `NULL` (not empty string), confirmed in `vendor/laravel/framework/src/Illuminate/Database/Connection.php:613`.

---

## Fix Plan

### Backend change (one line)

**File:** `backend/app/Http/Controllers/MapiController.php` line 3503-3507

Make the allergen filter conditional — only apply it when the parameter is actually provided:

```php
$query = app(Menus::class)->where('user_id', $request->user_id);

if ($request->allergen) {
    $query->whereRaw('FIND_IN_SET(?, allergens) = 0', [$request->allergen]);
}

$data = $query->get();
```

This is the only change needed. No frontend changes required.

### Why this is safe

- The allergen parameter is **never passed** by any existing frontend code — this filter has never actually worked as intended
- Customer-side allergen filtering already happens client-side in `ChefDetail` screen
- The `get_search_chefs` endpoint (customer-facing) has its own separate filtering and already correctly hides pending chefs via `is_pending => 0`
- Creating/updating menu items (`createMenu`, `updateMenu`) don't use this endpoint and are unaffected

### Regarding pending chef visibility

The existing architecture already handles this correctly:
- **Chef viewing own menu** (`get_chef_menus`): No status check — chef always sees their own items. This is correct.
- **Customer searching chefs** (`get_search_chefs`): Filters `is_pending = 0` and `verified = 1` — pending chefs are hidden from customers. This is correct.

No changes needed for pending chef visibility.

---

## Maestro Verification

Use Maestro to confirm the fix end-to-end on a simulator. The test reproduces the exact failure path: fresh login (no cached data) → chef menu screen should display menu items.

### Prerequisites

- iOS Simulator or Android Emulator running
- App built and installed (`org.taist.taist` on iOS, `com.taist.app` on Android)
- Backend deployed with the fix (or running locally)
- Test data seeded (chef `maria.chef@test.com` with menu items)

### Test flow: `verify-chef-menus-fix.yaml`

```yaml
appId: org.taist.taist
---
# Clear app state to simulate fresh install (no Redux Persist cache)
- clearState

# Launch the app fresh
- launchApp

# Login as test chef
- tapOn: "Enter your email"
- inputText: "maria.chef@test.com"
- tapOn: "Enter your password"
- inputText: "password"
- tapOn: "Log In"

# Wait for login to complete and menu screen to load
- extendedWaitUntil:
    visible: "AVAILABLE"
    timeout: 15000

# Core assertion: menu items should be visible after fresh login
# If the bug is present, this screen would show
# "Display UNLIMITED items on your menu" (empty state) instead
- assertVisible: "Price:"
- assertNotVisible: "Display UNLIMITED items on your menu"

# Verify both tabs work
- tapOn: "NOT AVAILABLE"
- tapOn: "AVAILABLE"
```

### Running the test

```bash
# Single run
maestro test verify-chef-menus-fix.yaml

# With env override for Android
maestro test -e APP_ID=com.taist.app verify-chef-menus-fix.yaml
```

### What to look for

| Result | Meaning |
|---|---|
| `assertVisible: "Price:"` passes | Fix is working — API returned menu items on fresh login |
| `assertNotVisible: "Display UNLIMITED items..."` fails | Bug is still present — API returned zero results, app shows empty state |
| `extendedWaitUntil` times out on "AVAILABLE" | Login failed or navigation issue (unrelated to this bug) |

### Reproducing the bug (before fix)

To confirm the bug exists before deploying, run the same flow against the unfixed backend. Expected: the `assertVisible: "Price:"` step will fail because the menu screen shows the empty state after fresh login.

---

## Impact Assessment

- **Severity:** High — affects all chefs on fresh login (after logout, reinstall, or cache clear)
- **Duration:** Since Dec 12, 2025 (~2 months), masked by client-side caching
- **Blast radius:** All chef accounts. Currently mitigated by Redux Persist for auto-login users.
- **Fix risk:** Low — removing a filter that was never functionally used
- **Deployment:** Backend-only change, no app update needed
