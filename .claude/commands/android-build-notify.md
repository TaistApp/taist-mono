# Android Build Notify

Wait for the latest EAS Android build to finish, then post the download link to #android-builds in Slack.

## Instructions

1. Run `scripts/wait-for-eas-build.sh` as a **background task** using Bash with `run_in_background: true`, timeout 600000. The script polls every 30 minutes for up to 4 hours.

2. Tell the user the build ID and that you're watching it. They can go do other things.

3. Periodically check the background task output using `TaskOutput` with `block: true, timeout: 300000` (5-minute block waits). Don't spam checks.

4. When the script finishes (exit code 0 = success):
   - Parse the output for `ARTIFACT_URL=`, `PROFILE=`, `APP_VERSION=`, `BUILD_VERSION=`, and `COMMIT_MSG=`
   - Post to Slack channel `C0A1M8DJ7CK` (#android-builds) with this format:

   ```
   *Android Build Ready* :android: (preview)
   *Version:* {APP_VERSION} ({BUILD_VERSION})
   *Commit:* {COMMIT_MSG}
   *Download:* {ARTIFACT_URL}
   cc <@U09MTL5R6CX>
   ```

5. If the build fails (exit code 1), post to Slack that the build failed with the status.

6. If the user provided a build ID as an argument to this command (e.g. `/android-build-notify abc-123`), pass it to the script. Otherwise the script auto-detects the latest Android build.

## Notes
- Script location: `scripts/wait-for-eas-build.sh`
- Slack channel: `C0A1M8DJ7CK` (#android-builds)
- The script must run from the repo root
- EAS CLI is at: `/Users/williamgroble/.nvm/versions/node/v22.14.0/bin/eas`
