# Maestro Conventions for Taist App

Patterns, workarounds, and best practices for writing Maestro E2E flows against the Taist React Native app.

## testID Naming Convention

```
{screen}.{element}              → login.emailInput
{screen}.{element}.{index}      → customerHome.chefCard.0
{screen}.{section}.{element}    → account.address.cityInput
```

**Screen names:** `landing`, `login`, `signup`, `forgotPassword`, `customerHome`, `chefDetail`, `customerOrders`, `account`, `chefHome`, `chefOrders`, `chefMenu`, `menuWizard`, `chefProfile`, `chefEarnings`, `chatInbox`, `chatDetail`, `drawer`, `onboarding`, `reportIssue`

## Element Identification Strategy

Use this priority order when targeting elements:

1. **`testID`** (via `id:` in Maestro) — Most reliable. Use when available.
2. **`accessibilityText`** (via `tapOn:` text) — Works for buttons, labels, chips. Be aware of trailing spaces.
3. **`hintText`** (placeholder text) — Works for text inputs (e.g., `tapOn: "Enter your email"`).
4. **Coordinate tap** (via `point:`) — Last resort. Fragile across device sizes.

## Login Flow

```yaml
appId: com.taist.app  # Android
# appId: org.taist.taist  # iOS
---
- tapOn: "Enter your email"
- inputText: ${EMAIL}
- tapOn: "Enter your password"
- inputText: ${PASSWORD}
- tapOn: "Log In"
```

**Alternative using testIDs** (more reliable):
```yaml
- tapOn:
    id: "login.emailInput"
- inputText: ${EMAIL}
- tapOn:
    id: "login.passwordInput"
- inputText: ${PASSWORD}
- tapOn:
    id: "login.submitButton"
```

**All login screen testIDs:** `login.emailInput`, `login.passwordInput`, `login.togglePassword`, `login.forgotButton`, `login.submitButton`, `login.signupButton`

**Test user credentials** are in `frontend/.maestro/test-users.env.yaml`.

## Switching Users

The drawer LOGOUT item now has `testID="drawer.logout"`. However, the most reliable way to switch users is still:

```yaml
- clearState: org.taist.taist  # iOS
# - clearState: com.taist.app  # Android
```

This resets the app completely. After `clearState`, you need to reconnect to Metro on iOS (tap the Metro URL in the Expo dev launcher).

## Tab Navigation

Tabs are identifiable by text: `HOME`, `ORDERS`, `ACCOUNT` (customer) or `HOME`, `ORDERS`, `MENU`, `PROFILE`, `EARNINGS` (chef).

```yaml
- tapOn: "ORDERS"       # Switch to ORDERS tab
- tapOn: "HOME"         # Switch to HOME tab
```

**Caveat:** If an error banner overlaps the tab bar, text-based taps may fail. Use coordinate taps as fallback:
```yaml
# Customer tabs (3 tabs, y ≈ 793 on iPhone 16)
- tapOn:
    point: "69,793"     # HOME
- tapOn:
    point: "196,793"    # ORDERS
- tapOn:
    point: "327,793"    # ACCOUNT

# Chef tabs (5 tabs, y ≈ 793 on iPhone 16)
- tapOn:
    point: "69,793"     # HOME
- tapOn:
    point: "117,793"    # ORDERS
- tapOn:
    point: "196,793"    # MENU
- tapOn:
    point: "274,793"    # PROFILE
- tapOn:
    point: "353,793"    # EARNINGS
```

## Drawer Navigation

After the testID fix, drawer items are individually tappable:

```yaml
- tapOn:
    id: "header.hamburgerMenu"    # Open drawer
- tapOn:
    id: "drawer.privacyPolicy"    # Tap specific item
```

Available drawer testIDs:
- `drawer.closeButton`
- `drawer.account`
- `drawer.howToDoIt` (chef only)
- `drawer.cancelApplication` (chef, pending only)
- `drawer.privacyPolicy`
- `drawer.termsAndConditions`
- `drawer.logout`
- `drawer.deleteAccount`

## Header Icons

