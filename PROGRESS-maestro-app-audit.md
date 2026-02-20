# PROGRESS: Maestro App Audit

**Task:** Systematically explore the Taist app with Maestro on iOS and Android, identify every pain point, and produce testID additions + Maestro conventions.

**Plan file:** `docs/maestro-app-audit-plan.md`

## IMPORTANT: Update this file after EVERY screen inspection. Do NOT batch findings.

## Simulator Info
- **Device:** iPhone 16 - iOS 18.3 (`BFFBD859-6CA4-4A21-8DD9-7BA35B9478CA`)
- **App installed from:** iPhone 15 Pro bundle (copied)
- **Metro bundler:** localhost:8081 (must be running)
- **Fresh install required:** Expo dev launcher shows on first launch — tap `http://localhost:8081`, then dismiss notification dialog ("Allow"), then dismiss Expo dev tools overlay ("Continue" then "Close")

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1a | iOS: Login flow | DONE |
| 1b | iOS: Customer tabs (Home, Orders, Account) | DONE |
| 1c | iOS: Chef tabs (Home, Orders, Menu, Profile, Earnings) | DONE |
| 1d | iOS: Common screens (Signup, Forgot PW, Chat, Contact, Legal) | DONE |
| 2 | Android: Repeat exploration, note platform diffs | BLOCKED (API 36 incompatible with Maestro 2.1.0) |
| 3a | Write audit report (`docs/maestro-app-audit-report.md`) | DONE |
| 3b | Implement testID additions (PR) | DONE |
| 3c | Write Maestro conventions (`docs/maestro-conventions.md`) | DONE |

## Current State
- **Phase 1 (iOS) COMPLETE** — all screens inspected (1a Login, 1b Customer, 1c Chef, 1d Common)
- **Phase 2 (Android) BLOCKED** — API 36 emulator incompatible with Maestro 2.1.0. Known diffs documented from RN knowledge.
- **Phase 3a DONE** — Audit report: `docs/maestro-app-audit-report.md`
- **Phase 3b DONE** — testID additions in 5 components:
  - `DrawerModal` — `accessible={false}` + `testID` on 8 items (critical fix)
  - `Container` — `testID` on back button, hamburger, chat, notifications icons
  - `StyledSwitch` — accepts `testID` prop, forwards to TouchableOpacity
  - `StyledCheckBox` — accepts `testID` prop, forwards to TouchableOpacity
  - `HeaderWithBack` — `testID` on back button
- **Phase 3c DONE** — Maestro conventions: `docs/maestro-conventions.md`
- **ALL PHASES COMPLETE** (except Phase 2 Android which is blocked on emulator compatibility)

## Global Observations (apply to ALL screens)

1. **Extreme nesting:** 28-42 levels of empty wrapper `<View>` elements before any real content. This is the React Navigation + Expo stack.
2. **Zero testID props** in the entire codebase — confirmed by inspection.
3. **Header icons have NO identifiers:** Hamburger menu, cart, chat, notifications icons — all just `enabled=true` with bounds. Only "Report issue" (shake icon) has accessibilityText.
4. **Tab bar works well:** HOME, ORDERS, ACCOUNT all have `accessibilityText` and `selected=true` state. Maestro CAN tap by text BUT the error banner overlaps the tab bar, requiring coordinate taps (`point: "196,793"` for ORDERS, `point: "327,793"` for ACCOUNT).
5. **Error banner is persistent:** Shows "Error details: { ... 401 Unauthenticated }" — it's the version check API call hitting localhost backend. Clicking it opens a full-screen error view that blocks everything. Must dismiss or avoid.

## Naming Convention
```
{screen}.{element}              → login.emailInput
{screen}.{element}.{index}      → customerHome.chefCard.0
{screen}.{section}.{element}    → account.address.cityInput
```

---

## Findings

### Phase 1a: iOS Login Flow

**Landing Screen** (no user logged in):
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Taist logo | NO | Image only, no text/ID | Needs testID |
| "Login With Email" button | YES | `accessibilityText="Login With Email"` | Works with `tapOn: "Login With Email"` |
| "Signup With Email" button | YES | `accessibilityText="Signup With Email"` | Works with `tapOn: "Signup With Email"` |

