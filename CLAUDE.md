# CLAUDE.md — Project Guidelines for Claude Code

## Account & Credential Changes

When any account, credential, or ownership detail is changed (Expo, Apple, GitHub, Firebase, etc.), always update **all** of the following files to keep them in sync:

- `docs/TECH-STACK.md` — Accounts & Access table
- `docs/TECH-STACK-OVERVIEW.md` — Key Accounts & Access table
- `frontend/README.md` — EAS Build Setup section and developer onboarding section
- `frontend/DEPLOYMENT.md` — Required Access section and any hardcoded account references
- `frontend/CHANGELOG.md` — If the change is infrastructure-level

## Forcing App Updates (Minimum Version)

To force users to update to a new version:
1. Confirm the new version is **live on the App Store**
2. Go to Railway → taist-mono service → Variables → set `MIN_VERSION` to the new version
3. Railway redeploys automatically — `version:sync` writes it to the DB

**Never raise `MIN_VERSION` before the new version is available on BOTH the App Store AND Google Play.**
The app version in `app.json` and `MIN_VERSION` are intentionally separate — bumping `app.json` during development must never affect users.

See `frontend/VERSION-BUMP-GUIDE.md` for full details.

## MIN_VERSION Reminder Rule

After every production build is submitted to the App Store, always remind Dayne:
> "Once this version is live on the App Store, remember to update `MIN_VERSION` in Railway to X.X.X if you want to force existing users to update."

At the start of any release-related conversation, check the current `MIN_VERSION` by running:
```bash
curl -s https://api.taist.app/mapi/get-version
```
Compare it against the version currently live on the App Store. If they are out of sync (i.e. a newer version is live but `MIN_VERSION` hasn't been raised), flag it to Dayne immediately and keep flagging it until he confirms it has been updated.

## Current Account Ownership

| Service           | Account                   | Owner  |
| ----------------- | ------------------------- | ------ |
| Expo / EAS        | **contact@taist.app**     | Taist — org: `taistapp`. ⚠️ NOT `a.daynearnett@gmail.com` (no access — that's the BluBranch Expo login) |
| App Store Connect | a.daynearnett@gmail.com   | Dayne — Apple Team ID: WXY2PMFQB7 (Apple ID for submission; separate from the Expo org login) |
| Firebase / GCP    | contact@taist.app         | Taist — project: `taist-mobile-app` |
| GitHub            | TaistApp org              | contact@taist.app |
| Google Play       | daryl@taist.org           | Daryl — pending migration to daryl@taist.app |
| Resend            | billygroble (team: TaistApp) | Billy's account — taist.app domain verified |
| Vercel (DNS)      | (check with team)         | Hosts taist.app website + manages DNS |

## Expo Project

- **Org slug:** `taistapp`
- **App slug:** `taist`
- **Project ID:** `db11fb8c-995e-4b39-8fa5-8b426fada4dd`
- **EAS Dashboard:** https://expo.dev/accounts/taistapp/projects/taist

## ⚠️ Expo Account Switching (Taist ↔ BluBranch)

The EAS CLI login is shared across projects on this machine. **Taist builds require the `contact@taist.app` Expo account** (owner of the `taistapp` org). The `a.daynearnett@gmail.com` login is the **BluBranch** account and has **no access** to the Taist project (`db11fb8c-995e-4b39-8fa5-8b426fada4dd`) — builds and `eas build:list` fail with `Entity not authorized`.

**Before every Taist EAS build, check `eas whoami` and switch if needed:**
```bash
eas whoami        # must be contact@taist.app for Taist
eas login         # switch if it shows a.daynearnett@gmail.com (BluBranch)
```
The **Apple ID** prompted during iOS submission is still `a.daynearnett@gmail.com` (Apple Team `WXY2PMFQB7`) — that is correct and separate from the Expo org login.

## Android Production Builds

The Google Play upload-key reset to the EAS key completed **May 21, 2026**. Android production builds now use **EAS remote credentials** (the default) — no local keystore, no `credentialsSource: "local"` in `eas.json`. Just run the normal `eas build --platform android --profile production --auto-submit`.

The active upload key is the `taistapp` org EAS keystore (`Build Credentials KodeuX6pP8`, SHA1 `4A:CC:92:7E…`). Billy's original key (`A5:68…`) is retired. See memory file `android_keystore_info.md` for the full keystore history and the retired-key backups kept in `~/Downloads/`.

## Email & SMS Infrastructure

- **Email:** Resend API via `_sendEmail()` in `MapiController.php` (not Laravel Mail). Env var: `RESEND_API_KEY`.
- **SMS:** Twilio via `TwilioService.php` and `OrderSmsService.php`. Env vars: `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`.
- **Admin order notifications:** New orders send SMS to Dayne and Daryl, and email to `contact@taist.app`.
- **DNS:** `taist.app` domain is on Domain.com but nameservers point to **Vercel**. All DNS changes go in Vercel.
- **Resend account:** Team "TaistApp" (formerly billygroble) on resend.com.

## Local Backend Development

- **PHP 8.2 required** — PHP 8.5 has breaking changes with project dependencies. Use `brew install php@8.2`.
- **No local MySQL** — Use Railway's public proxy (`turntable.proxy.rlwy.net:24657`) for local scripts.
- **`railway run` overrides env vars** — Set DB connection vars directly instead of using `railway run`.