```yaml
- tapOn:
    id: "header.hamburgerMenu"        # Open drawer
- tapOn:
    id: "header.backButton"           # Go back
- tapOn:
    id: "header.chatButton"           # Open inbox
- tapOn:
    id: "header.notificationsButton"  # Open notifications
- tapOn:
    id: "header.reportIssue"          # Report issue (bug icon)
```

## Report Issue Screen

```yaml
- tapOn:
    id: "reportIssue.subjectInput"      # Subject text input
- tapOn:
    id: "reportIssue.descriptionInput"  # Description text input
- tapOn:
    id: "reportIssue.submitButton"      # Submit button
```

## Trailing Spaces

Many text elements have trailing spaces (e.g., `"REQUESTED "` instead of `"REQUESTED"`). Use fuzzy matching:

```yaml
# This may fail:
- tapOn: "REQUESTED"

# This works:
- tapOn:
    text: "REQUESTED"
    # Maestro's default fuzzy matching handles trailing spaces
```

Or use the `id:` selector when testIDs are available.

## Date Picker

**iOS:** Spinner wheel — use `scroll` on the picker column or `tapOn` specific values.
**Android:** Material dialog — tap the date, then OK/Cancel.

Not yet tested with Maestro. Will need platform-specific flows.

## Keyboard Handling

```yaml
- hideKeyboard          # Dismiss keyboard on both platforms
```

On iOS, you can also tap outside the input field. On Android, the back button dismisses keyboard too.

## Waiting for API Responses

The app has loading spinners during API calls. Use `assertVisible` or `waitFor` to wait:

```yaml
- tapOn: "Log In"
- assertVisible: "HOME"    # Wait until HOME tab appears
```

## Error Banner

A version check API call to the local backend may produce a persistent error banner ("401 Unauthenticated"). This banner:
- Overlaps the tab bar at the bottom of the screen
- Opens a full-screen error view if tapped
- Blocks automation if not dismissed

**Workaround:** Ensure the local backend is running (`cd backend && php artisan serve --host=0.0.0.0 --port=8005`), or add a dismiss step:

```yaml
- tapOn:
    text: "Dismiss"
    optional: true        # Don't fail if banner isn't present
```

## Platform Differences

| Feature | iOS | Android |
|---------|-----|---------|
| App ID | `org.taist.taist` | `com.taist.app` |
| `clearState` target | `org.taist.taist` | `com.taist.app` |
| Back navigation | `header.backButton` testID | `back` command or testID |
| Date picker | Spinner (inline) | Dialog (modal) |
| Keyboard dismiss | `hideKeyboard` | `hideKeyboard` or `back` |

## Common Pitfalls

### Scroll vs Swipe

`scroll` scrolls down — it has **no direction property**. To scroll up or sideways, use `swipe`:

```yaml
# ✅ Correct: scroll down
- scroll

# ✅ Correct: scroll up (swipe finger downward)
- swipe:
    direction: DOWN
    duration: 400

# ✅ Correct: scroll a horizontal row (swipe left)
- swipe:
    start: 90%, 53%
    end: 10%, 53%
    duration: 300

# ❌ WRONG: scroll does not accept direction
- scroll:
    direction: UP
```

### testID Naming

testIDs use **dots**, not dashes or underscores:

```yaml
# ✅ Correct
- tapOn:
    id: "login.emailInput"

# ❌ WRONG
- tapOn:
    id: "login-email-input"
```

### Accessibility Text vs Visible Text

Accessibility text often differs from what you see on screen:
- **Trailing spaces** are common: `"Active C. "` not `"Active C."`
- **Merged children**: Parent accessibility text may concatenate all child texts
- **Date pills** use compound text: `"Mon, 23"` not `"Mon"` or `"23"` separately

**Always run `inspect_view_hierarchy` before writing flows** to see exact text/IDs.

### MCP Tool Params vs YAML Properties

Some parameters exist on the MCP `tap_on` tool but are **not valid in flow YAML**:

```yaml
# ❌ WRONG: use_fuzzy_matching is an MCP param, not YAML
- tapOn:
    text: "Active C."
    use_fuzzy_matching: true

# ✅ Correct: Maestro does fuzzy matching by default with tapOn text
- tapOn: "Active C"
```

### Regex in tapOn

When using `tapOn:` with a string, Maestro treats it as a regex. Dot (`.`) matches any character, which usually works in your favor. But be careful with special characters:

