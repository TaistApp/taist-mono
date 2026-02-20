# Maestro App Audit Plan

**Goal:** Systematically explore the entire Taist app on both iOS and Android with Maestro, identify every pain point where Maestro guesses/fails, and produce a concrete list of app changes + Maestro best practices.

## Current State (Already Known)

- **0 `testID` props** in the entire frontend codebase
- **2 `accessibilityLabel` usages** (only in `Container` component)
- **No existing Maestro flow files** (only `test-users.env.yaml`)
- Tab labels are plain `<Text>` with uppercase strings ("HOME", "ORDERS", etc.) — Maestro can tap by text but this is fragile
- Core components (`StyledTextInput`, `StyledButton`, `StyledSwitch`) pass no testIDs to underlying RN elements
- Third-party components (`SelectList`, `@react-native-material/core TextInput`) have unknown Maestro compatibility
- Account screen uses modals (date picker, verification code), dropdowns, and complex forms — all without IDs

## Phase 1: iOS Exploration

Start iOS simulator, log in as each user type, visit every screen, and record what Maestro sees.

### 1a. Login Flow
- Launch app → inspect view hierarchy on login screen
- Identify how Maestro sees: email field, password field, Log In button, Forgot Password, Sign Up link
- Test tapping + typing into each field
- **Record:** Which elements are identifiable by text vs position only?

### 1b. Customer Tabs (login as `maestro+customer1@test.com`)
- **HOME tab** — inspect hierarchy, tap chef cards, navigate to chef detail, add-to-order, checkout
- **ORDERS tab** — inspect, tap order cards, order detail
- **ACCOUNT tab** — inspect all form fields (First Name, Last Name, Birthday, Phone, Address, City, State dropdown, ZIP), test the state SelectList dropdown, test birthday date picker modal, test Save button
- **Record for each screen:** element count, identifiable elements, ambiguous elements

### 1c. Chef Tabs (login as `maestro+chef1@test.com`)
- **HOME tab** — inspect, order cards
- **ORDERS tab** — inspect, order cards, calendar
- **MENU tab** — inspect, menu items, add menu item flow
- **PROFILE tab** — inspect, availability day rows
- **EARNINGS tab** — inspect

### 1d. Common Screens
- Signup flow (multi-step onboarding)
- Forgot password
- Chat/Inbox
- Contact Us
- Privacy/Terms pages

## Phase 2: Android Exploration

Repeat the same exploration on Android emulator. Focus on **differences** from iOS:
- Native date picker behavior (Android uses dialog, iOS uses spinner)
- Keyboard behavior differences
- View hierarchy ID differences (Android uses `resource-id`, iOS uses `accessibilityIdentifier`)
- Tab bar element rendering differences

## Phase 3: Analysis & Recommendations

After both platforms are explored, produce a report with three sections:

### A. Required App Changes (testID additions)
For each screen, list exactly which components need `testID` props and what the IDs should be. Priority:
1. **Navigation elements** (tab bars, back buttons, headers)
2. **Form inputs** (text fields, dropdowns, pickers, toggles)
3. **Action buttons** (Login, Save, Submit, Add to Cart, etc.)
4. **List items** (chef cards, order cards, menu items)
5. **Modals and overlays** (date picker, verification, confirmation dialogs)

### B. Component-Level Fixes
Changes to shared components so testIDs propagate automatically:
- `StyledTextInput` — accept and forward `testID` to underlying `TextInput`
- `StyledButton` — accept and forward `testID` to `TouchableOpacity`
- `StyledSwitch` — accept and forward `testID`
- `Container` — testID on back button, title
- `BottomNavigationItem` — testID on tab touchable areas
- Tab `<Text>` labels — add `testID` matching tab name

### C. Maestro-Specific Workarounds
Things we can't fix in the app or where Maestro just needs specific instructions:
- How to reliably interact with `SelectList` dropdown (may need `tapOn` by coordinates or specific text)
- How to handle iOS spinner date picker vs Android date dialog
- How to dismiss keyboard reliably on each platform
- How to wait for API responses / loading spinners
- Any platform-specific `tapOn` strategies

## Deliverables

1. **`docs/maestro-app-audit-report.md`** — Full findings from the exploration
2. **Prioritized list of `testID` additions** — Organized by screen, with exact prop names following a naming convention like `screen.element` (e.g., `login.emailInput`, `account.saveButton`, `customerHome.chefCard.0`)
3. **PR with app changes** — All testID additions across the codebase
4. **`docs/maestro-conventions.md`** — Maestro-specific patterns and workarounds for this app

## Naming Convention (Proposed)

```
{screen}.{element}              → login.emailInput
{screen}.{element}.{index}      → customerHome.chefCard.0
{screen}.{section}.{element}    → account.address.cityInput
```

## Execution

This is a **document-and-clear** task. Each phase will be a separate context pass:
- Phase 1: iOS exploration (inspect every screen, save findings)
- Phase 2: Android exploration (inspect every screen, note diffs)
- Phase 3: Write report + implement changes

Estimated: ~30 screens across both user types, 2 platforms = ~60 inspections.