**Login Form Screen:**
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| "Welcome back" title | YES | `accessibilityText="Welcome back"` | |
| "Sign in to continue" | YES | `accessibilityText` | |
| Email label | YES | `accessibilityText="Email"` | |
| Email input | YES (fragile) | `hintText="Enter your email"` | Works with `tapOn: "Enter your email"` then `inputText`. NO testID. |
| Password label | YES | `accessibilityText="Password"` | |
| Password input | YES (fragile) | `hintText="Enter your password"` | Same pattern as email |
| Password visibility toggle (eye icon) | NO | No text, no ID | Needs testID |
| "Forgot Password?" link | YES | `accessibilityText="Forgot Password?"` | |
| "Log In" button | YES | `accessibilityText="Log In"` | |
| "or" divider | YES | `accessibilityText="or"` | |
| "Don't have an account?" text | YES | `accessibilityText` | |
| "Sign Up" link | YES | `accessibilityText="Sign Up"` | |

**Login Flow Test Result:** PASS — Full login flow works:
```yaml
- tapOn: "Enter your email"
- inputText: "maestro+customer1@test.com"
- tapOn: "Enter your password"
- inputText: "maestro123"
- tapOn: "Log In"
```
Navigates to customer HOME tab successfully.

### Phase 1b: iOS Customer Tabs

#### HOME Tab
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Hamburger menu icon | NO | No text/ID, bounds [10,74][50,114] | Needs testID. Tap by `point: "30,94"` |
| Cart icon | NO | No text/ID, bounds [215,77][251,110] | Needs testID |
| Chat icon | NO | No text/ID, bounds [255,74][295,114] | Needs testID |
| Notifications icon | NO | No text/ID, bounds [299,74][339,114] | Needs testID |
| Report issue icon | YES | `accessibilityText="Report issue"` | Only header icon with text! |
| ZIP code pill | YES | `accessibilityText="ZIP 60602"` | Dynamic text |
| "Select Date" label | YES | `accessibilityText="Select Date"` | |
| Calendar month nav < | YES | `accessibilityText="<"` | |
| Calendar month nav > | YES | `accessibilityText=">"` | |
| Month/year text | YES | `accessibilityText="February 2026"` | |
| Calendar days | YES | `accessibilityText="SUN, 15"` etc | Past days not enabled |
| Time Preference chips | YES | `accessibilityText="Any Time "` etc | Note trailing space in text! |
| Cuisine Type chips | YES | `accessibilityText="All"`, `"Mexican"` etc | |
| Chef cards | YES | `accessibilityText="Active C. , Maestro test chef..."` | Combined name + bio text. Tap by name works: `tapOn: "Active C."` |

#### Chef Detail Screen (tapped Active C.)
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Chef photo | NO | Image only | |
| Chef name | YES | `accessibilityText="Active C. "` | Trailing space |
| Rating stars (5 individual) | NO | No text on individual stars | Need testIDs |
| Rating count "(0)" | YES | `accessibilityText="(0) "` | |
| Bio text | YES | `accessibilityText="Maestro test chef — active and verified.  "` | |
| "All Chefs are fully insured." | YES | `accessibilityText` | |
| "Availability" label | YES | `accessibilityText="Availability"` | |
| Day selector chips | YES | `accessibilityText="Today, 20"`, `"Sat, 21"` etc | Scrollable horizontal |
| Time slots | YES | `accessibilityText="7:30 pm"`, `"8:00 pm"` etc | Scrollable horizontal |
| Allergy filter label | YES | `accessibilityText="Exclude items with the following:"` | |
| Allergy chips | YES | `accessibilityText="Gluten"`, `"Dairy"` etc | |

#### ORDERS Tab
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Status filter chips | YES | `accessibilityText="REQUESTED "`, `"ACCEPTED "`, `"COMPLETED "`, `"CANCELLED "` | Trailing spaces! |
| Empty state text | YES | `accessibilityText="No requested  orders "` | Double space + trailing space |
| (No orders to inspect further) | — | — | Need to create a test order to see order cards |

