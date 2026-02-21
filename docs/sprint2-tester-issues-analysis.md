# Sprint 2 Tester Issues — Analysis & Fix

**Date:** 2026-02-21
**Reported by:** Dayne Arnett (iOS TestFlight), Daryl Arnett (Android APK)
**Status:** Fixed (pending deploy)

---

## What Was Reported

1. **Dayne (iOS TestFlight):** "Throwing me in a loop between downloading STAGING and PROD when trying to test"
2. **Daryl (Android APK):** "Unable to open in Staging. Sits on last page/30 seconds"

---

## Root Cause: Version Mismatch

Both issues were the same bug. The app version is **31.0.0** (in `frontend/app.json`), but the backend was telling the app the current version is **29.0.0**. The app's splash screen compares these, sees a mismatch, and shows an uncancellable "Update Required" alert that permanently blocks the app.

**Why the mismatch happened:** The version lived in two places that had to be manually kept in sync:

| Source | Version | Role |
|--------|---------|------|
| `frontend/app.json` | 31.0.0 | What the app thinks it is |
| `backend/config/version.php` | 29.0.0 (default) | What the backend tells the app it should be |
| Railway `APP_VERSION` env var | **not set** | Would override the default, but was never configured |

The backend default was never updated from 29.0.0 when the frontend was bumped to 31.0.0.

### How each tester experienced it

**Dayne (iOS) — "Loop":** Version check fails → "Update Required" alert → taps OK → sent to the **production** App Store (hardcoded link, not TestFlight) → downloads production app → that also fails the version check → sent back to App Store → loop.

**Daryl (Android) — "Stuck":** Version check fails → "Update Required" alert → taps OK → sent to Play Store (doesn't help for sideloaded APK) → returns to app → permanently stuck on splash screen. The app never calls `setSplash(false)` after the version check fails, so it hangs forever.

---

## What We Fixed

### 1. Single source of truth: `app.json` (structural fix)

**The problem:** Version was duplicated between `frontend/app.json` and `backend/config/version.php`. Forgetting to update one breaks everything.

**The fix:** `php artisan version:sync` (which runs on every deploy via the Procfile) now reads the version directly from `frontend/app.json` instead of `config/version.php`. Since both live in the same monorepo, the file is always available at `../frontend/app.json` relative to the backend root.

**Files changed:**
- `backend/app/Console/Commands/SyncVersion.php` — added `getVersionFromAppJson()` method, reads `app.json` as primary source with fallback to config
- `backend/database/seeds/VersionSeeder.php` — same approach for consistency

**How it works now:**
```
frontend/app.json ("version": "31.0.0")
        ↓
Procfile runs `php artisan version:sync` on every deploy
        ↓
SyncVersion reads ../frontend/app.json directly
        ↓
Writes "31.0.0" to `versions` table
        ↓
App calls GET /mapi/get-version → gets "31.0.0" → matches → no block
```

**Result:** Bump the version in `app.json` and it flows to the backend automatically on next deploy. No second file to update. No env var to remember.

### 2. Immediate hotfix: Railway env vars

Set `APP_VERSION=31.0.0` on both Railway staging and production environments (with `skipDeploys` to avoid triggering a redeploy). This makes the current deployed backend serve the correct version immediately via the `config/version.php` fallback, before the code fix is deployed.

### 3. Staging builds skip version check

Staging/TestFlight builds now skip the version check entirely, same as local development already did. Testers get builds directly (TestFlight/APK), not from app stores, so the "Update Required → go to App Store" flow can never help them — it can only block them.

**File changed:** `frontend/app/screens/common/splash/index.tsx:186`
```typescript
// Before:
if (APP_ENV === 'local') {

// After:
if (APP_ENV === 'local' || APP_ENV === 'staging') {
```

### 4. Synced Info.plist

Updated `frontend/ios/Taist/Info.plist` to match `app.json`:
- `CFBundleShortVersionString`: 30.0.0 → 31.0.0
- `CFBundleVersion`: 11 → 15

Note: EAS builds override plist values from `app.json` at build time, so this was cosmetic for local dev. But keeping them in sync avoids confusion.

---

## Version Bumping Checklist (Going Forward)

When bumping the app version, you now only need to:

1. Update `version` in `frontend/app.json` — this is the single source of truth
2. Update `buildNumber` (iOS) and `versionCode` (Android) in `frontend/app.json`
3. Optionally run `npx expo prebuild` to sync the native `Info.plist` (EAS does this automatically)
4. Deploy the backend — `version:sync` in the Procfile picks up the new version automatically

You do **NOT** need to:
- Update `backend/config/version.php`
- Set `APP_VERSION` on Railway
- Manually update the `versions` database table

---

## Future Roadmap: Minimum Supported Version

The current system uses **exact match** (`!=`) — if the backend version doesn't exactly equal the app version, the app is blocked. This works for now because we have a small, controlled user base and distribute builds directly.

**When to switch to minimum version:** Once the app is in the public App Store with real users who update on different schedules, exact match will break. You can't force everyone to update the same day. At that point, switch to:

- Backend stores a `min_supported_version` (e.g., `"28.0.0"`)
- App compares using semver `>=` instead of `!=`
- Only bump `min_supported_version` when there's a breaking API change, security fix, or feature that requires a new client
- Newer app versions always pass; only genuinely outdated ones get blocked

**What needs to change for that:**
- `versions` table: rename `version` column to `min_version` (or add a new column)
- `SyncVersion.php`: stop auto-syncing from `app.json` — min version is a manual, deliberate decision
- `splash/index.tsx`: change `!=` to semver `<` comparison (use the `semver` npm package)
- Store links: make them environment-aware (staging should never link to production App Store)
- Consider soft prompts ("Update available") vs hard blocks ("Update required") based on severity

**Don't do this yet.** The exact-match + auto-sync approach is simpler and correct for the current stage. Switch when you hit public release.

---

## Files Reference

| File | What it does |
|------|-------------|
| `frontend/app.json:5` | Single source of truth for app version |
| `backend/app/Console/Commands/SyncVersion.php` | Reads app.json, syncs version to DB on every deploy |
| `backend/database/seeds/VersionSeeder.php` | Same logic for seeding |
| `backend/config/version.php` | Fallback only (if app.json not found) |
| `backend/Procfile` | Runs `version:sync` on every Railway deploy |
| `frontend/app/screens/common/splash/index.tsx` | Version check + auto-login on app launch |
| `frontend/app/services/api.ts:89-116` | `GETVERSIONAPICALL` — calls backend version endpoint |
