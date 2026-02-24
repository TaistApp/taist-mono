# EAS Build Command

Build and deploy the Taist mobile app. Handles version bumping, building, iOS TestFlight submission, and Slack notifications automatically.

## Usage

The user's argument tells you what to build:

| Argument | Platforms | Profile | iOS Submit | Slack Post |
|----------|-----------|---------|------------|------------|
| `preview` | iOS + Android | preview | Yes (TestFlight) | #android-builds + #ios-builds |
| `preview-ios` | iOS only | preview | Yes (TestFlight) | #ios-builds |
| `preview-android` | Android only | preview | No | #android-builds |
| `production` | iOS + Android | production | Yes (App Store) | No |
| `production-ios` | iOS only | production | Yes (App Store) | No |
| `production-android` | Android only | production | No | No |

If no argument is given, default to `preview` (both platforms).

## Steps

### 1. Gather Changes Summary

Before bumping versions, run this to get the changes that will be in this build:

```bash
git log --oneline --no-merges -20
```

Look at the commits since the last "Bump build numbers" / "Bump iOS buildNumber" / "Bump Android versionCode" commit. Summarize the meaningful changes (skip bump commits, Co-Authored-By lines, etc.) into 3-5 bullet points. Keep each bullet to one short line. This summary will be included in Slack posts.

### 2. Bump Version Numbers

Read `frontend/app.json` and only bump the platform(s) being built:

- **iOS builds** (preview, preview-ios, production, production-ios): bump `ios.buildNumber` (string) by 1, e.g. `"19"` → `"20"`
- **Android builds** (preview, preview-android, production, production-android): bump `android.versionCode` (integer) by 1, e.g. `150` → `151`
- **Both platforms** (preview, production): bump both

Do NOT change the `version` field (semantic version) — that's bumped manually.

Use the Edit tool to make these changes.

### 3. Commit the Version Bump

```
git add frontend/app.json && git commit -m "Bump iOS buildNumber to {new_buildNumber}"
```
Or for Android: `"Bump Android versionCode to {new_versionCode}"`
Or for both: `"Bump build numbers: iOS {new_buildNumber}, Android {new_versionCode}"`

### 4. Start Builds

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

### 5. Poll and Post to Slack (preview builds only)

For each preview platform being built, run `scripts/wait-for-eas-build.sh` as a **background task** (Bash with `run_in_background: true`, timeout 600000).

**Android preview** (`preview` or `preview-android`):
```bash
./scripts/wait-for-eas-build.sh --platform android
```
When finished:
1. Download the APK: `curl -L -o /tmp/taist-android.apk {ARTIFACT_URL}`
2. Upload to Slack with message using the upload script:
```bash
./scripts/slack-upload.sh /tmp/taist-android.apk C0A1M8DJ7CK "*Android Build Ready* :android: (preview)\n*Version:* {APP_VERSION} ({BUILD_VERSION})\n\n*What's new:*\n{CHANGES_SUMMARY}\n\ncc <@U09MTL5R6CX>"
```
3. Clean up: `rm /tmp/taist-android.apk`

**iOS preview** (`preview` or `preview-ios`):
```bash
./scripts/wait-for-eas-build.sh --platform ios
```
When finished, post to Slack channel `C0AGB51FJMC` (#ios-builds):
```
*iOS Build Submitted to TestFlight* :apple: (preview)
*Version:* {APP_VERSION} ({BUILD_VERSION})
Should be available in TestFlight in ~15 min.

*What's new:*
{CHANGES_SUMMARY}

cc <@U09N5L0PS7P>
```

**IMPORTANT — Stay active and block-wait for completion:**

After starting both background poll tasks, **immediately** call `TaskOutput` with `block: true, timeout: 300000` (5 min) on the first task. When it returns (completed or timed out), check the second task the same way. Keep cycling through both tasks until both have completed. Do NOT report to the user and go idle — stay in a loop checking until both builds finish.

When a build completes:
1. Parse the output for `STATUS=FINISHED` or `STATUS=ERRORED`/`STATUS=CANCELED`
2. For successful Android: download APK and upload to Slack immediately
3. For successful iOS: post TestFlight message to Slack immediately
4. For failures: post failure message to the respective Slack channel
5. Continue waiting for the other build if it hasn't finished yet

Only after **both** builds are fully handled (Slack posts sent), move to Step 6.

If a build fails (`STATUS=ERRORED` or `STATUS=CANCELED`), post a failure message to the respective Slack channel instead.

### 6. Report to User

Tell the user:
- What versions were bumped to
- Which builds completed (success/failure)
- The changes summary that was posted
- Links to any Slack messages sent

## Important Notes

- EAS CLI path: `eas` (globally installed)
- All builds run from `frontend/` directory
- The `--non-interactive` flag skips all interactive prompts (Apple credentials, team selection, etc.)
- The `--no-wait` flag returns immediately — builds happen on EAS servers
- The `--auto-submit` flag automatically submits iOS builds to TestFlight/App Store when done
- The polling script (`scripts/wait-for-eas-build.sh`) polls every 30 minutes for up to 4 hours
- Slack channels: `C0A1M8DJ7CK` (#android-builds), `C0AGB51FJMC` (#ios-builds)
- Android posts tag Daryl: `<@U09MTL5R6CX>` | iOS posts tag Dayne: `<@U09N5L0PS7P>`