```yaml
# Matches "CHECKOUT - $18.00" (dot matches any char)
- tapOn: "CHECKOUT - .*"

# Matches "ADD TO ORDER - $18.00"
- tapOn: "ADD TO ORDER - .*"
```

## Signup Screen testIDs

Steps 1–2 have testIDs. Steps 3+ (profile, location, preferences) are **missing testIDs** — target by placeholder text for now.

| Step | Element | testID |
|------|---------|--------|
| 1 (type) | Customer button | `signup.customerButton` |
| 1 (type) | Chef button | `signup.chefButton` |
| 2 (credentials) | Email input | `signup.emailInput` |
| 2 (credentials) | Password input | `signup.passwordInput` |
| 2 (credentials) | Continue button | `signup.continueButton` |
| 2 (credentials) | Login link | `signup.loginLink` |
| 3 (customer location) | ZIP input | `signup.location.zipInput` |
| 3 (customer location) | Use location button | `signup.location.useMyLocation` |
| 3 (customer location) | Continue/Back | `signup.location.continueButton` / `.backButton` |
| 3 (customer phone) | Phone input | `signup.profile.phoneInput` |
| 3 (customer phone) | Continue/Back | `signup.profile.continueButton` / `.backButton` |
| 3 (customer phone) | Verify code input | `signup.profile.verifyCodeInput` |
| 3 (customer phone) | Verify/Resend buttons | `signup.profile.verifyButton` / `.resendButton` |
| 3 (chef name) | First/Last name | `signup.chefBasicInfo.firstNameInput` / `.lastNameInput` |
| 3 (chef name) | Continue/Back | `signup.chefBasicInfo.continueButton` / `.backButton` |
| 3 (chef phone) | Phone input | `signup.chefPhone.phoneInput` |
| 3 (chef phone) | Continue/Back | `signup.chefPhone.continueButton` / `.backButton` |
| 3 (chef phone) | Verify code input | `signup.chefPhone.verifyCodeInput` |
| 3 (chef phone) | Verify/Resend buttons | `signup.chefPhone.verifyButton` / `.resendButton` |
| 3 (chef birthday) | Birthday input | `signup.chefBirthday.birthdayInput` |
| 3 (chef birthday) | Continue/Back | `signup.chefBirthday.continueButton` / `.backButton` |
| 3 (chef photo) | Continue/Back | `signup.chefPhoto.continueButton` / `.backButton` |
| 3 (chef location) | Address/City/ZIP | `signup.chefLocation.addressInput` / `.cityInput` / `.zipInput` |
| 3 (chef location) | Use location button | `signup.chefLocation.useMyLocation` |
| 3 (chef location) | Continue/Back | `signup.chefLocation.continueButton` / `.backButton` |
| 3 (preferences) | Push/Location switches | `signup.preferences.pushNotifications` / `.locationServices` |
| 3 (preferences) | Continue/Back | `signup.preferences.continueButton` / `.backButton` |

## Post-Session Retrospective

**After finishing any Maestro work**, do a quick retrospective before releasing the session lock:

1. **Update this file** (`docs/maestro-conventions.md`) if you discovered:
   - New testIDs that aren't documented here
   - Workarounds for elements that behave unexpectedly
   - Patterns that worked better than what's currently documented
   - New screens or flows that should be added

2. **Update `MEMORY.md`** (Maestro sections) if you hit gotchas that would trip up future sessions — syntax mistakes, timing issues, platform quirks.

3. **Flag app improvements** — if you noticed accessibility or testability issues during the session (missing testIDs, merged accessibility text, elements that are hard to target), note them in a comment or TODO so they can be fixed in the app code. Don't silently work around problems that should be fixed at the source.

The goal: each Maestro session should leave the directions better than it found them. Five minutes of documentation saves hours of re-discovery.

## File Organization

```
frontend/.maestro/
├── test-users.env.yaml          # Test user credentials
├── flows/
│   ├── login-customer.yaml      # Login as customer
│   ├── login-chef.yaml          # Login as chef
│   ├── customer-home.yaml       # Customer home tab tests
│   └── ...
└── helpers/
    ├── login.yaml               # Reusable login flow
    └── switch-user.yaml         # Reusable user switch
```
