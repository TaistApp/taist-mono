# Changelog

All notable changes to the Taist mobile app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [28.0.3] - 2025-11-21

### 🎨 Changed - Design System Overhaul
- **Unified color scheme**: Migrated entire app to white background with orange accents
- Updated all customer screens to use consistent `AppColors.background` (white) and `AppColors.primary` (orange)
- Redesigned account screen with modern card-based layout
- Fixed home screen calendar with proper text colors for white background
- Updated filter buttons to use orange (primary) instead of black for secondary actions
- Applied consistent styling to checkout, orders, chef detail, and order detail screens

### 🔧 Fixed
- Fixed global `Container` component that was applying orange background to all screens
- Corrected import paths for theme constants in home screen (`../../../../constants/theme`)
- Fixed `AppColors` import error in customer tabs layout
- Resolved calendar date visibility issues on white background
- Updated all icon colors for visibility on white backgrounds

### 🚀 Infrastructure
- **New Expo Project**: Migrated to `@bgroble/Taist` under new developer account
- Updated project ID: `d34b1b26-c5a5-4ba8-be5b-04cdcef4a370`
- Configured for TestFlight deployment workflow
- Added EAS build pre-hook for Firebase config in monorepo structure
- Fixed Stripe merchant ID configuration issues
- Cleaned up iOS entitlements (removed placeholder merchant IDs)
- Updated EAS build profile for proper TestFlight distribution

### 📱 Developer Experience
- Added comprehensive deployment documentation (`DEPLOYMENT.md`)
- Enhanced main README with design system guidelines
- Documented developer onboarding process for new team members
- Added troubleshooting guide for common EAS build issues
- Created pre-build hook script for Firebase config path resolution

### 🐛 Bug Fixes
- Fixed "GoogleService-Info.plist not found" in EAS builds
- Resolved "Invalid merchant.id" iOS entitlement error
- Fixed distribution type mismatch for TestFlight builds
- Corrected monorepo path issues in EAS build context

### 🔐 Configuration
- Removed placeholder Stripe merchant ID from `app.json`
- Cleaned iOS entitlements file
- Updated EAS preview profile for store distribution
- Added executable permissions to build hook scripts

---

## [28.0.2] - 2025-11-20

### 🔄 Internal
- Version bump for configuration updates
- Initial TestFlight build attempt
- Apple Developer account integration

---

## [28.0.1] - 2025-11-19

### 🎯 Previous Release
- Baseline version before design system overhaul
- Original orange-themed UI
- Legacy Expo project configuration

---

## Version History Notes

### Design Philosophy
As of v28.0.3, the app follows a clean, modern design system:
- **White backgrounds** for all screens
- **Orange (#FA4616)** as primary accent color
- **Consistent card styling** with subtle shadows
- **Clear visual hierarchy** with typography scale

### Deployment Strategy
- **Development**: Local testing with Expo Dev Client
- **Preview**: TestFlight builds for internal testing (staging API)
- **Production**: App Store/Play Store releases (production API)

---

## Upcoming Features

### Planned for v28.1.0
- [ ] Enhanced chef search filters
- [ ] Improved order tracking UI
- [ ] Performance optimizations
- [ ] Accessibility improvements

### Under Consideration
- [ ] Dark mode support
- [ ] In-app messaging improvements
- [ ] Advanced analytics dashboard
- [ ] Social features for chef following

---

## Breaking Changes

### v28.0.3
- No breaking changes for end users
- Developer setup changed (new Expo project)
- Requires new Apple credentials setup for builds

---

## Migration Notes

### For Developers Joining at v28.0.3+
- Project now under `@bgroble` Expo account
- Apple Team: Taist, Inc. (WXY2PMFQB7)
- Bundle ID: `org.taist.taist` (unchanged)
- See `DEPLOYMENT.md` for complete onboarding guide

---

## Support

For questions about releases:
- Check `DEPLOYMENT.md` for deployment procedures
- See `README.md` for development setup
- Review GitHub issues for known problems
- Contact development team for access issues

---

*Changelog maintained since v28.0.3*  
*Format: [Keep a Changelog](https://keepachangelog.com/)*  
*Versioning: [Semantic Versioning](https://semver.org/)*