#### ACCOUNT Tab
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Photo upload area | YES | `accessibilityText="(Optional) Tap to add photo"` | |
| First Name input | YES | `accessibilityText="First Name (Optional)"` | Material UI TextInput — label is the identifier |
| Last Name input | YES | `accessibilityText="Last Name (Optional)"` | |
| Birthday input | YES | `accessibilityText="Birthday, Birthday (Optional)"` | Duplicated label text! Triggers date picker modal (not yet tested) |
| Phone Number input | YES | `accessibilityText="Phone Number"` | |
| Location autofill icon (➤) | NO | No text/ID, bounds [318,757][358,797] | Needs testID |
| ADDRESS section label | YES | `accessibilityText="ADDRESS (Optional for now)"` | |
| Address input | YES | `accessibilityText="Address (Optional)"` | |
| City input | YES | `accessibilityText="City (Optional)"` | |
| State dropdown (SelectList) | FRAGILE | `accessibilityText="IL"` — only shows CURRENT VALUE, not a label | Needs testID badly. Changes based on selection. |
| ZIP input | YES | `accessibilityText="ZIP"` | |
| Push Notifications label | YES | `accessibilityText="Push Notifications"` | |
| Push Notifications toggle | NO | No text/ID | Needs testID |
| Location Services label | YES | `accessibilityText="Location Services"` | |
| Location Services toggle | NO | No text/ID | Needs testID |
| SAVE button | YES | `accessibilityText="SAVE"` | |

#### Hamburger Menu (Drawer)
**CRITICAL ISSUE:** All menu items render as ONE SINGLE combined accessibilityText element:
`accessibilityText="ACCOUNT, PRIVACY POLICY, TERMS AND CONDITIONS, LOGOUT, DELETE ACCOUNT"`

Individual items CANNOT be tapped by text — Maestro treats them as one element. Must use coordinate taps:
- ACCOUNT: ~y=258
- PRIVACY POLICY: ~y=350
- TERMS AND CONDITIONS: ~y=443
- LOGOUT: ~y=535
- DELETE ACCOUNT: ~y=628

**This is the #1 blocker for Maestro automation.** Each drawer item needs its own testID or accessibilityLabel.

### Phase 1c: iOS Chef Tabs

