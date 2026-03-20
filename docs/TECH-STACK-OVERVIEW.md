# Taist — Technology Overview

> Last updated: March 20, 2026

---

## What is Taist?

Taist is a mobile marketplace connecting customers with local personal chefs. Customers browse nearby chefs, view menus, and place orders. Chefs manage availability, accept orders, and receive payouts — all through the app.

---

## Platform Overview

```
                    ┌─────────────────────┐
                    │     Taist App        │
                    │   iOS  +  Android    │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │    Taist Backend     │
                    │   (Cloud Server)     │
                    └─────────┬───────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │ Stripe  │         │ Twilio  │         │Firebase │
    │Payments │         │  SMS    │         │  Push   │
    └─────────┘         └─────────┘         │Notifs   │
                                            └─────────┘
```

| Layer              | What it does                                                      |
| ------------------ | ----------------------------------------------------------------- |
| **Mobile App**     | The app customers and chefs use on their phones                   |
| **Backend Server** | Handles all business logic, user accounts, orders, payments       |
| **Database**       | Stores all data — users, orders, menus, conversations             |
| **Admin Panel**    | Web dashboard for managing users, orders, and platform operations |

---

## Mobile App

| Detail               | Value                                                  |
| -------------------- | ------------------------------------------------------ |
| Platforms            | iOS + Android (single codebase)                        |
| Framework            | React Native + Expo                                    |
| App Store (iOS)      | [App Store Connect](https://appstoreconnect.apple.com) |
| Play Store (Android) | [Google Play Console](https://play.google.com/console) |
| iOS Beta Testing     | TestFlight                                             |
| Android Beta Testing | APK shared via Google Drive                            |
| Current Version      | 32.0.0                                                 |

---

## Backend & Hosting

| Detail      | Value                                    |
| ----------- | ---------------------------------------- |
| Language    | PHP (Laravel framework)                  |
| Hosting     | [Railway](https://railway.app/dashboard) |
| Database    | MySQL (hosted on Railway)                |
| Admin Panel | React web app served from backend        |

### Environments

| Environment               | URL                                      | Purpose                   |
| ------------------------- | ---------------------------------------- | ------------------------- |
| **Production**            | https://api.taist.app                    | Live app — real customers |
| **Staging**               | https://api-staging.taist.app            | Testing before going live |
| **Admin Panel (prod)**    | https://api.taist.app/admin-new/         | Manage production data    |
| **Admin Panel (staging)** | https://api-staging.taist.app/admin-new/ | Test admin features       |

---

## Third-Party Services

These are the external services Taist depends on:

| Service          | What it does                                                 | Dashboard                                                    |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Stripe**       | Payment processing — customer charges, chef payouts, refunds | [Dashboard](https://dashboard.stripe.com)                    |
| **Twilio**       | SMS — phone verification, order reminders, chat alerts       | [Console](https://www.twilio.com/console)                    |
| **Resend**       | Email delivery — password resets, notifications              | [Dashboard](https://resend.com/api-keys)                     |
| **Firebase**     | Push notifications to phones + crash reporting               | [Console](https://console.firebase.google.com)               |
| **Google Maps**  | Maps in the app + address geocoding on the backend           | [Console](https://console.cloud.google.com/apis/credentials) |
| **SafeScreener** | Background checks for chef verification                      | [Portal](https://www.instascreen.net)                        |
| **OpenAI**       | AI-powered features                                          | —                                                            |

---

## Automated Background Operations

These run automatically on a schedule with no manual intervention:

| What                        | How Often    | Description                                                           |
| --------------------------- | ------------ | --------------------------------------------------------------------- |
| Expired order processing    | Every 30 min | Auto-refunds orders not accepted within 30 minutes                    |
| Order reminders             | Every 30 min | SMS reminder to chef + customer 24 hours before an order              |
| Chef confirmation reminders | Every 15 min | Reminds chefs to confirm tomorrow's availability                      |
| Weekly order reminders      | Every 15 min | Push notifications encouraging customers to order (Mon-Thu, 10am-4pm) |
| Old data cleanup            | Daily        | Removes stale availability overrides and verification accounts        |

---

## Source Code

| Resource               | Link                                     |
| ---------------------- | ---------------------------------------- |
| Repository             | https://github.com/TaistApp/taist-mono   |
| Main branch            | `main` (production)                      |
| Build service (mobile) | [Expo EAS](https://expo.dev)             |
| Hosting (backend)      | [Railway](https://railway.app/dashboard) |

---

## App Distribution

### iOS

1. Builds are created via Expo Application Services (EAS)
2. Submitted to TestFlight for beta testing
3. Released to App Store via [App Store Connect](https://appstoreconnect.apple.com)

### Android

1. Builds are created via EAS
2. Preview APKs shared via Google Drive for testing
3. Production builds uploaded to [Google Play Console](https://play.google.com/console)

---

## Key Accounts & Access

| Service           | Account                                 | Notes                                                              |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------ |
| App Store Connect | billygroble@gmail.com                   | Apple Team ID: WXY2PMFQB7                                          |
| Expo / EAS        | billygroble@gmail.com                   | Owner: `bgroble`                                                   |
| Railway           | TaistApp GitHub org                     | Linked via GitHub SSO — same org as the repo                       |
| Stripe            | Dayne/Daryl (ask them)                  | Account ID prefix: `51KWXqK...`                                    |
| Twilio            | Dayne/Daryl (ask them)                  | SID: `ACdb49fd...`, Phone: +1 (317) 854-6026                       |
| Firebase / GCP    | Dayne/Daryl (ask them)                  | Project: `taist-mobile-app` (likely same GCP project for Maps API) |
| Google Maps       | Dayne/Daryl (ask them)                  | Likely under same GCP project `taist-mobile-app`                   |
| Resend            | contact@taist.app                       | Email delivery service                                             |
| OpenAI            | contact@taist.app                       | AI features                                                        |
| SafeScreener      | Dayne/Daryl (ask them)                  | Chef background checks — currently sandbox mode                    |
| Domain DNS        | arnettfinancial.com (Network Solutions) | `taist.app` domain management                                      |

---

## Email Configuration

| Detail          | Value                                                             |
| --------------- | ----------------------------------------------------------------- |
| Sending service | Resend                                                            |
| From address    | `Taist <contact@taist.app>`                                       |
| Domain          | `taist.app`                                                       |
| DKIM            | Configured                                                        |
| SPF             | Needs update at Network Solutions (add `include:send.resend.com`) |

---

## Payment Flow

1. **Customer places order** — Stripe creates a payment intent
2. **Chef accepts** — payment is captured
3. **Chef gets paid** — via Stripe Connect (direct payouts to chef's bank)
4. **Refunds** — automatic for expired orders, manual via admin panel
5. **Saved cards** — customers can save payment methods for faster checkout
