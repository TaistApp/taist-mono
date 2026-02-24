# Sprint 2 — Extra Work Audit

**Purpose:** Comprehensive accounting of all work performed since the Sprint 2 SOW was signed, broken down by what was in-scope vs. extra.

**SOW Date:** February 13, 2026 (first committed Feb 19)
**Audit Period:** Feb 19 – Feb 22, 2026 (82 commits after initial SOW commit)
**SOW Scope:** 6 deliverables, 20 hours, $2,000

---

## Summary

| Category | Commits | Est. Hours | Description |
|----------|---------|------------|-------------|
| **SOW Work** | 21 | 20 | SOW deliverables + associated bug fixes and dev iteration |
| **Pre-existing Bug Fixes** | 8 | ~8 | Bugs from the prior developer (CodeUpScale) — not Billy's code |
| **Admin Panel Overhaul** | 9 | ~16 | Complete rebuild — Billy's initiative, not in the SOW |
| **Client-Requested UX Changes** | 6 | ~4 | UX improvements the client asked for beyond the SOW |
| **Infra / Tooling / DX** | 29 | — | CI/CD, Maestro, docs, Claude tooling, deploy config, security |
| **Build / Version Bumps** | 9 | — | Version bumps, build number increments, App Store submissions |
| **Total** | **82** | | |
| | | | |
| **SOW contracted** | | **20 hrs** | **$2,000** |
| **Extra billable work** | | **~12 hrs** | **~$1,200 at $100/hr** |

---

## SOW Deliverables

The 6 contracted items and which commits implemented them. The initial SOW commit (`cd9cbab`, Feb 19) contained the bulk of the implementation for TMA-063, TMA-054, TMA-055, and started TMA-037.

### TMA-063 — Weekly Order Reminder Notifications (3 hrs)
**Status: Completed** — implemented in initial SOW commit `cd9cbab`
- `SendWeeklyOrderReminders` artisan command, `WeeklyOrderReminderService`, migration for `weekly_order_reminder_logs` table, unit tests

### TMA-061 — Chef Availability on Current Day (4 hrs)
**Status: Completed** — bundled into TMA-037 since they share availability logic
- Date selector and chef display logic updated in `d16347f`

### TMA-037 — Order Time Blockout Logic (6 hrs)
**Status: Completed**
- `d16347f` (Feb 20) — Full implementation: time blockout, demand signaling, chef detail availability section, tests (`DemandSignalTest`, `TimeslotBlockoutTest`), availability section component, frontend + backend

### TMA-054 — In-App Bug & Issue Reporting (4 hrs)
**Status: Completed** — implemented in initial SOW commit `cd9cbab`
- `ee4c8bd` (Feb 21) — Follow-up: include device brand in support ticket device info

### TMA-055 — SMS Notifications for Chat Messages (2 hrs)
**Status: Completed** — implemented in initial SOW commit `cd9cbab`
- `ChatSmsService`, throttling logic, Twilio integration, unit tests

### TMA-036 — Privacy Policy & Terms of Service Pages (1 hr)
**Status: Completed**
- `f7b84f9` (Feb 19) — Blade views for privacy policy and terms of service pages

---

## Pre-existing Bug Fixes (Prior Developer's Code)

Bugs that existed in the codebase before Billy's work began. These were NOT introduced by Billy's commits — they were written by CodeUpScale developers. **Verified via `git blame` and CodeUpScale's own source repos.**

CodeUpScale team:
- **Abdur Rehman** (abdur.rehman@codeupscale.com) — backend, Nov 2024 – May 2025
- **Moeez** (muhammadmoeez@codeupscale.com) — frontend, Jul 2025 – Dec 2025
- **Tufail** (tufail@codeupscale.com) — frontend, Feb – Sep 2025

