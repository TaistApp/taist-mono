# Deployment Guide - Taist Mobile App

Complete guide for deploying the Taist mobile app to TestFlight and production app stores.

## Table of Contents

- [Quick Start](#quick-start)
- [TestFlight Deployment (iOS)](#testflight-deployment-ios)
- [Production Deployment](#production-deployment)
- [Version Management](#version-management)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### TestFlight Build (Recommended for Testing)

```bash
# Navigate to frontend directory
cd /Users/williamgroble/taist-mono/frontend

# Ensure you're logged into EAS
npx eas-cli whoami

# Build and submit to TestFlight
npx eas-cli build --platform ios --profile preview
```

Build time: ~10-15 minutes  
Automatic upload to TestFlight: Yes  
Requires: Apple Admin access

---

## Prerequisites

### Required Access

- ✅ **Expo Account**: Access to `@taistapp/taist` project
- ✅ **Apple Developer**: Admin role in Taist, Inc. (WXY2PMFQB7)
- ✅ **App Store Connect**: Access to Taist app
- ✅ **GitHub**: Push access to `TaistApp/taist-mono`

### Required Tools

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Verify installation
eas --version
```

---

## TestFlight Deployment (iOS)

### Step 1: Prepare the Build

⚠️ **CRITICAL**: This project has native iOS/Android code. You **MUST** update all version files (see [Version Management](#version-management) section below).

1. **Update version numbers** in ALL required files:
   - `app.json`
   - `ios/Taist/Info.plist`
   - `ios/Taist.xcodeproj/project.pbxproj`
   - `android/app/build.gradle`

2. **Commit and push ALL version changes**:
   ```bash
   git add frontend/app.json frontend/ios frontend/android
   git commit -m "🔖 Bump version to X.X.X"
   git push origin main
   ```
   
   **Wait for push to complete** before starting the build!

### Step 2: Build for TestFlight

```bash
cd frontend

# Start the build
npx eas-cli build --platform ios --profile preview

# You'll be prompted:
# - Apple ID: a.daynearnett@gmail.com
# - Team: Taist, Inc. (WXY2PMFQB7)
# - Generate Provisioning Profile: Y (if needed)
# - Generate Push Notifications Key: Y (if needed)
```

**Expected Timeline:**
- Build queue: ~1-3 minutes
- Build compilation: ~10-15 minutes
- Upload to TestFlight: Automatic
- Processing in App Store Connect: ~5-10 minutes

### Step 3: Monitor Build Progress

```bash
# Check build status
npx eas-cli build:list

# View build details
npx eas-cli build:view [BUILD_ID]
```

Or visit: https://expo.dev/accounts/taistapp/projects/taist/builds

### Step 4: Add TestFlight Testers

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to: **My Apps** → **Taist** → **TestFlight**
3. Choose testing group:
   - **Internal Testing**: App Store Connect users (instant)
   - **External Testing**: Anyone with email (requires initial review)

4. **Add Internal Testers:**
   - Click **Internal Testing** tab
   - Click **+** next to testers
   - Select users from your App Store Connect team
   - Testers receive email invitation immediately

5. **Add External Testers:**
   - Click **External Testing** tab
   - Create a group if needed
   - Click **+** to add testers
   - Enter email addresses
   - First build requires Apple review (~24-48 hours)
   - Subsequent builds are instant

### Step 5: Testers Install App

Testers will:
1. Receive email invitation from TestFlight
2. Download TestFlight app from App Store
3. Accept invitation in email
4. Open TestFlight app and install Taist

---

## Production Deployment

### iOS Production Build

1. **Prepare for production:**
   ```bash
   # Update version in app.json
   # Update CHANGELOG.md with release notes
   # Commit and push changes
   ```

2. **Build production release:**
   ```bash
   cd frontend
   npx eas-cli build --platform ios --profile production
   ```

3. **Submit to App Store:**
   - Build automatically uploads to App Store Connect
   - Go to App Store Connect → Taist → App Store
   - Fill in "What's New in This Version"
   - Add screenshots if needed
   - Click **Submit for Review**

### Android Production Build

1. **Build Android release:**
   ```bash
   cd frontend
   npx eas-cli build --platform android --profile production
   ```

2. **Upload to Google Play:**
   - Download AAB from EAS dashboard (or automatic upload)
   - Go to Google Play Console
   - Navigate to Production release
   - Upload AAB file
   - Fill in release notes
   - Submit for review

---

## Version Management

### ⚠️ CRITICAL: Native Project Version Files

**IMPORTANT**: This project has native iOS/Android directories. When native projects exist, **EAS Build uses native files instead of `app.json`** for version information. You **MUST** update all version files listed below, or builds will use the old version!

### Versioning Strategy

We use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes or major feature releases
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes and minor improvements

### Current Version: 29.0.0

### ⚠️ Required Files to Update (ALL OF THEM)

When bumping versions, you **MUST** update these files:

#### 1. `frontend/app.json` (for reference)
```json
{
  "expo": {
    "version": "29.0.0",
    "ios": { "buildNumber": "1" },
    "android": { "versionCode": 8 }
  }
}
```

#### 2. `frontend/ios/Taist/Info.plist` (iOS - REQUIRED)
```xml
<key>CFBundleShortVersionString</key>
<string>29.0.0</string>  <!-- Version -->
<key>CFBundleVersion</key>
<string>1</string>  <!-- Build number -->
```

#### 3. `frontend/ios/Taist.xcodeproj/project.pbxproj` (iOS - REQUIRED)
Update `MARKETING_VERSION` in **both** Debug and Release configurations:
```
MARKETING_VERSION = 29.0.0;
```

#### 4. `frontend/android/app/build.gradle` (Android - REQUIRED)
```gradle
versionCode 8
versionName "29.0.0"
```

### Version Bump Checklist

**Before every build, follow this checklist:**

- [ ] Update `app.json` → `version` and `ios.buildNumber`
- [ ] Update `ios/Taist/Info.plist` → `CFBundleShortVersionString` and `CFBundleVersion`
- [ ] Update `ios/Taist.xcodeproj/project.pbxproj` → `MARKETING_VERSION` (both Debug & Release)
- [ ] Update `android/app/build.gradle` → `versionName` and `versionCode`
- [ ] Commit all changes: `git add frontend/app.json frontend/ios frontend/android && git commit -m "🔖 Bump version to X.X.X"`
- [ ] Push to remote: `git push origin main`
- [ ] **Wait for push to complete** before starting EAS build
- [ ] Start build: `npx eas-cli build --platform ios --profile preview`

### Version Number Examples

**For bug fixes (patch):**
- Version: `29.0.1`
- iOS buildNumber: `2` (increment from previous)
- Android versionCode: `9` (increment from previous)

**For new features (minor):**
- Version: `29.1.0`
- iOS buildNumber: `1` (reset to 1 for new minor version)
- Android versionCode: `10` (increment)

**For major releases:**
- Version: `30.0.0`
- iOS buildNumber: `1` (reset to 1)
- Android versionCode: `11` (increment)

### Why Native Files Matter

When `ios/` and `android/` directories exist in your Expo project:
- EAS Build detects native code and uses native project files
- `app.json` version is **ignored** for native builds
- Only `Info.plist`, `project.pbxproj`, and `build.gradle` values are used
- This is why updating only `app.json` doesn't work!

### Quick Version Bump Script

```bash
#!/bin/bash
# Usage: ./bump-version.sh 29.0.1 2 9

VERSION=$1
IOS_BUILD=$2
ANDROID_CODE=$3

# Update app.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" frontend/app.json
sed -i '' "s/\"buildNumber\": \".*\"/\"buildNumber\": \"$IOS_BUILD\"/" frontend/app.json
sed -i '' "s/\"versionCode\": [0-9]*/\"versionCode\": $ANDROID_CODE/" frontend/app.json

# Update Info.plist
sed -i '' "s/<string>[0-9.]*<\/string>/<string>$VERSION<\/string>/" frontend/ios/Taist/Info.plist
sed -i '' "s/<string>[0-9]*<\/string>/<string>$IOS_BUILD<\/string>/" frontend/ios/Taist/Info.plist

# Update build.gradle
sed -i '' "s/versionCode [0-9]*/versionCode $ANDROID_CODE/" frontend/android/app/build.gradle
sed -i '' "s/versionName \".*\"/versionName \"$VERSION\"/" frontend/android/app/build.gradle

# Update Xcode project (MARKETING_VERSION)
sed -i '' "s/MARKETING_VERSION = [0-9.]*/MARKETING_VERSION = $VERSION/" frontend/ios/Taist.xcodeproj/project.pbxproj

echo "✅ Version updated to $VERSION"
echo "⚠️  Review changes before committing!"
```

---

## Build Profiles Explained

### Development Profile
```json
{
  "development": {
    "developmentClient": true,
    "env": { "APP_ENV": "development" }
  }
}
```
- For local development with Expo Dev Client
- Hot reloading enabled
- Development environment/API

### Preview Profile
```json
{
  "preview": {
    "env": { "APP_ENV": "staging" },
    "distribution": "store",
    "ios": { "resourceClass": "m-medium" }
  }
}
```
- For TestFlight internal testing
- Staging environment/API
- Production-like build
- No device registration required

### Production Profile
```json
{
  "production": {
    "env": { "APP_ENV": "production" },
    "autoIncrement": true
  }
}
```
- For App Store/Play Store releases
- Production environment/API
- Fully optimized build

---

## Troubleshooting

### Build Fails Immediately

**"Entity not authorized" error:**
```bash
# Check you're logged in correctly
npx eas-cli whoami

# Re-login if needed
npx eas-cli logout
npx eas-cli login
```

**"You don't have the required permissions":**
- Verify you have **Admin** role in App Store Connect
- Contact team admin to upgrade your role

### Build Fails During Compilation

**"GoogleService-Info.plist not found":**
- Verify `frontend/GoogleService-Info.plist` exists
- Check pre-build hook is executable:
  ```bash
  chmod +x frontend/eas-hooks/eas-build-pre-install.sh
  ```

**"Invalid merchant.id":**
- Check `app.json` Stripe plugin configuration
- Verify `ios/Taist/Taist.entitlements` doesn't contain placeholder IDs
- Remove or update to valid format: `merchant.com.taist.app`

**iOS build errors about code signing:**
```bash
# Regenerate credentials
npx eas-cli credentials
# Select iOS → Build Credentials → Generate new certificate
```

### TestFlight Issues

**Build not appearing in TestFlight:**
- Wait 5-10 minutes for processing
- Check App Store Connect for build status
- Verify build didn't fail compliance export review

**Testers can't install:**
- Verify tester email is correct
- Check tester accepted invitation
- Ensure TestFlight app is installed on device
- For external testers, verify first build passed Apple review

**"This build is no longer available":**
- Build expired (TestFlight builds last 90 days)
- Submit a new build

---

## Best Practices

### Pre-Deployment Checklist

- [ ] Update version number in `app.json`
- [ ] Update `CHANGELOG.md` with changes
- [ ] Test critical user flows locally
- [ ] Run linter: `npm run lint`
- [ ] Type check: `npx tsc --noEmit`
- [ ] Commit and push all changes
- [ ] Verify staging API is working
- [ ] Create git tag for version

### During Deployment

- [ ] Monitor build progress on EAS dashboard
- [ ] Check for build errors in logs
- [ ] Verify build appears in TestFlight
- [ ] Test installed build on physical device
- [ ] Verify API connections work correctly
- [ ] Test push notifications

### Post-Deployment

- [ ] Send announcement to testers
- [ ] Monitor crash reports
- [ ] Check TestFlight feedback
- [ ] Document any issues found
- [ ] Plan hotfix if critical bugs found

---

## Useful Commands

```bash
# Check EAS login status
npx eas-cli whoami

# View project info
npx eas-cli project:info

# List recent builds
npx eas-cli build:list

# View specific build details
npx eas-cli build:view [BUILD_ID]

# Check credentials
npx eas-cli credentials

# View project configuration
npx eas-cli config

# Cancel running build
npx eas-cli build:cancel [BUILD_ID]
```

---

## Support Resources

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **TestFlight Docs**: https://developer.apple.com/testflight/
- **App Store Connect**: https://appstoreconnect.apple.com
- **EAS Dashboard**: https://expo.dev/accounts/taistapp/projects/taist
- **GitHub Issues**: https://github.com/TaistApp/taist-mono/issues

---

## Emergency Procedures

### Hotfix Deployment

If a critical bug is found in production:

1. **Create hotfix branch:**
   ```bash
   git checkout -b hotfix/28.0.4
   ```

2. **Fix the bug and commit:**
   ```bash
   git commit -m "🐛 Fix critical bug in checkout flow"
   ```

3. **Bump patch version:**
   - Update to 28.0.4 in `app.json`

4. **Build and deploy immediately:**
   ```bash
   npx eas-cli build --platform ios --profile production
   ```

5. **Fast-track App Store review:**
   - In App Store Connect, use "Expedited Review" option
   - Explain the critical nature of the fix

6. **Merge hotfix back:**
   ```bash
   git checkout main
   git merge hotfix/28.0.4
   git push origin main
   ```

### Rollback Strategy

If a production build has critical issues:

1. **iOS**: Re-release previous stable version from App Store Connect
2. **Android**: Roll back to previous release in Google Play Console
3. **TestFlight**: Previous builds remain available for 90 days

---

*Last Updated: December 4, 2025*  
*Current Version: 29.0.0*

---

## ⚠️ Common Mistakes & Troubleshooting

### Build Shows Wrong Version

**Symptom**: Build shows old version (e.g., `29.0.0`) even after updating `app.json`

**Cause**: Native project files (`Info.plist`, `project.pbxproj`, `build.gradle`) weren't updated

**Solution**: 
1. Check all version files listed in [Version Management](#version-management)
2. Update native files, commit, push, then rebuild
3. Verify version in EAS build logs before submission

### "Bundle version must be higher" Error

**Symptom**: TestFlight upload fails with version conflict

**Cause**: Version number is same or lower than previously uploaded build

**Solution**: Increment version in ALL native files, commit, push, rebuild  
*Maintained by: Development Team*


