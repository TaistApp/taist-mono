# Taist Technical Platform Overview

A non-technical guide to the technology powering the Taist platform.

---

## Platform Architecture

The Taist platform is built with modern, industry-standard technologies used by companies like Airbnb, Uber, and Shopify.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TAIST PLATFORM                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────┐        ┌─────────────────┐        ┌───────────┐  │
│   │   MOBILE APP    │        │     BACKEND     │        │  DATABASE │  │
│   │                 │◄──────►│     SERVER      │◄──────►│           │  │
│   │  iOS & Android  │        │                 │        │   MySQL   │  │
│   │  React Native   │  API   │  Laravel (PHP)  │        │           │  │
│   └─────────────────┘        └─────────────────┘        └───────────┘  │
│                                      │                                  │
│                                      ▼                                  │
│                         ┌─────────────────────────┐                    │
│                         │   THIRD-PARTY SERVICES  │                    │
│                         │  Stripe • Firebase • AI │                    │
│                         └─────────────────────────┘                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Mobile Application

### What It Is
A single codebase that runs on both **iPhone** and **Android** devices.

### Technology
| Component | Technology | What It Means |
|-----------|------------|---------------|
| **Framework** | React Native + Expo | Write code once, deploy to both iOS and Android |
| **Language** | TypeScript | Modern JavaScript with built-in error checking |
| **Navigation** | Expo Router | Handles moving between screens in the app |
| **State Management** | Redux | Keeps app data consistent across all screens |

### App Store Presence
| Platform | Store | Package ID |
|----------|-------|------------|
| **iOS** | Apple App Store | `org.taist.taist` |
| **Android** | Google Play Store | `com.taist.app` |

### Current Version
- **App Version:** 29.0.0
- **iOS Build:** 10
- **Android Build:** 146

---

## Backend Server

### What It Is
The "brain" of the platform that processes all requests, handles business logic, and manages data.

### Technology
| Component | Technology | What It Means |
|-----------|------------|---------------|
| **Framework** | Laravel 8 | Popular, secure PHP framework used by millions of apps |
| **Language** | PHP 8.2 | Server-side programming language |
| **API Style** | REST | Standard way for the app to communicate with the server |
| **Authentication** | OAuth 2.0 (Passport) | Secure login system with tokens |

### What The Backend Handles
- User registration and login
- Chef profiles and menu management
- Order processing and status updates
- Payment coordination with Stripe
- Notifications (push + SMS)
- AI-powered features
- Admin dashboard

---

## Database

### What It Is
Where all the platform's data is stored - users, orders, menus, reviews, etc.

### Technology
| Component | Technology | What It Means |
|-----------|------------|---------------|
| **Database** | MySQL | Industry-standard relational database |
| **Tables** | 19+ tables | Organized storage for different data types |

### Data Stored
```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE CONTENTS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   USERS              ORDERS             MENUS               │
│   ─────              ──────             ─────               │
│   • Customers        • Order details    • Menu items        │
│   • Chefs            • Status tracking  • Descriptions      │
│   • Admins           • Payment info     • Prices            │
│   • Profiles         • Discounts        • Customizations    │
│                                                             │
│   REVIEWS            MESSAGES           AVAILABILITY        │
│   ───────            ────────           ────────────        │
│   • Ratings          • Conversations    • Weekly schedules  │
│   • Comments         • Order chats      • Day overrides     │
│   • AI variants      • Read status      • Time slots        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Cloud Hosting (Railway)

### What It Is
The servers that run the backend are hosted on **Railway** - a modern cloud platform that simplifies deployment and scaling. Railway is trusted by thousands of companies for its ease of use and reliability.

### Server Setup
```
┌─────────────────────────────────────────────────────────────┐
│                   RAILWAY INFRASTRUCTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   PRODUCTION                       STAGING                  │
│   ──────────                       ───────                  │
│   • Live customer traffic          • Testing environment    │
│   • Real payments processed        • Safe for experiments   │
│   • Auto-scaling                   • Development builds     │
│   • Zero-downtime deploys          • Preview deployments    │
│                                                             │
│   Backend API                      Staging API              │
│   + MySQL Database                 + MySQL Database         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Why Railway?
| Feature | Description |
|---------|-------------|
| **Simple Deployments** | Push code to GitHub, Railway deploys automatically |
| **Auto-Scaling** | Handles traffic spikes automatically |
| **SSL/HTTPS** | All data encrypted in transit (automatic) |
| **Managed Database** | MySQL hosted and backed up by Railway |
| **Zero Config** | No server management needed |

---

## Third-Party Services

These are external services the platform integrates with to provide specialized functionality.

