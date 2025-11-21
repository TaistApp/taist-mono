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

- ✅ **Expo Account**: Access to `@bgroble/Taist` project
- ✅ **Apple Developer**: Admin role in Taist, Inc. (WXY2PMFQB7)
- ✅ **App Store Connect**: Access to Taist app
- ✅ **GitHub**: Push access to `bgroble14/taist-mono`

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

1. **Update version number** in `app.json`:
   ```json
   {
     "expo": {
       "version": "28.0.4",  // Increment this
       "ios": {
         "buildNumber": "28.0.4"  // Match version
       }
     }
   }
   ```

2. **Commit version bump**:
   ```bash
   git add app.json
   git commit -m "🔖 Bump version to 28.0.4"
   git push origin main
   ```

### Step 2: Build for TestFlight

```bash
cd frontend

# Start the build
npx eas-cli build --platform ios --profile preview

# You'll be prompted:
# - Apple ID: billygroble@gmail.com
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

Or visit: https://expo.dev/accounts/bgroble/projects/Taist/builds

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

### Versioning Strategy

We use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes or major feature releases
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes and minor improvements

### Current Version: 28.0.3

### Incrementing Versions

**For bug fixes:**
```json
{
  "version": "28.0.4",
  "ios": { "buildNumber": "28.0.4" },
  "android": { "versionCode": 280004 }  // MAJOR*10000 + MINOR*100 + PATCH
}
```

**For new features:**
```json
{
  "version": "28.1.0",
  "ios": { "buildNumber": "28.1.0" },
  "android": { "versionCode": 280100 }
}
```

**For major releases:**
```json
{
  "version": "29.0.0",
  "ios": { "buildNumber": "29.0.0" },
  "android": { "versionCode": 290000 }
}
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
- **EAS Dashboard**: https://expo.dev/accounts/bgroble/projects/Taist
- **GitHub Issues**: https://github.com/bgroble14/taist-mono/issues

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

*Last Updated: November 21, 2025*  
*Current Version: 28.0.3*  
*Maintained by: Development Team*

