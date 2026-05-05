# Version Bump Guide

## TL;DR

Bumping the app version and forcing users to update are now **two separate actions**:

1. **Bump app version** → update `app.json` (version, buildNumber, versionCode), commit, build
2. **Force users to update** → change `MIN_VERSION` in Railway env vars (only after new version is live on App Store)

---

## How It Works

### App Version vs Minimum Version

| What | Where | When to change |
|------|-------|---------------|
| App version | `frontend/app.json` | When building a new release |
| Minimum required version | `MIN_VERSION` Railway env var | Only after new version is live on App Store/Play Store |

The backend's `php artisan version:sync` runs on every deploy and reads `MIN_VERSION` from Railway's environment variables. It writes that value to the `versions` DB table. The app calls `GET /mapi/get-version` on launch and compares it against its own version.

```
MIN_VERSION (Railway env var)
        ↓
  version:sync (on deploy)
        ↓
  versions DB table
        ↓
  App calls GET /mapi/get-version on launch
        ↓
  Compares against Constants.expoConfig.version
        ↓
  Shows "Update Required" if app version < MIN_VERSION
```

---

## Step-by-Step: Releasing a New Version

### 1. Update `frontend/app.json`

```json
{
  "expo": {
    "version": "33.0.0",      // ← bump this
    "ios": {
      "buildNumber": "24"      // ← increment for each App Store submission
    },
    "android": {
      "versionCode": 154       // ← always increment, never reset
    }
  }
}
```

**Version number rules:**
- `version`: Semantic versioning — `MAJOR.MINOR.PATCH` (e.g., `32.0.0` → `33.0.0`)
- `buildNumber` (iOS): Increment for each TestFlight/App Store submission
- `versionCode` (Android): Always increment, never reset

### 2. Commit and push

```bash
git add frontend/app.json
git commit -m "Bump version to X.X.X"
git push origin main
```

### 3. Build and submit

```bash
cd frontend

# Production (App Store + Play Store)
npx eas-cli build --platform ios --profile production --auto-submit
npx eas-cli build --platform android --profile production
```

### 4. Wait for App Store approval

Do NOT change `MIN_VERSION` until the new version is approved and live.

### 5. Force users to update (optional)

Only do this if you want to block users on older versions. In Railway:
- Go to **Taist project → taist-mono service → Variables**
- Update `MIN_VERSION` to the new version (e.g., `33.0.0`)
- Railway redeploys automatically → `version:sync` writes the new minimum to DB

---

## What You Do NOT Need To Do

- ~~Update `backend/config/version.php`~~ — not used
- ~~Update the versions table manually~~ — `version:sync` handles this
- ~~Update `APP_VERSION` env var~~ — replaced by `MIN_VERSION`

---

## Version Check Behavior by Environment

| Environment | Version check? | What happens on mismatch? |
|-------------|---------------|---------------------------|
| `local` | Skipped | App goes straight to login |
| `staging` | Skipped | App goes straight to login |
| `production` | Active | "Update Required" alert, links to App Store/Play Store |

Staging builds skip the version check because testers receive builds via TestFlight/APK — the "go to App Store" prompt can't help them.

If `Constants.expoConfig.version` is unavailable on launch (rare edge case), the version check is skipped entirely rather than incorrectly blocking the user.

---

## Troubleshooting

### "Update Required" showing incorrectly on production

**Cause:** `MIN_VERSION` in Railway is set higher than the version currently on the App Store.

**Fix:** Lower `MIN_VERSION` in Railway back to the version that's actually live on the App Store. Railway redeploys and the DB is updated automatically.

### How to check current minimum version

```bash
curl https://api.taist.app/mapi/get-version
curl https://api-staging.taist.app/mapi/get-version
```

Or check directly in Railway: **taist-mono service → Variables → MIN_VERSION**

---

## Architecture Notes

The app version (what you're building) and the minimum required version (what users must have) are intentionally decoupled. This prevents the common mistake of bumping the dev version mid-sprint and accidentally blocking all users on the current App Store version.

**Last Updated:** April 19, 2026
**Current App Version:** 32.0.0
**Current MIN_VERSION:** 31.0.0