### Payment Processing - Stripe
```
┌─────────────────────────────────────────────────────────────┐
│                         STRIPE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   CUSTOMER PAYMENTS              CHEF PAYOUTS               │
│   • Credit card processing       • Direct bank deposits     │
│   • Secure card storage          • Automatic transfers      │
│   • Fraud protection             • Earnings dashboard       │
│   • Refund handling              • Tax documentation        │
│                                                             │
│   PCI Compliant = Bank-level security                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Notifications - Firebase & Twilio
| Service | Purpose |
|---------|---------|
| **Firebase Cloud Messaging** | Push notifications to phones |
| **Twilio** | SMS text messages |

**When Notifications Are Sent:**
- New order placed (to chef)
- Order accepted/rejected (to customer)
- Order completed
- New message in chat
- Order reminders

### AI Features - OpenAI
| Feature | What It Does |
|---------|--------------|
| **Menu Descriptions** | Auto-generates professional dish descriptions |
| **Grammar Check** | Fixes spelling and grammar in text |
| **Review Generation** | Creates varied reviews from authentic ones |

**Cost:** Less than $1/month for typical usage

### Maps & Location - Google Maps
| Feature | What It Does |
|---------|--------------|
| **Location Search** | Find chefs by ZIP code |
| **Address Validation** | Verify delivery addresses |
| **Distance Calculation** | Chef service area management |

---

## Development Environments

The platform runs in multiple environments to ensure quality and safety.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT PIPELINE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   LOCAL              STAGING              PRODUCTION                │
│   ─────              ───────              ──────────                │
│                                                                     │
│   Developer's        Test server          Live server               │
│   computer           for QA               for customers             │
│        │                  │                    │                    │
│        ▼                  ▼                    ▼                    │
│   ┌─────────┐        ┌─────────┐          ┌─────────┐              │
│   │  Code   │───────►│  Test   │─────────►│  Live   │              │
│   │ Changes │        │ Changes │          │ Release │              │
│   └─────────┘        └─────────┘          └─────────┘              │
│                                                                     │
│   Safe to break      Real data copy       Real customers            │
│   No real data       Test payments        Real payments             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| Environment | Purpose | Data |
|-------------|---------|------|
| **Local** | Developer testing on their computer | Fake test data |
| **Staging** | Quality assurance testing | Copy of real data |
| **Production** | Live app for real users | Real customer data |

---

## Version Control (GitHub)

### What It Is
GitHub stores all the code and tracks every change ever made. Think of it as "Google Docs for code" with complete history.

### How It Works
```
┌─────────────────────────────────────────────────────────────┐
│                        GITHUB                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   CODE REPOSITORY                                           │
│   ───────────────                                           │
│   • All frontend code (mobile app)                          │
│   • All backend code (server)                               │
│   • Documentation                                           │
│   • Configuration files                                     │
│                                                             │
│   BENEFITS                                                  │
│   ────────                                                  │
│   • Complete history of all changes                         │
│   • Multiple developers can work simultaneously             │
│   • Rollback to any previous version if needed              │
│   • Code review before changes go live                      │
│   • Automatic backups                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Repository Structure
```
taist-mono/
├── frontend/          ← Mobile app code (React Native)
├── backend/           ← Server code (Laravel PHP)
├── docs/              ← Documentation
└── scripts/           ← Automation tools
```

---

## Technology Summary

### Frontend (Mobile App)
| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81 | Cross-platform mobile framework |
| Expo | 54.0 | Development tools and services |
| TypeScript | 5.9 | Type-safe JavaScript |
| Redux | 5.0 | State management |

### Backend (Server)
| Technology | Version | Purpose |
|------------|---------|---------|
| Laravel | 8.x | PHP web framework |
| PHP | 8.2 | Server language |
| MySQL | 8.0 | Database |
| Apache | 2.4 | Web server |

### Infrastructure
| Service | Provider | Purpose |
|---------|----------|---------|
| Hosting | Railway | Server & database hosting |
| Payments | Stripe | Payment processing |
| Push Notifications | Firebase | Mobile notifications |
| SMS | Twilio | Text messages |
| AI | OpenAI | Smart features |
| Maps | Google | Location services |

---

## Security Overview

| Layer | Protection |
|-------|------------|
| **Transport** | HTTPS/SSL encryption for all data |
| **Authentication** | OAuth 2.0 tokens, secure password hashing |
| **Payments** | PCI-compliant via Stripe (no card data stored) |
| **Infrastructure** | Railway's built-in security, automatic SSL |
| **Code** | Private GitHub repository, code reviews |

---

## Scalability

The platform is built to grow:

| Aspect | Current | Can Scale To |
|--------|---------|--------------|
| **Users** | Hundreds | Thousands+ |
| **Orders/Day** | Dozens | Hundreds+ |
| **Server** | Railway | Auto-scales as needed |

**Scaling Benefits with Railway:**
- Automatic scaling based on traffic
- No manual server management
- Easy to add more resources
- Built-in load balancing

---

## Maintenance & Updates

| Task | Frequency | Description |
|------|-----------|-------------|
| **App Updates** | As needed | New features, bug fixes |
| **Server Updates** | Monthly | Security patches |
| **Database Backups** | Daily | Automated snapshots |
| **Monitoring** | 24/7 | Automated alerts for issues |

---

## Summary

Taist is built on **proven, enterprise-grade technologies**:

- **Mobile:** React Native provides native iOS & Android apps from one codebase
- **Backend:** Laravel/PHP handles all business logic securely
- **Database:** MySQL stores all data reliably
- **Hosting:** Railway provides scalable, secure cloud infrastructure
- **Payments:** Stripe ensures PCI-compliant payment processing
- **AI:** OpenAI powers smart features at minimal cost

The platform follows industry best practices with separate staging/production environments, version control via GitHub, and automated security through Cloudflare.

---

*Document generated January 2026*
