# Android Build Notify

Wait for the latest EAS Android build to finish, then post the download link to #android-builds in Slack.

## Instructions

1. Gather a changes summary: run `git log --oneline --no-merges -20` and summarize the meaningful commits since the last "Bump" commit into 3-5 short bullet points.

2. Run `scripts/wait-for-eas-build.sh --platform android` as a **background task** using Bash with `run_in_background: true`, timeout 600000. The script polls every 30 minutes for up to 4 hours.

3. Tell the user the build ID and that you're watching it. They can go do other things.

4. Periodically check the background task output using `TaskOutput` with `block: true, timeout: 300000` (5-minute block waits). Don't spam checks.

5. When the script finishes (exit code 0 = success):
   - Parse the output for `ARTIFACT_URL=`, `PROFILE=`, `APP_VERSION=`, `BUILD_VERSION=`, and `COMMIT_MSG=`
   - Download the APK: `curl -L -o /tmp/taist-android.apk {ARTIFACT_URL}`
   - Upload to Slack with the message:
   ```bash
   ./scripts/slack-upload.sh /tmp/taist-android.apk C0A1M8DJ7CK "*Android Build Ready* :android: (preview)\n*Version:* {APP_VERSION} ({BUILD_VERSION})\n\n*What's new:*\n{CHANGES_SUMMARY}\n\ncc <@U09MTL5R6CX>"
   ```
   - Clean up: `rm /tmp/taist-android.apk`

6. If the build fails (exit code 1), post to Slack that the build failed with the status.

7. If the user provided a build ID as an argument to this command (e.g. `/android-build-notify abc-123`), pass it to the script. Otherwise the script auto-detects the latest Android build.

## Notes
- Script location: `scripts/wait-for-eas-build.sh`
- Slack channel: `C0A1M8DJ7CK` (#android-builds)
- Tag Daryl: `<@U09MTL5R6CX>`
- The script must run from the repo root
