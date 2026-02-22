# EAS Build Command

Build and deploy the Taist mobile app. Handles version bumping, building, iOS TestFlight submission, and Android APK Slack posting automatically.

## Usage

The user's argument tells you what to build:

| Argument | Platforms | Profile | iOS Submit | Android Slack Post |
|----------|-----------|---------|------------|-------------------|
| `preview` | iOS + Android | preview | Yes (TestFlight) | Yes (#android-builds) |
| `preview-ios` | iOS only | preview | Yes (TestFlight) | No |
| `preview-android` | Android only | preview | No | Yes (#android-builds) |
| `production` | iOS + Android | production | Yes (App Store) | No |
| `production-ios` | iOS only | production | Yes (App Store) | No |
| `production-android` | Android only | production | No | No |

If no argument is given, default to `preview` (both platforms).

## Steps

### 1. Bump Version Numbers

Read `frontend/app.json` and only bump the platform(s) being built:

- **iOS builds** (preview, preview-ios, production, production-ios): bump `ios.buildNumber` (string) by 1, e.g. `"19"` → `"20"`
- **Android builds** (preview, preview-android, production, production-android): bump `android.versionCode` (integer) by 1, e.g. `150` → `151`
- **Both platforms** (preview, production): bump both

Do NOT change the `version` field (semantic version) — that's bumped manually.

Use the Edit tool to make these changes.

### 2. Commit the Version Bump

```
git add frontend/app.json && git commit -m "Bump iOS buildNumber to {new_buildNumber}"
```
Or for Android: `"Bump Android versionCode to {new_versionCode}"`
Or for both: `"Bump build numbers: iOS {new_buildNumber}, Android {new_versionCode}"`

### 3. Start Builds

Run from the `frontend/` directory. All commands use `--non-interactive` and `--no-wait`.

**For iOS** (when applicable):
```bash
cd frontend && eas build --platform ios --profile {PROFILE} --auto-submit --non-interactive --no-wait
```

**For Android** (when applicable):
```bash
cd frontend && eas build --platform android --profile {PROFILE} --non-interactive --no-wait
```

Where `{PROFILE}` is `preview` or `production` based on the argument.

If building both platforms, run the iOS command first, then the Android command. Do NOT use `--platform all` because we need `--auto-submit` only for iOS.

### 4. Post Android APK to Slack (preview builds only)

Only for `preview` and `preview-android`:

1. Run `scripts/wait-for-eas-build.sh` as a **background task** (Bash with `run_in_background: true`, timeout 600000).
2. Periodically check the background task using `TaskOutput` with `block: true, timeout: 300000` (5-minute block waits) — don't spam checks.
3. When the script outputs `STATUS=FINISHED` and `ARTIFACT_URL=...`:
   - Post to Slack channel `C0A1M8DJ7CK` (#android-builds) using the Slack MCP with this format:

   ```
   *Android Build Ready* :android: (preview)
   *Version:* {APP_VERSION} ({BUILD_VERSION})
   *Commit:* {COMMIT_MSG}
   *Download:* {ARTIFACT_URL}
   cc <@U09MTL5R6CX>
   ```

4. If the build fails (`STATUS=ERRORED` or `STATUS=CANCELED`), post a failure message to Slack instead.

### 5. Report to User

Tell the user:
- What versions were bumped to
- Which builds were started
- For iOS: that auto-submit to TestFlight/App Store is in progress
- For Android preview: that you're watching for the APK and will post to #android-builds

## Important Notes

- EAS CLI path: `eas` (globally installed)
- All builds run from `frontend/` directory
- The `--non-interactive` flag skips all interactive prompts (Apple credentials, team selection, etc.)
- The `--no-wait` flag returns immediately — builds happen on EAS servers
- The `--auto-submit` flag automatically submits iOS builds to TestFlight/App Store when done
- The polling script (`scripts/wait-for-eas-build.sh`) polls every 30 minutes for up to 4 hours
