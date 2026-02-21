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
