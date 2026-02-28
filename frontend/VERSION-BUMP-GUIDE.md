# Version Bump Guide

## TL;DR — Just Update `app.json`

```json
// frontend/app.json
{
  "expo": {
    "version": "31.0.0",           // ← bump this
    "ios": {
      "buildNumber": "15"          // ← increment for each TestFlight/App Store submission
    },
    "android": {
      "versionCode": 147           // ← increment for each Play Store/APK build (never reset)
    }
  }
}
```

Then deploy the backend. That's it. The backend reads `app.json` automatically.

---

## How It Works

### Frontend → Backend Version Sync (Automatic)

The backend's `php artisan version:sync` command reads the version directly from `frontend/app.json` at deploy time. This runs automatically on every Railway deploy via the Procfile. No manual database updates, no env vars, no second config file.

```
frontend/app.json  →  version:sync reads it on deploy  →  writes to `versions` DB table
                                                                    ↓
                                              App calls GET /mapi/get-version
                                                                    ↓
                                              Compares against app.json version → match
```

### Native Files (iOS plist, Android gradle)

EAS Build runs `expo prebuild` before building, which regenerates native files from `app.json`. So the checked-in `Info.plist` and `build.gradle` values are overwritten at build time.

**However**, keeping them in sync locally avoids confusion during local development. After bumping `app.json`, run:

```bash
cd frontend && npx expo prebuild
```

This updates:
- `ios/Taist/Info.plist` → `CFBundleShortVersionString` and `CFBundleVersion`
- `ios/Taist.xcodeproj/project.pbxproj` → `MARKETING_VERSION`
- `android/app/build.gradle` → `versionName` and `versionCode`

---

## Step-by-Step: Bumping a Version

### 1. Update `frontend/app.json`

```bash
# Edit the version, buildNumber, and versionCode
```

**Version number rules:**
- `version`: Semantic versioning — `MAJOR.MINOR.PATCH` (e.g., `31.0.0` → `32.0.0`)
- `buildNumber` (iOS): Increment for each TestFlight/App Store submission. Can reset to "1" for new major versions.
- `versionCode` (Android): Always increment, never reset. Apple and Google both reject builds with duplicate or lower numbers.

### 2. Sync native files (optional but recommended)

```bash
cd frontend && npx expo prebuild
```

### 3. Commit and push

```bash
git add frontend/app.json frontend/ios frontend/android
git commit -m "Bump version to X.X.X"
git push origin staging
```

### 4. Deploy backend

Push to `staging` (auto-deploys to Railway staging) or `main` (auto-deploys to Railway production). The Procfile runs `version:sync` which reads the new version from `app.json` and writes it to the database.

### 5. Build the app

```bash
cd frontend

# Staging (TestFlight + APK)
npx eas-cli build --platform ios --profile preview --auto-submit
npx eas-cli build --platform android --profile preview

# Production (App Store + Play Store)
npx eas-cli build --platform ios --profile production --auto-submit
npx eas-cli build --platform android --profile production
```

---

## What You Do NOT Need To Do

These used to be required but are now automated:

- ~~Update `backend/config/version.php`~~ — fallback only, not used in normal flow
- ~~Set `APP_VERSION` env var on Railway~~ — version:sync reads app.json directly
- ~~Run SQL UPDATE on the versions table~~ — version:sync handles this on deploy
- ~~Update native files manually~~ — `expo prebuild` or EAS handles this

---

## Version Check Behavior by Environment

| Environment | Version check? | What happens on mismatch? |
|-------------|---------------|---------------------------|
| `local` | Skipped | App goes straight to login |
| `staging` | Skipped | App goes straight to login |
| `production` | Active | "Update Required" alert, links to App Store/Play Store |

Staging builds skip the version check because testers receive builds directly via TestFlight/APK — the "go to App Store" prompt can never help them.

---

## Troubleshooting

### "Update Required" on production

**Cause:** The `versions` table in the production database has an older version than the app.

**Fix:** Deploy the backend (which runs `version:sync` and updates the DB). If you need an immediate fix without a deploy, set the Railway env var:
```bash
railway variables set APP_VERSION=X.X.X --service taist-mono --environment production
```
Then trigger a redeploy.

### Version shows wrong in TestFlight/Play Store

**Cause:** Native files weren't synced before the EAS build.

**Fix:** EAS should handle this automatically via prebuild, but if not:
```bash
cd frontend && npx expo prebuild
# Commit the updated native files
# Rebuild with EAS
```

### How to check current database version

```sql
SELECT * FROM versions WHERE id = 1;
```

Or hit the API directly:
```bash
curl https://api.taist.app/mapi/get-version
curl https://api-staging.taist.app/mapi/get-version
```

---

## Architecture Notes

### Current: Exact Match (good for now)

The app blocks if the API version doesn't exactly equal the app version. This works because we have a small user base and distribute builds directly.

### Future: Minimum Supported Version (when we go public)

When the app is in the public App Store with users updating on their own schedules, we'll need to switch to a minimum version floor. See `docs/sprint2-tester-issues-analysis.md` for the full roadmap on that transition.

---

**Last Updated:** February 21, 2026
**Current Version:** 31.0.0
