# Taist Tech Stack Documentation

> Last updated: 2026-03-20

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Repository Structure](#repository-structure)
- [Mobile App (Frontend)](#mobile-app-frontend)
- [Backend API](#backend-api)
- [Admin Panel](#admin-panel)
- [Database](#database)
- [Third-Party Services](#third-party-services)
- [Accounts & Access](#accounts--access)
- [Infrastructure & Deployment](#infrastructure--deployment)
- [Environment Configuration](#environment-configuration)
- [Background Jobs & Scheduling](#background-jobs--scheduling)
- [Local Development](#local-development)
- [Testing](#testing)
- [Scripts & Tooling](#scripts--tooling)
- [Documentation](#documentation)

---

## Architecture Overview

```
┌──────────────────┐     ┌───────────────────────┐     ┌──────────────┐
│   Mobile App     │────▶│   Laravel API          │────▶│   MySQL      │
│   (React Native) │     │   (Railway)            │     │   (Railway)  │
│   iOS + Android  │     │                        │     └──────────────┘
└──────────────────┘     │   /mapi/*  (mobile)    │
                         │   /admin-api-v2/* (admin)│
┌──────────────────┐     │                        │     ┌──────────────┐
│   Admin Panel    │────▶│   Procfile:            │     │   Firebase   │
│   (React + Vite) │     │     web: php serve     │     │   (FCM)      │
│   Served from    │     │     worker: schedule   │     └──────────────┘
│   /admin-new/    │     └───────────────────────┘
└──────────────────┘              │
                                  ├── Stripe (payments)
                                  ├── Twilio (SMS)
                                  ├── Resend (email)
                                  ├── Google Maps (geocoding)
                                  ├── SafeScreener (background checks)
                                  └── Firebase (push notifications)
```

**Monorepo** managed with npm workspaces. Backend uses Composer separately.

### Key URLs

| Surface                    | URL                                               |
| -------------------------- | ------------------------------------------------- |
| GitHub Repo                | https://github.com/TaistApp/taist-mono            |
| Production API             | https://api.taist.app                             |
| Staging API                | https://api-staging.taist.app                     |
| Admin Panel (prod)         | https://api.taist.app/admin-new/                  |
| Admin Panel (staging)      | https://api-staging.taist.app/admin-new/          |
| App Store Connect          | https://appstoreconnect.apple.com                 |
| Google Play Console        | https://play.google.com/console                   |
| Stripe Dashboard           | https://dashboard.stripe.com                      |
| Twilio Console             | https://www.twilio.com/console                    |
| Firebase Console           | https://console.firebase.google.com               |
| Google Cloud Console       | https://console.cloud.google.com/apis/credentials |
| Resend Dashboard           | https://resend.com/api-keys                       |
| SafeScreener (InstaScreen) | https://www.instascreen.net                       |
| Railway Dashboard          | https://railway.app/dashboard                     |
| EAS / Expo Dashboard       | https://expo.dev                                  |

---

## Repository Structure

```
taist-mono/
├── frontend/             # React Native + Expo mobile app
│   ├── app/              # Expo Router file-based routes & app code
│   │   ├── screens/      # Customer, chef, and common screens
│   │   ├── components/   # Reusable UI components
│   │   ├── store/        # Redux store configuration
│   │   ├── reducers/     # Redux slices (user, chef, customer, table, device)
│   │   ├── services/     # API client (axios) & Firebase setup
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Constants, validation, navigation helpers
│   │   ├── types/        # TypeScript interfaces
│   │   └── assets/       # Images, sounds, fonts
│   ├── .storybook/       # Storybook on-device config
│   ├── plugins/          # Custom Expo plugins
│   ├── app.json          # Expo native config
│   ├── app.config.js     # Dynamic Expo config (env vars, secrets)
│   ├── eas.json          # EAS Build profiles
│   └── package.json
│
├── backend/              # Laravel 8 API server
│   ├── app/
│   │   ├── Console/      # Artisan commands (13 custom) & scheduler
│   │   ├── Http/         # Controllers, middleware, form requests
│   │   ├── Models/       # Eloquent models (21 models)
│   │   ├── Services/     # Business logic services
│   │   ├── Notifications/# Firebase & email notification classes
│   │   └── Helpers/      # Helper functions
│   ├── config/           # 17 config files
│   ├── database/
│   │   ├── migrations/   # 19 migration files
│   │   ├── seeds/        # Database seeders
│   │   └── taist-schema.sql  # Full schema dump
│   ├── routes/
│   │   ├── mapi.php      # Mobile API (60+ endpoints)
│   │   ├── api.php       # Internal API routes
│   │   ├── admin-api-v2.php  # Admin API v2 (RESTful)
│   │   ├── adminapi.php  # Legacy admin API
│   │   ├── admin.php     # Admin web routes
│   │   └── web.php       # Web routes
│   ├── admin-panel/      # React + Vite admin dashboard (built on deploy)
│   ├── railpack.json     # Railway build config
│   ├── Procfile          # Railway process definitions
│   ├── composer.json
│   └── .env.example
│
├── docs/                 # 45+ directories of documentation
├── scripts/              # Helper scripts (DB copy, Slack, deployment)
├── android/              # Android native code
├── ios/                  # iOS native code
├── .mcp.json             # MCP server config (Maestro, Playwright, Slack, MySQL)
├── start-local-dev.sh    # Start backend + frontend locally
└── package.json          # Root monorepo config (npm workspaces)
```

---

## Mobile App (Frontend)

### Core Framework

| Component        | Version |
| ---------------- | ------- |
| React Native     | 0.81.5  |
| Expo SDK         | 54.0.33 |
| React            | 19.1.0  |
| TypeScript       | 5.9.2   |
| New Architecture | Enabled |

### Navigation

- **Expo Router** ~6.0.23 — file-based routing under `app/screens/`
- **React Navigation** 7.x — native stack, bottom tabs, drawer
- Route groups: `screens/customer/`, `screens/chef/`, `screens/common/`
- Deep linking schemes: `taistexpo://`, `exp+taist-expo://`

### State Management

- **Redux Toolkit** ^2.8.2 + **Redux Persist** (AsyncStorage)
- Slices: `userSlice`, `chefSlice`, `customerSlice`, `tableSlice`, `deviceSlice`, `loadingSlice`, `home_loading_slice`
- `USER_LOGOUT` action resets all state

### API Client

- **Axios** ^1.10.0
- Base URLs by environment:
  - Local: `http://localhost:8005/mapi/`
  - Staging: `https://api-staging.taist.app/mapi/`
  - Production: `https://api.taist.app/mapi/`
- Auth: Bearer token stored in AsyncStorage (`API_TOKEN`)
- Static API key sent with all requests

### UI Libraries

| Library                           | Purpose                    |
| --------------------------------- | -------------------------- |
| React Native Paper 5.14           | Material Design components |
| React Native Reanimated 4.1       | Animations                 |
| React Native Gesture Handler 2.28 | Touch gestures             |
| FontAwesome + Expo Vector Icons   | Icons                      |
| React Native SVG                  | SVG rendering              |
| Expo Blur / Linear Gradient       | Visual effects             |

### Key Custom Components

- `DrawerModal` — bottom sheet with `accessible={false}` for Maestro compatibility
- `OTPInput` — hidden TextInput + visible digit boxes (iOS autofill workaround)
- `styledStripeCardField` — Stripe card input wrapper
- `styledPhotoPicker` — camera/gallery image picker with cropping
- `GoLiveToggle` — chef online/offline toggle
- `KeyboardAwareScrollView`, `FadingScrollView`, `ErrorBoundary`

### Push Notifications

- **Firebase Cloud Messaging** (`@react-native-firebase/messaging` ^23.5.0) — remote push
- **Expo Notifications** (~0.32.16) — local notifications
- Custom sound: `notification.wav`
- Handlers for foreground, background, and killed-state
- Chef activation and availability confirmation triggers

### Maps & Location

- **expo-maps** ~0.12.10 (Google Maps provider)
- **expo-location** ~19.0.8 + `@react-native-community/geolocation`
- Google Maps API key injected via EAS secrets

### Payments

- **@stripe/stripe-react-native** 0.50.3
- `StripeProvider` wraps entire app
- Test keys for local/staging, live keys for production
- Deep link routes: `/stripe-complete`, `/stripe-refresh`

### Crash Reporting

- **@react-native-firebase/crashlytics** ^23.5.0

### Build & Deploy

- **EAS Build** — managed build service
- Profiles: `development`, `preview`, `production`, `adhoc`
- iOS: bundle ID `org.taist.taist`, Team `WXY2PMFQB7`
- Android: package `com.taist.app`
- App version: 32.0.0 (iOS build 23, Android versionCode 153)
- Portrait orientation only
- iOS distribution: TestFlight
- Android distribution: APK via Google Drive

### npm Scripts

| Script                | Description                                     |
| --------------------- | ----------------------------------------------- |
| `npm run start`       | Start Expo (APP_ENV=staging)                    |
| `npm run dev:local`   | Start Expo (APP_ENV=local, hits localhost:8005) |
| `npm run dev:staging` | Start Expo (APP_ENV=staging)                    |
| `npm run dev:prod`    | Start Expo (APP_ENV=production)                 |
| `npm run storybook`   | Launch Storybook                                |

---

## Backend API

### Core Framework

| Component        | Version                  |
| ---------------- | ------------------------ |
| PHP              | 8.2+                     |
| Laravel          | 8.83                     |
| Laravel Passport | 10.0 (OAuth2 token auth) |

### Authentication

Four auth guards for different surfaces:

| Guard      | Model    | Purpose                |
| ---------- | -------- | ---------------------- |
| `web`      | Listener | Session-based web auth |
| `api`      | Listener | Token-based API        |
| `mapi`     | Listener | Mobile API (primary)   |
| `adminapi` | Admins   | Admin API              |

- OAuth2 via Laravel Passport (migrations manually managed)
- Session timeout: 120 minutes
- Password reset token expiry: 60 minutes

### API Routes

| File                      | Prefix          | Endpoints     | Auth           |
| ------------------------- | --------------- | ------------- | -------------- |
| `routes/mapi.php`         | `/mapi`         | 60+           | Passport token |
| `routes/admin-api-v2.php` | `/admin-api-v2` | RESTful admin | Admin token    |
| `routes/adminapi.php`     | `/adminapi`     | Legacy admin  | Admin token    |
| `routes/web.php`          | `/`             | Web pages     | Session        |

Mobile API covers: auth, allergens, appliances, availability, categories, conversations, customizations, menus, orders, reviews, payments, notifications, users, zipcodes.

### Key Composer Dependencies

| Package                   | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `laravel/passport`        | OAuth2 API authentication               |
| `kreait/laravel-firebase` | Firebase Admin SDK (push notifications) |
| `twilio/sdk`              | SMS sending                             |
| `sendgrid/sendgrid`       | Email (legacy, replaced by Resend)      |
| `stripe-php` (bundled)    | Payment processing                      |
| `maatwebsite/excel`       | Excel import/export                     |
| `guzzlehttp/guzzle`       | HTTP client                             |

### Eloquent Models (21)

`Listener` (main user, maps to `tbl_users`), `Admins`, `Orders`, `Availabilities`, `AvailabilityOverride`, `Conversations`, `Reviews`, `Transactions`, `DiscountCodes`, `DiscountCodeUsage`, `Zipcodes`, `NotificationTemplates`, `Menus`, `Categories`, `Allergens`, `Appliances`, `Customizations`, `PaymentMethodListener`, `Tickets`, `Version`, `WeeklyOrderReminderLog`

### Queue & Cache

- Queue driver: `sync` (no background queue — jobs run inline)
- Cache driver: `file` (file-based)
- Redis available but not default

### Mail

- Primary: **Resend** API (`contact@taist.app`)
- Legacy: SendGrid (still in code)
- SMTP configured as fallback

### Storage

- Default disk: `local` filesystem
- AWS S3 configured but not primary
- Public disk symlinked: `public/storage` → `storage/app/public`
- Static assets seeded from `storage/seed-uploads/` on deploy

---

## Admin Panel

| Component        | Version |
| ---------------- | ------- |
| React            | 19.2.0  |
| Vite             | 7.3.1   |
| TypeScript       | Latest  |
| TailwindCSS      | 4.2     |
| React Router DOM | 7.13    |

- **Location:** `backend/admin-panel/`
- **Build output:** `backend/public/admin-new/` (gitignored)
- **Auto-built** on Railway deploy via `railpack.json`
- **UI:** Radix UI + Shadcn components, TanStack Table, TanStack React Query, Sonner toasts, Lucide icons
- **Local dev:** `cd backend/admin-panel && npm run dev`

---

## Database

| Property    | Value                              |
| ----------- | ---------------------------------- |
| Type        | MySQL                              |
| Local DB    | `taist_local` (127.0.0.1:3306)     |
| Railway DB  | Managed MySQL                      |
| Charset     | utf8mb4 / utf8mb4_unicode_ci       |
| Migrations  | 19 files in `database/migrations/` |
| Schema dump | `database/taist-schema.sql`        |

### Key Tables

- `tbl_users` — users (customers + chefs, via `Listener` model)
- `tbl_orders` — orders with Stripe payment/refund tracking
- `availabilities` / `availability_overrides` — chef scheduling
- `conversations` — in-app messaging
- `reviews` — order reviews/ratings
- `transactions` — payment records
- `admins` — admin users
- `discount_codes` — promo codes with usage tracking
- `zipcodes` — service area definitions
- `notification_templates` — push/SMS templates

---

## Third-Party Services

### Stripe — Payments

- **SDK:** stripe-php (bundled in `backend/stripe-php/`)
- **Frontend:** `@stripe/stripe-react-native` 0.50.3
- **Features:** Customer charges, chef payouts (Stripe Connect), refunds, saved payment methods
- **Config:** `STRIPE_KEY`, `STRIPE_SECRET`
- **Account:** Dayne/Daryl — account ID prefix `51KWXqK...`
- **Dashboard:** https://dashboard.stripe.com/apikeys
- **Environments:** Test keys (local/staging), live keys (production)

### Twilio — SMS

- **SDK:** `twilio/sdk` ^8.1
- **Features:** Phone verification, order reminders (24hr), chef confirmation reminders, chat SMS alerts
- **Config:** `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`
- **Account:** Dayne/Daryl — SID `ACdb49fd...`, Phone: +1 (317) 854-6026
- **Console:** https://www.twilio.com/console
- **Feature toggles:**
  - `SMS_AVAILABILITY_REMINDERS_ENABLED`
  - `CHAT_SMS_ENABLED` + `CHAT_SMS_THROTTLE_MINUTES`

### Resend — Email

- **Integration:** API-based (replaced SendGrid)
- **From:** `Taist <contact@taist.app>`
- **Config:** `RESEND_API_KEY`
- **Account:** contact@taist.app
- **Dashboard:** https://resend.com/api-keys
- **DKIM:** Configured (`resend._domainkey.taist.app`)
- **SPF:** Needs update at Network Solutions (see memory)

### Firebase — Push Notifications

- **Backend:** `kreait/laravel-firebase` ^3.4 (Firebase Admin SDK)
- **Frontend:** `@react-native-firebase/messaging` ^23.5.0
- **Features:** Cloud Messaging, dynamic links
- **Config:** `FIREBASE_CREDENTIALS` (JSON file or env var)
- **Account:** Dayne/Daryl — GCP project `taist-mobile-app`
- **Console:** https://console.firebase.google.com

### Google Maps — Geocoding & Maps

- **Backend:** API for geocoding chef/customer addresses
- **Frontend:** `expo-maps` with Google Maps provider
- **Config:** `GOOGLE_MAPS_API_KEY`
- **Account:** Dayne/Daryl — likely under same GCP project `taist-mobile-app`
- **Console:** https://console.cloud.google.com/apis/credentials

### SafeScreener — Background Checks

- **Service:** InstaScreen
- **Purpose:** Chef background verification during admin registration
- **Config:** `SAFESCREENER_GUID`, `SAFESCREENER_PASSWORD`, `SAFESCREENER_PACKAGE`
- **Account:** Dayne/Daryl — currently in sandbox mode (`api-sandbox.instascreen.net`)
- **Portal:** https://www.instascreen.net

### Firebase Crashlytics — Crash Reporting

- **Frontend:** `@react-native-firebase/crashlytics` ^23.5.0

### OpenAI — AI Features

- **Account:** contact@taist.app
- **Config:** `OPENAI_API_KEY`

---

## Accounts & Access

| Service           | Account                                 | Owner                                        |
| ----------------- | --------------------------------------- | -------------------------------------------- |
| App Store Connect | billygroble@gmail.com                   | Billy — Apple Team ID: WXY2PMFQB7            |
| Expo / EAS        | billygroble@gmail.com                   | Billy — owner: `bgroble`                     |
| Railway           | TaistApp GitHub org                     | Linked via GitHub SSO                        |
| Stripe            | Dayne/Daryl                             | Account prefix: `51KWXqK...`                 |
| Twilio            | Dayne/Daryl                             | SID: `ACdb49fd...`, Phone: +1 (317) 854-6026 |
| Firebase / GCP    | Dayne/Daryl                             | Project: `taist-mobile-app`                  |
| Google Maps       | Dayne/Daryl                             | Likely same GCP project `taist-mobile-app`   |
| Resend            | contact@taist.app                       | Email delivery                               |
| OpenAI            | contact@taist.app                       | AI features                                  |
| SafeScreener      | Dayne/Daryl                             | Background checks — currently sandbox mode   |
| Domain DNS        | arnettfinancial.com (Network Solutions) | `taist.app` domain management                |

---

## Infrastructure & Deployment

### Hosting

| Surface              | Platform           | Builder                 |
| -------------------- | ------------------ | ----------------------- |
| Backend API          | Railway            | Railpack (not Nixpacks) |
| Database             | Railway            | Managed MySQL           |
| Mobile app builds    | EAS Build          | Expo managed            |
| iOS distribution     | TestFlight         | Apple                   |
| Android distribution | APK / Google Drive | Manual                  |

### Railway Configuration

**`backend/railpack.json`** — extends default build:

1. Installs admin panel dependencies (`npm ci`)
2. Builds admin panel (`npm run build`)
3. Seeds static uploads to `storage/seed-uploads/`

**`backend/Procfile`** — two processes:

- **web:** Seeds static assets → Waits for DB → fixes migrations → runs migrations → syncs version → `php artisan serve`
- **worker:** Waits for DB → `php artisan schedule:work` (cron daemon)

**Root directory:** `/backend` — only backend code exists in the Railway container. Cannot reference `../` paths.

### Environments

| Environment | Backend URL             | Purpose     |
| ----------- | ----------------------- | ----------- |
| Local       | `localhost:8005`        | Development |
| Staging     | `api-staging.taist.app` | Testing     |
| Production  | `api.taist.app`         | Live        |

### No CI/CD Pipelines

- No GitHub Actions or workflows
- Deploys triggered by Railway (auto on push) and EAS Build (manual CLI)

### Railway SSH

```bash
# Link to environment first
railway link -e production -s taist-mono -p Taist

# Run remote commands
railway ssh php artisan migrate --force

# Always switch back to staging when done
railway link -e staging -s taist-mono -p Taist
```

---

## Environment Configuration

### Backend (.env)

Key variables:

```
# App
APP_ENV=local|staging|production
APP_URL=http://localhost:8005

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=taist_local
DB_USERNAME=root
DB_PASSWORD=

# Stripe
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...

# Twilio
TWILIO_SID=...
TWILIO_TOKEN=...
TWILIO_FROM=+1...

# Firebase
FIREBASE_CREDENTIALS=/path/to/credentials.json

# Email
RESEND_API_KEY=re_...

# Google Maps
GOOGLE_MAPS_API_KEY=...

# SafeScreener
SAFESCREENER_GUID=...
SAFESCREENER_PASSWORD=...
SAFESCREENER_PACKAGE=...

# Feature Toggles
SMS_AVAILABILITY_REMINDERS_ENABLED=true|false
CHAT_SMS_ENABLED=true|false
CHAT_SMS_THROTTLE_MINUTES=5
WEEKLY_ORDER_REMINDERS_ENABLED=true|false
WEEKLY_ORDER_REMINDERS_MAX_PER_WEEK=2
WEEKLY_ORDER_REMINDERS_START_HOUR=10
WEEKLY_ORDER_REMINDERS_END_HOUR=16
WEEKLY_ORDER_REMINDERS_WEEKDAYS=1,2,3,4
```

### Frontend (Environment)

Set via npm scripts (not .env files):

```bash
APP_ENV=staging npm start       # npm run start
APP_ENV=local npm start         # npm run dev:local
APP_ENV=production npm start    # npm run dev:prod
```

EAS Build secrets:

- `GOOGLE_MAPS_API_KEY` — injected at build time via `app.config.js`

---

## Background Jobs & Scheduling

Runs via `php artisan schedule:work` (Railway worker process).

| Command                            | Frequency       | Description                                                            |
| ---------------------------------- | --------------- | ---------------------------------------------------------------------- |
| `orders:process-expired`           | Every 30 min    | Auto-refund orders past 30-min acceptance deadline                     |
| `orders:send-reminders`            | Every 30 min    | 24-hour SMS reminders to chef + customer                               |
| `chef:send-confirmation-reminders` | Every 15 min    | Remind chefs to confirm tomorrow's hours                               |
| `chef:cleanup-old-overrides`       | Daily 02:00 UTC | Remove availability overrides older than 7 days                        |
| `reminders:send-weekly-order`      | Every 15 min    | Push notifications for weekly orders (Mon-Thu 10-16 local, max 2/week) |
| `verify:accounts cleanup`          | Daily 03:00 UTC | Remove stale verification accounts (>2hr old)                          |

### Custom Artisan Commands (13)

`SyncVersion`, `FixOrderPaymentTokens`, `BackfillChefCoordinates`, `ConvertTimestampAvailability`, `CleanupNullCoordinates`, `SendWeeklyOrderReminders`, `VerifyAccounts`, `SendOrderReminders`, `FixRailwayMigrations`, `CleanupOldOverrides`, `SendConfirmationReminders`, `ProcessExpiredOrders`, `CreateAdminUser`

---

## Local Development

### Prerequisites

- PHP 8.2+ (`/opt/homebrew/bin/php` on macOS)
- MySQL (`brew services start mysql`)
- Node.js + npm
- Expo CLI
- Xcode (iOS) / Android Studio (Android)

### Quick Start

```bash
# Option 1: Combined
./start-local-dev.sh

# Option 2: Separate terminals
# Terminal 1 — Backend
cd backend && php artisan serve --port=8005

# Terminal 2 — Frontend (hits staging backend)
cd frontend && npm run start

# Terminal 2 — Frontend (hits local backend)
cd frontend && npm run dev:local
```

### Database Setup

```bash
# Local MySQL
mysql -u root -e "CREATE DATABASE taist_local"
cd backend && php artisan migrate --seed
```

### MCP Servers (`.mcp.json`)

| Server     | Purpose                              |
| ---------- | ------------------------------------ |
| Maestro    | Mobile E2E testing (iOS/Android)     |
| Playwright | Web browser automation (admin panel) |
| Slack      | Team communication integration       |
| MySQL      | Local database queries               |

---

## Testing

### E2E Testing — Maestro

- Mobile UI automation for iOS and Android
- Conventions: `docs/maestro-conventions.md`
- Session lock: `/tmp/maestro-session.lock` (one session at a time, port 7001)
- testID naming: dot notation (`login.emailInput`)

### Component Testing — Storybook

- On-device Storybook (`@storybook/react-native` ^10.1.11)
- Launch: `npm run storybook` / `npm run storybook:ios` / `npm run storybook:android`

### Backend — PHPUnit

- PHPUnit ^8.5 configured
- Test directory: `backend/tests/`

### Web Testing — Playwright

- Headed Chrome via MCP server
- Used for admin panel testing

---

## Scripts & Tooling

Located in `scripts/`:

| Script                        | Purpose                             |
| ----------------------------- | ----------------------------------- |
| `copy-local-to-railway-db.sh` | Copy local MySQL → Railway staging  |
| `copy-prod-to-staging.sh`     | Copy production DB → staging        |
| `import-to-railway.sh`        | Import database to Railway          |
| `slack-download-images.sh`    | Download images from Slack channels |
| `slack-upload.sh`             | Upload files to Slack               |
| `verify-production.sh`        | Verify production environment       |
| `wait-for-eas-build.sh`       | Poll EAS build status               |

Root-level:

| Script                     | Purpose                           |
| -------------------------- | --------------------------------- |
| `start-local-dev.sh`       | Start backend + frontend          |
| `set-emulator-location.sh` | Set Android emulator GPS location |

---

## Documentation

Master index: `docs/DOCUMENTATION-INDEX.md`

Key directories:

| Path                   | Content                                                |
| ---------------------- | ------------------------------------------------------ |
| `docs/setup/`          | Quick start, local dev, database setup                 |
| `docs/architecture/`   | API reference, data models, order management, auth     |
| `docs/features/`       | Chef availability, notifications, SMS, payments, menus |
| `docs/frontend/`       | Redux state, mobile navigation                         |
| `docs/operations/`     | Background jobs, environment config                    |
| `docs/infrastructure/` | AWS setup, domain migration, Railway cutover           |
| `docs/deployment/`     | Railway migration, database copy                       |
| `docs/api/`            | Complete API reference (147+ endpoints)                |

---

## Key Gotchas

1. **Timezone:** Railway runs UTC. Never use `date()` on Unix timestamps for scheduling — use string date/time fields (`order_date_new`, `order_time`).
2. **APP_ENV:** Always verify the running Expo process has the correct `APP_ENV` before testing. Kill and restart if wrong.
3. **Railpack, not Nixpacks:** Railway uses `railpack.json`. The `nixpacks.toml` file is ignored.
4. **Root directory `/backend`:** Railway container only has backend code. Admin panel must build within this context.
5. **Maestro port 7001:** Only one Maestro session at a time. Check `/tmp/maestro-session.lock`.
6. **Seeder namespaces:** Mixed — some seeders have `Database\Seeders` namespace, some don't. Use FQCN when calling namespaced seeders from non-namespaced ones.
7. **iOS autofill:** Password fields use `textContentType="oneTimeCode"` to prevent broken iOS autofill overlay. Login screen keeps `textContentType="password"`.