**Logout/Login flow:** Used `clearState: org.taist.taist` to reset app, then reconnected to Metro and logged in as `maestro+chef1@test.com`. This is more reliable than trying to tap LOGOUT in the drawer (which doesn't work due to combined accessibilityText issue).

**Chef has 5 tabs:** HOME, ORDERS, MENU, PROFILE, EARNINGS (vs customer's 3: HOME, ORDERS, ACCOUNT)

#### Chef HOME Tab
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Hamburger menu | NO | No text/ID | Same as customer |
| "LIVE" indicator | YES | `accessibilityText="LIVE"` | Green dot + text |
| Chat icon | NO | No text/ID | Same as customer |
| Notifications icon | NO | No text/ID | Same as customer |
| Report issue icon | YES | `accessibilityText="Report issue"` | Same as customer |
| Chef profile photo | NO | No text/ID | |
| Chef name "Active C." | YES | `accessibilityText="Active C. "` | Trailing space |
| REQUESTED button | YES | `accessibilityText="REQUESTED "` | Trailing space |
| ACCEPTED button | YES | `accessibilityText="ACCEPTED "` | Trailing space |
| Empty state text | YES | `accessibilityText="No requested  orders "` | Double space + trailing |
| Tab bar (5 tabs) | YES | HOME, ORDERS, MENU, PROFILE, EARNINGS all have `accessibilityText` + `selected` state | Tab bar works same as customer |

**Notable difference from customer:** Header has "LIVE" toggle instead of cart icon. No chat icon visible in hierarchy (element 43 at same position has no text).

#### Chef ORDERS Tab
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Header icons | NO | Same as Chef HOME | Hamburger, chat, notifications — no IDs |
| "LIVE" indicator | YES | `accessibilityText="LIVE"` | Same as HOME |
| Report issue icon | YES | `accessibilityText="Report issue"` | |
| Calendar `<` nav | YES | `accessibilityText="<"` | |
| Calendar `>` nav | YES | `accessibilityText=">"` | |
| Month/year label | YES | `accessibilityText="February 2026"` | Dynamic |
| Day selector chips | YES | `accessibilityText="SUN, 15"`, `"FRI, 20"` etc | Week view, 7 days visible |
| REQUESTED filter | YES | `accessibilityText="REQUESTED "` | Trailing space |
| ACCEPTED filter | YES | `accessibilityText="ACCEPTED "` | Trailing space |
| COMPLETED filter | YES | `accessibilityText="COMPLETED "` | Trailing space |
| CANCELLED filter | YES | `accessibilityText="CANCELLED "` | Trailing space |
| Empty state text | YES | `accessibilityText="No requested  orders"` | Double space, no trailing space |

**Notable difference from customer ORDERS:** Chef ORDERS has a **calendar week view** at the top that customer ORDERS tab does not have. Same 4 status filter chips.

#### Chef MENU Tab
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| AVAILABLE toggle | YES | `accessibilityText="AVAILABLE "` | Trailing space |
| NOT AVAILABLE toggle | YES | `accessibilityText="NOT AVAILABLE "` | Trailing space |
| Menu item cards | YES (combined) | `accessibilityText="Test Burger Combo, Classic burger with fries and a drink. For Maestro testing., Price: $18.00 , Serving size: 1 Person "` | ALL card text combined into one element. Can tap by partial text (e.g. "Test Burger Combo") |
| ADD button | YES | `accessibilityText="ADD "` | Trailing space. At bottom of screen |

**Notable:** Menu item cards combine name + description + price + serving size into a single accessibilityText. Individual fields within a card are NOT separately identifiable. Each card IS tappable as a whole.

**Menu items from Maestro test seeder:** "Test Burger Combo" ($18.00) and "Test Caesar Salad" ($12.00)

#### Edit Menu Item Wizard (8 steps) — tapping a menu card opens this
Consistent across all 8 steps:
- Header: "Edit Menu Item" title (identifiable), back `<` arrow (NO ID), Report issue (identifiable)
- Progress indicator: `●●○○○○○○ 2/8` style (identifiable)
- Continue / Back buttons: identifiable via accessibilityText

| Step | Title | Key Elements | Issues |
|------|-------|-------------|--------|
| 1/8 | What's the name of your dish? | "Menu Item Name" Material TextInput — identifiable by label | Input value not in accessibilityText |
| 2/8 | Describe your menu offering | "AI Generated Description:" label, "Start with This Description" button, "Description" textarea (value in `value` attr), "59/500 characters" counter | All identifiable |
| 3/8 | Categories | Category chips (Mexican, Asian, Vegan, Italian, American, Indian, Mediterranean, BBQ) — all have accessibilityText with trailing spaces. "Request a new Category?" toggle — **toggle has NO ID** | Toggle switch needs testID |
| 4/8 | Allergens | Allergen labels (Gluten, Dairy, Eggs, Peanuts, Tree Nuts, Soy, Fish, Shellfish) — identifiable. **Toggle switches for each allergen have NO text/ID** | 8 toggle switches need testIDs |
| 5/8 | Kitchen Requirements | Appliance cards (Sink, Stove, Oven, Microwave, Charcoal Grill, Gas Grill) — identifiable. Time chips ("2 hr +", "1.5 hr", "1 hr", "45 m", "30 m", "15 m") — identifiable with trailing spaces | All good |
| 6/8 | Serving & Pricing | "Serving Size: 1" label, **slider control has NO text/ID**, "Price Per Item" Material TextInput, price tip text | Slider needs testID |
| 7/8 | Add-ons | Empty state text, "+ ADD-ON" button, "Skip This Step" button — all identifiable | All good |
| 8/8 | Review & Publish | All summary fields identifiable (NAME, DESCRIPTION, etc.). "Display this item on menu?" **toggle has NO ID**. Save/Publish button below fold | Toggle needs testID |

#### Chef PROFILE Tab
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Header title "Profile" | YES | `accessibilityText="Profile"` | |
| Back `<` arrow | NO | No text/ID, bounds [10,74][50,114] | Same pattern as other screens |
| Report issue icon | YES | `accessibilityText="Report issue"` | |
| "Bio" section label | YES | `accessibilityText="Bio"` | |
| "Introduce yourself..." subtitle | YES | `accessibilityText` | |
| "My Bio" TextInput | YES | `accessibilityText="My Bio"` | Material UI TextInput, identifiable by label |
| Clock icon (⏰) | NO | Elements 53-55, no text/ID | Decorative, not critical |
| "Hours Available" label | YES | `accessibilityText="Hours Available"` | |
| Day names (Sun-Sat) | YES | `accessibilityText="Sun"`, `"Mon"` etc | Each day on its own row |
| Day checkboxes | NO | Row containers (elements 61,67,73,...) have no text/ID | Orange checked squares visible but not individually identifiable. Need testIDs |
| Time slot labels | YES | `accessibilityText="9:00 AM"`, `"10:00 PM"` etc | Each start/end time identifiable |
| "to" separator | YES | `accessibilityText="to"` | Between start/end times |
| "Save Changes" button | YES | `accessibilityText="Save Changes"` | |

**Notable:** The availability day rows show checkboxes (orange when enabled) but the checkbox elements themselves have no testID. Tapping a time slot likely opens a time picker (not yet tested). The whole screen scrolls to show all 7 days.

#### Chef EARNINGS Tab
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Header icons | NO | Same as other chef tabs | Hamburger, chat, notifications — no IDs |
| "LIVE" indicator | YES | `accessibilityText="LIVE"` | |
| Month card label | YES | `accessibilityText="Month "` | Trailing space |
| Month amount | YES | `accessibilityText="$0.00 "` | Dynamic, trailing space |
| Month "Items" label | YES | `accessibilityText="Items "` | Trailing space |
| Month items count | YES | `accessibilityText="0"` | |
| Month "Orders" label | YES | `accessibilityText="Orders "` | Trailing space |
| Month orders count | YES | `accessibilityText="0 "` | Trailing space |
| Year card | YES | Same pattern as Month card | All labels + values identifiable |

**Notable:** Simple read-only screen. All elements identifiable via accessibilityText. No interactive elements beyond the header. Month and Year cards are the two main sections. All text has trailing spaces.

### Phase 1d: iOS Common Screens

#### Signup Onboarding Carousel (3 pages)
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Page 1 title | YES | `accessibilityText="Meals are cooked\n at your discretion 24/7! "` | Multiline with trailing space |
| Page 1 subtitle | YES | `accessibilityText` | |
| Page 2 title | YES | `accessibilityText="Not enough time to cook?\nFed up with delivery?"` | |
| Page 3 title | YES | `accessibilityText="No grocery shopping.\nNo cooking. No cleaning."` | |
| "Next" button (pages 1-2) | YES | `accessibilityText="Next"` | |
| "Get Started" button (page 3) | YES | `accessibilityText="Get Started"` | |
| Pagination dots (3) | NO | Elements with no text/ID | Decorative, not critical |
| Illustrations | NO | Image only | Not critical |

#### Role Selection Screen
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| "Have a taist for something?" | YES | `accessibilityText` | |
| "I am a customer" button | YES | `accessibilityText="I am a customer"` | |
| "Looking to bring a new taist?" | YES | `accessibilityText` | |
| "I want to be a chef" button | YES | `accessibilityText="I want to be a chef"` | |

#### Signup Form (Customer — step 1 of multi-step)
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Progress dots (5) | NO | Elements 36-40, no text/ID | 5 steps in signup flow |
| "Sign Up" title | YES | `accessibilityText="Sign Up"` | |
| "Create your account to get started" | YES | `accessibilityText` | |
| "Email" label | YES | `accessibilityText="Email"` | |
| Email input | YES (fragile) | `hintText="Enter your email"`, `resource-id=text-input-outlined` | Same resource-id as password input! |
| "Password" label | YES | `accessibilityText="Password"` | |
| Password input | YES (fragile) | `hintText="Enter your password"`, `resource-id=text-input-outlined` | Same resource-id as email! |
| Password eye icon | PARTIAL | `resource-id=right-icon-adornment`, `accessibilityText="󰈈"` (unicode) | Has resource-id but accessibilityText is a unicode icon char |
| "Continue" button | YES | `accessibilityText="Continue"` | |
| "Already have an account? Log in" | YES | `accessibilityText="Already have an account? Log in"` | Single combined text element |
| "Terms and Conditions" link | YES | `accessibilityText="Terms and Conditions"` | Separate from prefix text |

**Notable:** Signup is a 5-step wizard (5 progress dots). Only step 1 (email/password) inspected — further steps require valid account creation which we skip. Both text inputs share the same `resource-id=text-input-outlined` which is fragile for Maestro targeting.

#### Forgot Password Screen
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| "Forgot Password" title | YES | `accessibilityText="Forgot Password"` | |
| Email input | YES | `hintText="Email "` | Different input style (underline, not Material outline). Trailing space in hint |
| "Request" button | YES | `accessibilityText="Request "` | Trailing space |
| "Login" link | YES | `accessibilityText="Login "` | Trailing space |

**Notable:** Simple single-screen form. All elements identifiable. Uses a different input style (underline) than login/signup (Material outlined).

#### Chat/Inbox Screen
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| "Inbox" title | YES | `accessibilityText="Inbox"` | Header title |
| Back `<` arrow | NO | No text/ID | Same pattern as all sub-screens |
| Chat thread rows | YES (combined) | `accessibilityText="Active (ORDER0000009002) , Maestro E2E Twilio live phone check 9002, Feb 19, 2026 09:10 PM"` | All thread info combined into single element |
| Thread avatar | NO | Image only, no text/ID | Needs testID |

**Notable:** Chat threads combine chef name + order ID + last message + timestamp into a single accessibilityText. Individual fields not separately identifiable. Threads ARE tappable as a whole.

#### Chat Detail Screen (tapped a thread)
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| Chat partner name "Active " | YES | `accessibilityText="Active "` | Trailing space. Shows chef name in header |
| Back `<` arrow | NO | No text/ID, bounds [10,74][50,114] | Same pattern as all screens |
| Message bubble | YES | `accessibilityText="Maestro E2E Twilio live phone check 9002"` | Each message separately identifiable |
| Timestamp "09:10 PM" | YES | `accessibilityText="09:10 PM"` | |
| Message input | YES | `hintText="Message..."` | At bottom of screen |
| Send button | NO | No text/ID, bounds [341,746][381,786] | Needs testID |

**Notable:** Chat messages are individually identifiable by their text content. Scrollable view (2 pages per scroll indicator). Message input identifiable by hint text. Send button has no identifier.

#### Delete Account Confirmation Dialog (from drawer)
| Element | Identifiable? | How | Notes |
|---------|--------------|-----|-------|
| "Delete Account" title | YES | `accessibilityText="Delete Account"` | Native Alert dialog |
| Description text | YES | `accessibilityText` | "Permanently delete your account..." |
| "CANCEL" button | YES | `accessibilityText="CANCEL"` | Works with `tapOn: "CANCEL"` |
| "DELETE" button | YES | `accessibilityText="DELETE"` | Works with `tapOn: "DELETE"` |

**Notable:** Native iOS Alert — all elements identifiable. Triggered by tapping DELETE ACCOUNT in drawer.

#### Drawer Navigation — Deep Analysis
**CRITICAL:** The drawer (`DrawerModal` component at `frontend/app/components/DrawerModal/index.tsx`) renders each item as a separate `TouchableOpacity` with its own `onPress` handler. However, Maestro sees ALL items as one combined `accessibilityText` element: `"ACCOUNT, PRIVACY POLICY, TERMS AND CONDITIONS, LOGOUT, DELETE ACCOUNT"`.

**Tested approaches (all FAIL):**
1. `tapOn` by text (e.g. "PRIVACY POLICY") — matches substring of combined element, taps center of full element → triggers wrong item
2. `tapOn` by point coordinates (e.g. `point: "150,345"`) — appears to route to DELETE ACCOUNT regardless of y position
3. `tapOn` with exact regex matching — "Element not found" (text only exists as part of combined string)

**Root cause:** React Native groups child `<Text>` elements within a `TouchableOpacity` into a single accessibility element. The `drawerTouchable` wrapper (line 164) with `onPress={(e) => e.stopPropagation()}` may also contribute.

**Required fix:** Add `testID` to each `TouchableOpacity` item AND set `accessible={false}` on the `drawerContent` View and/or `drawerTouchable` TouchableOpacity to prevent accessibility grouping.

#### Legal Pages (Privacy Policy & Terms and Conditions)
Both screens use `expo-web-browser` to open an **external Safari browser**:
- Privacy: `${HTML_URL}privacy.html` → opens in Safari, app shows ActivityIndicator
- Terms: `${HTML_URL}terms.html` → same pattern

**Maestro impact:** Cannot inspect or interact with legal page content (it's in Safari, outside app context). Can only verify that the browser opens. When browser is dismissed, app navigates back automatically.

**Source files:**
- `frontend/app/screens/common/privacy/index.tsx`
- `frontend/app/screens/common/terms/index.tsx`

### Phase 2: Android Exploration

**Status:** BLOCKED on emulator compatibility. Maestro 2.1.0 cannot connect to Android API 36 (Medium_Phone_API_36.0 AVD). Error: `Connection refused: localhost/[0:0:0:0:0:0:0:1]:7001` — Maestro's instrumentation driver can't establish gRPC connection. No older system images installed.

**To unblock:** Download API 34 system image and create a new AVD:
```bash
~/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager "system-images;android-34;google_apis;arm64-v8a"
~/Library/Android/sdk/cmdline-tools/latest/bin/avdmanager create avd -n Pixel_API_34 -k "system-images;android-34;google_apis;arm64-v8a" --device pixel_7
```

#### Known Android vs iOS Differences (from React Native/Expo knowledge)

Since this is a React Native app, most UI renders identically. Key platform differences for Maestro:

| Area | iOS | Android | Maestro Impact |
|------|-----|---------|----------------|
| Element IDs | `accessibilityIdentifier` | `resource-id` | `testID` prop maps to both — same fix |
| `accessibilityText` | From `accessibilityLabel` + child Text | From `contentDescription` + child Text | Should behave similarly |
| Date picker | Spinner wheel (inline) | Material dialog (modal) | Different interaction patterns needed |
| Keyboard dismiss | Tap outside or swipe down | Back button or tap outside | Maestro `hideKeyboard` works on both |
| Back navigation | Swipe from left edge / `<` button | Hardware back button + `<` button | Maestro `back` command works on Android |
| Tab bar | `accessibilityText` on tabs | Same via RN | Should be identical |
| Drawer modal | Combined `accessibilityText` (confirmed) | Likely same combined text | Same blocker applies |
| Alert dialogs | Native iOS Alert | Native Android AlertDialog | Both identifiable by text |
| ScrollView | Scroll indicators visible | Scroll indicators may differ | Maestro `scroll` works on both |
| Text rendering | SF Pro font, specific spacing | Roboto font, may differ spacing | Trailing spaces likely same (from JS) |

**Bottom line:** The critical issues found in Phase 1 (zero testIDs, combined drawer element, trailing spaces) are **platform-independent** — they originate in the React Native/JavaScript layer, not native rendering. The fixes (adding `testID`, `accessible={false}`) will apply to both platforms identically.

---

## Key Issues Summary (so far)

### Critical (blocks automation)
1. **Hamburger menu items are one combined element** — can't tap individual items. All 3 tested approaches fail (text match, coordinate tap, regex). Fix: add `testID` to each `TouchableOpacity` + `accessible={false}` on parent containers. Code: `frontend/app/components/DrawerModal/index.tsx`
2. **Header icons have no identifiers** — hamburger, cart, chat, notifications

### High Priority (fragile/unreliable)
3. **State dropdown only shows current value** — no stable identifier
4. **Toggle switches have no identifiers** — Push Notifications, Location Services
5. **Error banner overlaps tab bar** — requires coordinate-based tab switching
6. **Trailing spaces in text** — "REQUESTED " vs "REQUESTED" could break exact matches

### Medium Priority (needs testID for robustness)
7. **Password visibility toggle** — no identifier
8. **Rating stars** — individual stars not identifiable
9. **Location autofill icon** — no identifier
10. **Chef profile photos** — no identifier
11. **Taist logo on landing/login** — no identifier
12. **Allergen toggles in menu wizard (step 4)** — 8 toggles with no IDs
13. **Category request toggle (step 3)** — no ID
14. **Serving size slider (step 6)** — no ID
15. **Display on menu toggle (step 8)** — no ID
16. **Availability day checkboxes (chef PROFILE)** — no IDs
17. **Back `<` arrow on all sub-screens** — no ID (consistent across app)

### Low Priority / Informational
18. **Legal pages open in external Safari** — Maestro can't inspect content, only verify browser opens
19. **Chat send button** — no identifier
20. **Chat thread avatars** — no identifier
21. **Signup progress dots** — no identifiers (5 dots for 5 steps)
22. **Onboarding pagination dots** — no identifiers (3 dots)

### Working Well (no changes needed)
- Tab bar items (HOME, ORDERS, ACCOUNT) — have accessibilityText + selected state
- Login form inputs — identifiable via hintText (placeholder text)
- Material UI TextInputs — identifiable via label text as accessibilityText
- Filter chips (cuisine, time, allergy, order status) — all have accessibilityText
- Calendar days and time slots — have accessibilityText
- Buttons (Log In, SAVE, Login With Email, etc.) — have accessibilityText
- Chat message bubbles — individually identifiable by text content
- Chat thread list items — identifiable by combined text (name + order + message)
- Message input field — identifiable via `hintText="Message..."`
- Delete Account confirmation dialog — all buttons identifiable (native Alert)