| # | Billy's Fix | Date | Description | Introduced By | Origin Commit & Date |
|---|-------------|------|-------------|--------------|---------------------|
| 1 | `5d5f670` | Feb 21 | **Fix typo in card expiration check that broke ALL payment intents** | Abdur Rehman | `969025a`, Nov 27, 2024 ("first commit") |
| 2 | `5bbd61c` | Feb 20 | **Fix Stripe test/live key mismatch for production builds** | Moeez | `41854b4`, Jul 10, 2025 ("components,services,store,reducer,types,utils") |
| 3 | `af48c75` | Feb 22 | **Fix SafeScreener swallowing validation errors (e.g. phone format)** | Abdur Rehman | `969025a`, Nov 27, 2024 + `b805fae`, Dec 13, 2024 ("thiis1" debug added) |
| 4 | `a6bcf09` | Feb 22 | **Fix dark placeholder text on credit card input** | Moeez | `41854b4`, Jul 10, 2025 ("components,services,store,reducer,types,utils") |
| 5 | `6db3f63` | Feb 22 | **Fix silent photo upload failures and broken chef order card images** | Abdur Rehman (backend) + Moeez (frontend) | Backend: `969025a`, Nov 27, 2024. Frontend: `977b436`, Jul 14, 2025 |
| 6 | `83245fa` | Feb 22 | **Fix tip/review page bouncing by stopping polling on completed orders** | Moeez | `919cd8f`, Sep 9, 2025 ("feat: Update to Expo Router navigation") |
| 7 | `ec5739b` | Feb 21 | **Fix Android manifest merger conflict for notification color** | Moeez | `2fb2c0e`, Jul 9, 2025 ("Initial commit") |
| 8 | `60e805c` | Feb 20 | **Fix calendar font-scaling bug** | Moeez | `919cd8f`, Sep 9, 2025 ("feat: Update to Expo Router navigation") |

---

## Admin Panel Overhaul (Billy's Initiative — Not in SOW)

The admin panel was completely rebuilt from the prior developer's legacy Blade-based UI into a modern React SPA with shadcn/ui. **This was NOT in the SOW and was not requested by the client** — Billy identified it as a major usability gap and rebuilt it proactively.

| # | Commit | Date | Description |
|---|--------|------|-------------|
| 1 | `0ce693e` | Feb 20 | Admin panel reorganization — full React SPA rewrite with shadcn/ui |
| 2 | `a2700e2` | Feb 20 | Update test plan for admin panel reorganization |
| 3 | `cfd3317` | Feb 20 | Optimize admin panel load performance with code splitting and caching |
| 4 | `ba7bf9d` | Feb 21 | Add collapsible sidebar to admin panel |
| 5 | `6fd242b` | Feb 21 | Improve admin panel mobile responsiveness |
| 6 | `34951d4` | Feb 21 | Hide Banned status from admin panel UI |
| 7 | `2cd4e2b` | Feb 21 | Rename Menus to Menu Items in admin panel |
| 8 | `6b19549` | Feb 21 | Add Delete User button to admin panel chefs and customers pages |
| 9 | `0e5bc9f` | Feb 21 | Format client timestamp to local time on tickets page |

---

## Client-Requested UX Changes (Not in SOW)

UX improvements and terminology changes that the client requested beyond the 6 SOW deliverables. These were extra requests that came up during Sprint 2.

