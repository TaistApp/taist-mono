# Version Bump Quick Guide

⚠️ **CRITICAL**: This project has native iOS/Android code. EAS Build uses native files, NOT `app.json`!

## Quick Checklist

When bumping versions, update **ALL** of these files:

- [ ] `app.json` → `version` and `ios.buildNumber`
- [ ] `ios/Taist/Info.plist` → `CFBundleShortVersionString` and `CFBundleVersion`
- [ ] `ios/Taist.xcodeproj/project.pbxproj` → `MARKETING_VERSION` (both Debug & Release)
- [ ] `android/app/build.gradle` → `versionName` and `versionCode`
- [ ] Commit: `git add frontend/app.json frontend/ios frontend/android`
- [ ] Commit: `git commit -m "🔖 Bump version to X.X.X"`
- [ ] Push: `git push origin main`
- [ ] **Wait for push to complete**
- [ ] Build: `cd frontend && npx eas-cli build --platform ios --profile preview --auto-submit`

## File Locations & What to Change

### 1. `frontend/app.json`
```json
{
  "expo": {
    "version": "29.0.0",  // ← Change this
    "ios": {
      "buildNumber": "1"  // ← Change this (usually reset to 1 for new major/minor)
    },
    "android": {
      "versionCode": 8  // ← Change this (increment)
    }
  }
}
```

### 2. `frontend/ios/Taist/Info.plist`
```xml
<key>CFBundleShortVersionString</key>
<string>29.0.0</string>  <!-- ← Change this (version) -->

<key>CFBundleVersion</key>
<string>1</string>  <!-- ← Change this (build number) -->
```

### 3. `frontend/ios/Taist.xcodeproj/project.pbxproj`
Search for `MARKETING_VERSION` (appears twice - Debug and Release):
```
MARKETING_VERSION = 29.0.0;  // ← Change both occurrences
```

### 4. `frontend/android/app/build.gradle`
```gradle
defaultConfig {
    versionCode 8  // ← Change this (increment)
    versionName "29.0.0"  // ← Change this (version)
}
```

## Version Number Rules

- **Version** (`CFBundleShortVersionString`, `versionName`): Semantic version (e.g., `29.0.0`)
- **iOS Build Number** (`CFBundleVersion`): Usually reset to `1` for new major/minor versions, increment for patches
- **Android versionCode**: Always increment (never reset)

## Example: Bumping from 29.0.0 to 29.0.1

```bash
# 1. Update all files (see above)
# 2. Commit
git add frontend/app.json frontend/ios frontend/android
git commit -m "🔖 Bump version to 29.0.1"
git push origin main

# 3. Wait for push, then build
cd frontend
npx eas-cli build --platform ios --profile preview --auto-submit
```

## Why This Matters

When native `ios/` and `android/` directories exist:
- ✅ EAS Build reads from `Info.plist` and `build.gradle`
- ❌ EAS Build **ignores** `app.json` version for native builds
- ❌ Updating only `app.json` = builds still use old version!

## Verification

After pushing, verify the build shows correct version:
1. Check EAS build logs: `npx eas-cli build:list`
2. Look for "App Version" in build details
3. Should match your updated version

---

**Last Updated**: December 4, 2025  
**Current Version**: 29.0.0







