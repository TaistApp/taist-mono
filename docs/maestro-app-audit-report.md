# Maestro App Audit Report

**Date:** 2026-02-20
**Tested on:** iPhone 16 - iOS 18.3 (Simulator), Maestro 2.1.0
**Android:** BLOCKED — API 36 emulator incompatible with Maestro 2.1.0 (see [Appendix A](#appendix-a-android-notes))

## Executive Summary

The Taist app has **zero `testID` props** across the entire frontend codebase. Despite this, roughly **70% of UI elements are identifiable** via `accessibilityText` (from Text content and Material UI labels). The remaining 30% — primarily icons, toggles, and the navigation drawer — are invisible to Maestro and block reliable E2E automation.

**Two critical blockers** must be fixed before any Maestro flows can be written reliably:
1. The hamburger menu drawer renders all items as a single combined accessibility element — no item can be tapped individually
2. Header icons (hamburger, cart, chat, notifications) have no identifiers on any screen

## Screens Inspected

| Screen | User Type | Elements | Identifiable | Issues |
|--------|-----------|----------|-------------|--------|
| Landing | All | 3 | 2 (67%) | Logo has no ID |
| Login Form | All | 11 | 9 (82%) | Eye icon, no testIDs on inputs |
| Signup Onboarding (3 pages) | All | 8 | 6 (75%) | Pagination dots |
| Role Selection | All | 4 | 4 (100%) | None |
| Signup Form (step 1) | All | 10 | 8 (80%) | Shared resource-id, progress dots |
| Forgot Password | All | 4 | 4 (100%) | Trailing spaces only |
| Customer HOME | Customer | 14 | 10 (71%) | 4 header icons |
| Chef Detail | Customer | 10 | 8 (80%) | Photo, rating stars |
| Customer ORDERS | Customer | 3 | 3 (100%) | Trailing spaces |
| Customer ACCOUNT | Customer | 14 | 10 (71%) | Toggles, dropdown, autofill icon |
| Hamburger Drawer | Both | 5 items | 0 (0%) | **CRITICAL: combined element** |
| Chef HOME | Chef | 10 | 7 (70%) | Header icons |
| Chef ORDERS | Chef | 10 | 8 (80%) | Header icons |
| Chef MENU | Chef | 4 | 4 (100%) | Trailing spaces |
| Edit Menu Wizard (8 steps) | Chef | ~40 | ~32 (80%) | Toggles, slider |
| Chef PROFILE | Chef | 12 | 8 (67%) | Day checkboxes, back arrow |
| Chef EARNINGS | Chef | 10 | 8 (80%) | Header icons |
| Chat/Inbox | Both | 4 | 2 (50%) | Avatars, back arrow |
| Chat Detail | Both | 6 | 4 (67%) | Send button, back arrow |
| Delete Account Dialog | Both | 4 | 4 (100%) | Native Alert |

## Critical Issues

### 1. Drawer Menu Items Are One Combined Element

**Severity:** CRITICAL — Blocks all navigation via drawer (logout, legal pages, account from non-tab context)

**Problem:** The `DrawerModal` component (`frontend/app/components/DrawerModal/index.tsx`) renders 5 separate `TouchableOpacity` items, but Maestro sees them as a single element with combined `accessibilityText`:
```
"ACCOUNT, PRIVACY POLICY, TERMS AND CONDITIONS, LOGOUT, DELETE ACCOUNT"
```

**All 3 interaction approaches fail:**
- Text match: taps center of combined element → triggers wrong item
- Coordinate tap: routes to DELETE ACCOUNT regardless of position
- Regex match: "Element not found" (no individual element exists)

**Root cause:** React Native groups child `<Text>` elements within a parent `TouchableOpacity` (the `drawerTouchable` wrapper) into a single accessibility node.

**Fix:**
```tsx
// On drawerTouchable wrapper (line 164):
<TouchableOpacity accessible={false} ...>

// On drawerContent View (line 174):
<View accessible={false} style={styles.drawerContent}>

// On each item:
<TouchableOpacity testID="drawer.privacyPolicy" onPress={...}>
```

### 2. Header Icons Have No Identifiers

**Severity:** CRITICAL — Affects every screen in the app

**Problem:** Hamburger menu, cart, chat, and notifications icons render as empty `enabled=true` elements with only bounds coordinates. Only "Report issue" has `accessibilityText`.

**Fix:** Add `testID` to each header icon component. These are likely in a shared header/container component.

## High Priority Issues

### 3. Toggle Switches Have No Identifiers
- Customer ACCOUNT: Push Notifications, Location Services (2 toggles)
- Menu Wizard Step 3: Category request toggle (1)
- Menu Wizard Step 4: 8 allergen toggles
- Menu Wizard Step 8: Display on menu toggle (1)
- **Total: 12 toggles across the app with no IDs**

### 4. State Dropdown Shows Only Current Value
The `SelectList` on the ACCOUNT screen renders with `accessibilityText="IL"` — changes with selection. No stable label or testID. Needs `testID="account.stateDropdown"`.

### 5. Trailing Spaces in Text
Many elements have trailing spaces: `"REQUESTED "`, `"Active C. "`, `"ADD "`. These break exact text matching in Maestro. Happens in filter chips, names, buttons, and labels.

**Workaround:** Use `use_fuzzy_matching: true` in Maestro or regex patterns.
**Proper fix:** Trim trailing whitespace in the React Native components.

### 6. Error Banner Overlaps Tab Bar
A persistent error banner ("401 Unauthenticated" from version check API) overlaps the tab bar on all screens when running against localhost. Clicking it opens a full-screen error view.

**Impact:** Tab taps via `accessibilityText` sometimes hit the error banner instead. Requires coordinate-based tab switching.
**Workaround:** Run local backend to avoid 401 errors, or dismiss banner in Maestro flows.

## Medium Priority Issues

| # | Issue | Location | Proposed testID |
|---|-------|----------|----------------|
| 7 | Password visibility toggle | Login, Signup | `login.passwordToggle`, `signup.passwordToggle` |
| 8 | Rating stars | Chef Detail | `chefDetail.star.{0-4}` |
| 9 | Location autofill icon | Account | `account.locationAutofill` |
| 10 | Chef profile photos | Home, Chef Detail | `customerHome.chefCard.{i}.photo` |
| 11 | Taist logo | Landing | `landing.logo` |
| 12 | Allergen toggles (8) | Menu Wizard Step 4 | `menuWizard.allergen.{name}` |
| 13 | Category request toggle | Menu Wizard Step 3 | `menuWizard.categoryRequest` |
| 14 | Serving size slider | Menu Wizard Step 6 | `menuWizard.servingSlider` |
| 15 | Display on menu toggle | Menu Wizard Step 8 | `menuWizard.displayToggle` |
| 16 | Availability checkboxes (7) | Chef Profile | `chefProfile.day.{name}` |
| 17 | Back arrow (all screens) | Container component | `header.backButton` |
| 18 | Chat send button | Chat Detail | `chatDetail.sendButton` |
| 19 | Chat thread avatars | Chat Inbox | `chatInbox.thread.{i}.avatar` |

## What Works Well (No Changes Needed)

These elements are reliably identifiable via `accessibilityText`:
- **Tab bar items** — HOME, ORDERS, ACCOUNT, MENU, PROFILE, EARNINGS (all have `selected` state)
- **Buttons** — Log In, SAVE, Continue, Login With Email, Signup With Email, Next, Get Started
- **Material UI TextInputs** — label text becomes `accessibilityText` (First Name, Last Name, etc.)
- **Login/Signup inputs** — identifiable via `hintText` (placeholder text)
- **Filter chips** — cuisine, time, allergy, order status
- **Calendar elements** — day chips, month navigation, time slots
- **Chat messages** — individually identifiable by text content
- **Native Alert dialogs** — Delete Account CANCEL/DELETE buttons

## Proposed testID Naming Convention

```
{screen}.{element}              → login.emailInput
{screen}.{element}.{index}      → customerHome.chefCard.0
{screen}.{section}.{element}    → account.address.cityInput
```

Screens: `landing`, `login`, `signup`, `forgotPassword`, `customerHome`, `chefDetail`, `customerOrders`, `account`, `chefHome`, `chefOrders`, `chefMenu`, `menuWizard`, `chefProfile`, `chefEarnings`, `chatInbox`, `chatDetail`, `drawer`, `onboarding`

## Component-Level Fixes

These shared components should accept and forward `testID`:

| Component | File | Change |
|-----------|------|--------|
| `DrawerModal` | `frontend/app/components/DrawerModal/index.tsx` | Add `testID` to each item + `accessible={false}` on wrappers |
| `StyledTextInput` | `frontend/app/components/StyledTextInput/` | Forward `testID` to underlying `TextInput` |
| `StyledButton` | `frontend/app/components/StyledButton/` | Forward `testID` to `TouchableOpacity` |
| `StyledSwitch` | `frontend/app/components/StyledSwitch/` | Forward `testID` to `Switch` |
| `Container` (header) | `frontend/app/components/Container/` | Add `testID` to back button, hamburger, icons |
| Tab navigator | `frontend/app/navigation/` | Add `testID` to tab bar items |

## Prioritized Implementation Order

1. **DrawerModal** — unblocks drawer navigation (logout, legal, account switching)
2. **Container/Header icons** — unblocks hamburger menu, cart, chat, notifications
3. **Toggle switches** — unblocks Account settings and Menu wizard
4. **Back arrow** — unblocks sub-screen navigation
5. **Remaining medium-priority items** — progressive improvement

## Appendix A: Android Notes

**Status:** Android exploration blocked. Maestro 2.1.0 cannot connect to Android API 36 (gRPC connection refused on port 7001).

**To unblock:**
```bash
~/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager "system-images;android-34;google_apis;arm64-v8a"
~/Library/Android/sdk/cmdline-tools/latest/bin/avdmanager create avd -n Pixel_API_34 -k "system-images;android-34;google_apis;arm64-v8a" --device pixel_7
```

**Expected differences:** Since this is a React Native app, all issues found on iOS (zero testIDs, combined drawer, trailing spaces) are platform-independent. The `testID` prop maps to `accessibilityIdentifier` on iOS and `resource-id` on Android. The same fixes apply to both platforms. Key Android-specific considerations:
- Date picker renders as Material dialog (vs iOS spinner)
- Hardware back button available (Maestro `back` command)
- Keyboard dismiss via back button