| # | Commit | Date | Description |
|---|--------|------|-------------|
| 1 | `52e44ad` | Feb 20 | Style home calendar to match app theme: orange fill, AppColors constants |
| 2 | `d7acb11` | Feb 20 | Investigate and document calendar font-scaling bug |
| 3 | `a51fc11` | Feb 21 | Auto-scroll to pre-selected time slot on checkout screen |
| 4 | `a1bceb9` | Feb 22 | Rename "Select" to "Confirm" on checkout time selection (Dayne's request) |
| 5 | `b5d744a` | Feb 22 | Rename "Availability" to "Chef Arrival Time" and add scroll fade indicators |
| 6 | `1b83c1a` | Feb 22 | Replace gradient fade scroll indicators with chevron arrows |

---

## Infra / Tooling / DX (29 commits)

CI/CD, deployment, Maestro testing, documentation, Claude Code tooling, security hardening. **None of this is in the SOW.** This is the operational foundation that makes the app deployable, testable, and maintainable.

### Deployment & Domain Infrastructure (8 commits)
| Commit | Date | Description |
|--------|------|-------------|
| `50e8390` | Feb 19 | Update Railway cutover checklist and switch production URLs to api.taist.app |
| `9183b59` | Feb 19 | Update docs domain references to api.taist.app and add Sprint 2 project docs |
| `9603470` | Feb 21 | Switch to custom domains: api-staging.taist.app and api.taist.app |
| `6dfb6e7` | Feb 21 | Move admin-panel into backend/ for Railway auto-build |
| `2b3f19f` | Feb 21 | Auto-build admin panel on Railway deploy (nixpacks) |
| `7bed684` | Feb 21 | Switch to railpack.json for admin panel auto-build |
| `b75a345` | Feb 21 | Update docs for admin-panel move to backend/ |
| `ff2e99d` | Feb 21 | Rebuild admin panel with client time formatting fix |

### Build System & App Store Compliance (5 commits)
| Commit | Date | Description |
|--------|------|-------------|
| `4928664` | Feb 20 | Clean up Expo CNG: gitignore native folders and update package versions |
| `247fa39` | Feb 20 | Add GoogleService-Info.plist back to git tracking for EAS Build |
| `405eedf` | Feb 20 | Fix GoogleService-Info.plist gitignore exception for EAS Build |
| `a9e66ce` | Feb 21 | Update EAS Build to Xcode 26.2 (iOS 26 SDK) for App Store compliance |
| `9869576` | Feb 21 | Configure EAS Update channels and add expo-updates dependency |

### Security Hardening (2 commits)
| Commit | Date | Description |
|--------|------|-------------|
| `6918ec7` | Feb 20 | Remove exposed Resend API key from checklist doc |
| `6c0e7b4` | Feb 21 | Remove exposed API keys from git, use EAS Secrets instead |

### Production Verification System (1 commit)
| Commit | Date | Description |
|--------|------|-------------|
| `436dc77` | Feb 20 | Add reusable production verification system with auto-cleanup |

### Maestro E2E Testing Infrastructure (3 commits)
| Commit | Date | Description |
|--------|------|-------------|
| `9f94216` | Feb 21 | Add accessible={false} to TouchableOpacity containers for Maestro compatibility |
| `40a70a4` | Feb 21 | Add testIDs to signup steps and document Maestro pitfalls |
| `fda8697` | Feb 22 | Add Maestro session lock protocol for multi-session coordination |

### Claude Code Slash Commands & Tooling (7 commits)
| Commit | Date | Description |
|--------|------|-------------|
| `85a0f83` | Feb 21 | Add /build slash commands for automated EAS builds |
| `e28391d` | Feb 21 | Add /slack-summary slash command for Slack triage and response |
| `7a6bf1f` | Feb 21 | Add changes summary and iOS notifications to build commands |
| `927b21a` | Feb 21 | Update iOS TestFlight ETA to ~15 min in build notifications |
| `8d5d6d9` | Feb 21 | Upload APK file directly to Slack instead of posting link |
| `95e3589` | Feb 22 | Refactor slack-summary skill: remove replies, add parallel subagents |
| `129c13f` | Feb 22 | Update slack summary skill to recognize Billy as the developer |

### Documentation (3 commits)
| Commit | Date | Description |
|--------|------|-------------|
| `f246dc1` | Feb 20 | Update TMA-037 status to completed in sprint2-sow-status.md |
| `9ae43c0` | Feb 21 | Document order timestamp convention and timezone bugfix |
| `a571b24` | Feb 22 | Update docs for Stripe statement descriptor fix |

---

## Build / Version Bumps (9 commits)

Routine version and build number increments for App Store / Play Store submissions. Several build numbers were burned on failed builds.

| Commit | Date | Description |
|--------|------|-------------|
| `e3c8974` | Feb 20 | Bump app version to 30.0.0, reset iOS buildNumber, increment Android versionCode |
| `8baa1da` | Feb 20 | Fix iOS buildNumber to 11 (must globally increase for App Store Connect) |
| `c76e5d4` | Feb 20 | Bump iOS buildNumber to 12 (11 was already uploaded to App Store Connect) |
| `2dfe51e` | Feb 20 | Bump iOS buildNumber to 13 (12 burned on failed build) |
| `22879eb` | Feb 20 | Bump version to 31.0.0 (30.0.0 already approved on App Store), buildNumber 15 |
| `27cbaf3` | Feb 21 | Bump iOS buildNumber to 17 |
| `f02b15e` | Feb 21 | Bump iOS buildNumber to 18 and Android versionCode to 149 |
| `56b39c1` | Feb 21 | Bump build numbers: iOS 19, Android 150 |
| `a248a90` | Feb 22 | Bump build numbers: iOS 20, Android 151 |

---

## The Bottom Line

### What the SOW Covers
6 deliverables across 20 estimated hours for $2,000:
- TMA-063: Weekly Order Reminder Notifications
- TMA-061: Chef Availability on Current Day
- TMA-037: Order Time Blockout Logic
- TMA-054: In-App Bug & Issue Reporting
- TMA-055: SMS Notifications for Chat Messages
- TMA-036: Privacy Policy & Terms of Service Pages

### What Was Actually Delivered Beyond the SOW

**8 pre-existing bug fixes (prior developer's code):** Critical bugs in the codebase from the prior development team (CodeUpScale) that Billy discovered and fixed during Sprint 2. These include:
- A typo (`exp_msuperadminonth`) that **broke ALL payment intents** — every card appeared expired
- Silent photo upload failures (no error checking)
- Stripe test/live key mismatch (hardcoded keys, no environment switching)
- SafeScreener integration with typos and debug strings
- Invisible placeholder text on credit card inputs
- Order detail page that polls indefinitely, bouncing users out of reviews
- Android build failures from conflicting notification packages
- Calendar font-scaling overflow

**Complete admin panel overhaul (9 commits):** Rebuilt from legacy Blade templates into a modern React SPA with shadcn/ui. Includes: performance optimization, mobile responsiveness, collapsible sidebar, delete user functionality, data formatting fixes. **Not in the SOW — Billy built this on his own initiative.**

**Client-requested UX changes (6 commits):** Calendar theming, auto-scroll on checkout, terminology updates per client request ("Select" → "Confirm", "Availability" → "Chef Arrival Time"), scroll indicators. **Not in the SOW — extra requests from the client during Sprint 2.**

**Infrastructure & deployment (29 commits):** Custom domain setup (api.taist.app, api-staging.taist.app), Railway deployment automation, build system configuration, Xcode/iOS 26 SDK compliance, security hardening (removed exposed API keys from git), production verification system, Maestro E2E testing infrastructure, CI/CD build commands, and Slack notification tooling.

**Build management (9 commits):** 10 iOS builds (numbers 11–20) and multiple Android builds submitted across App Store Connect and Play Store, including dealing with burned build numbers from failed builds.

### By the Numbers

| What | Commits | Est. Hours |
|------|---------|------------|
| SOW work (deliverables + iteration) | 21 of 82 (26%) | 20 hrs |
| Extra work beyond SOW | 61 of 82 (74%) | |

| Extra Work Breakdown | Commits | Est. Hours |
|----------------------|---------|------------|
| Pre-existing bugs fixed (not Billy's code) | 8 | ~8 hrs |
| Admin panel overhaul (Billy's initiative) | 9 | ~16 hrs |
| Client-requested UX changes | 6 | ~4 hrs |
| Infra / tooling / DX | 29 | — |
| Build management | 9 | — |
| **Total billable extra** | **14** | **~12 hrs** |

At the SOW rate of $100/hr, the billable extra work (pre-existing bug fixes and client-requested UX changes) represents approximately **$1,200** in additional value delivered beyond the $2,000 contract. The admin panel overhaul (~16 hrs), infra, tooling, and build management are not counted as billable but represent significant additional effort.
