# Sprint 2 — Extra Work Beyond SOW

**SOW Scope:** 6 deliverables, 20 hours, $2,000
**Audit Period:** Feb 19 – Feb 22, 2026

During Sprint 2 development, the following work was performed beyond the 6 contracted deliverables. All SOW items (TMA-063, TMA-061, TMA-037, TMA-054, TMA-055, TMA-036) have been completed.

---

## Pre-existing Bug Fixes (~8 hrs)

Bugs that existed in the codebase from the prior development team (CodeUpScale). These were NOT introduced by Billy — verified via `git blame` and CodeUpScale's own source repos.

CodeUpScale had three developers on this project:
- **Abdur Rehman** (abdur.rehman@codeupscale.com) — backend, Nov 2024 – May 2025
- **Moeez** (muhammadmoeez@codeupscale.com) — frontend, Jul 2025 – Dec 2025
- **Tufail** (tufail@codeupscale.com) — frontend, Feb – Sep 2025

| # | Description | Impact | Introduced By | Evidence |
|---|-------------|--------|--------------|----------|
| 1 | **Card expiration check typo broke ALL payment intents** — wrote `exp_msuperadminonth` instead of `exp_month`, causing every card to appear expired | Critical — payments broken | **Abdur Rehman**, Nov 27, 2024 (`969025a`, "first commit") | Typo present in CodeUpScale's backend mirror repo. Introduced in the very first commit of the backend. |
| 2 | **Stripe test/live key mismatch** — publishable keys were hardcoded with manual commenting (no environment-based switching), so production builds shipped with the test key | Critical — production payments hitting Stripe test mode | **Moeez**, Jul 10, 2025 (`41854b4`, "components,services,store,reducer,types,utils") | Both `pk_test` and `pk_live` keys committed in plaintext to `constance.ts` with `pk_live` commented out. No env-based switching. |
| 3 | **SafeScreener swallowed validation errors (e.g. phone format)** — background check API returned field-level errors (like invalid phone number format) but users only saw a generic "data formart" [sic] message; also had debug strings ("thiis1") left in production | Medium — chef onboarding errors hidden | **Abdur Rehman**, Nov 27, 2024 (`969025a`, "first commit") + Dec 13, 2024 (`b805fae`, "minor changes" added "thiis1") | "data formart" typo in first commit. Debug string "thiis1" added 2 weeks later. Both by same author. |
| 4 | **Dark/invisible placeholder text on credit card input** — set `backgroundColor` and `textColor` but omitted `placeholderColor`, so placeholder text ("Card number", etc.) was invisible | Medium — UX broken | **Moeez**, Jul 10, 2025 (`41854b4`, "components,services,store,reducer,types,utils") | `styledStripeCardField` created with black bg + black text, no `placeholderColor`. Same commit as #2. |
| 5 | **Silent photo upload failures and broken images** — backend upload code never checked `move_uploaded_file()` return; frontend chef order cards displayed customer photos without prepending the server base URL, showing broken images | Medium — data loss + broken UI | Backend: **Abdur Rehman**, Nov 27, 2024 (`969025a`). Frontend: **Moeez**, Jul 14, 2025 (`977b436`, "chef") | Backend `move_uploaded_file()` with no error checking in first commit. Frontend `chefOrderCard.tsx` missing `getImageURL()` — copy-paste oversight (the home version in the same commit has it correct). |
| 6 | **Tip/review page bouncing** — order detail page polled every 30 seconds unconditionally (even on completed orders), which reset component state and hid the review/tip form mid-use | Medium — UX broken, users couldn't leave reviews | **Moeez**, Sep 9, 2025 (`919cd8f`, "feat: Update to Expo Router navigation and replace CalendarStrip") | Unconditional `setInterval(30000)` with `console.log('interval')` debug statement and `router.back()` navigation. |
| 7 | **Android manifest merger conflict** — included both `expo-notifications` and `@react-native-firebase/messaging`, which both set `default_notification_color`, blocking Android builds | High — Android builds failed | **Moeez**, Jul 9, 2025 (`2fb2c0e`, "Initial commit") | Both packages added in the very first commit of the Expo rewrite. Never resolved — likely never completed a successful Android EAS build. |
| 8 | **Calendar font-scaling overflow** — day containers used fixed `minWidth: 45` and no font scaling protection, so accessibility font scaling caused days to overflow off-screen | Low — accessibility | **Moeez**, Sep 9, 2025 (`919cd8f`, "feat: Update to Expo Router navigation and replace CalendarStrip") | Created `customCalendar.tsx` with `minWidth: 45` and no `maxFontSizeMultiplier`. Same commit as #6. |

---

## Client-Requested UX Changes (~4 hrs)

UX improvements and terminology changes requested by the client during Sprint 2, beyond the 6 SOW deliverables.

| # | Description | Requested By |
|---|-------------|-------------|
| 1 | Style home calendar to match app theme (orange fill, consistent colors) | Client feedback |
| 2 | Investigate and document calendar font-scaling bug | Client report |
| 3 | Auto-scroll to pre-selected time slot on checkout screen | UX improvement |
| 4 | Rename "Select" to "Confirm" on checkout time selection + wrap date pills with scroll indicators | Dayne |
| 5 | Rename "Availability" to "Chef Arrival Time" + add scroll indicators | Dayne |
| 6 | Replace gradient fade scroll indicators with chevron arrows | Follow-up refinement |

---

## Summary

| Item | Hours | Rate | Total |
|------|-------|------|-------|
| SOW (contracted) | 20 hrs | $100/hr | $2,000 |
| Pre-existing bug fixes | ~8 hrs | $100/hr | ~$800 |
| Client-requested UX changes | ~4 hrs | $100/hr | ~$400 |
| **Total extra** | **~12 hrs** | | **~$1,200** |
