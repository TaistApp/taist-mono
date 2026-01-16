# Environment Configuration

Complete reference for all environment variables and configuration settings.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Laravel](#core-laravel)
3. [Database](#database)
4. [External Services](#external-services)
5. [Frontend Configuration](#frontend-configuration)
6. [Environment Files](#environment-files)

---

## Overview

Configuration is managed through environment variables in `.env` files.

**Files:**
- Backend: `backend/.env`
- Frontend: `frontend/.env`

---

## Core Laravel

### Application

```env
APP_NAME=Taist
APP_ENV=local                    # local, staging, production
APP_KEY=base64:...               # Generated with php artisan key:generate
APP_DEBUG=true                   # false in production
APP_URL=http://localhost:8000
```

### Logging

```env
LOG_CHANNEL=stack                # stack, single, daily, slack
LOG_LEVEL=debug                  # debug, info, warning, error
```

### Session & Cache

```env
SESSION_DRIVER=file              # file, cookie, database, redis
SESSION_LIFETIME=120             # Minutes
CACHE_DRIVER=file                # file, redis, memcached
```

---

## Database

### MySQL Configuration

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=taist_db
DB_USERNAME=root
DB_PASSWORD=secret
```

### Railway Database

```env
# Railway provides these automatically
MYSQLHOST=containers-us-west-xxx.railway.app
MYSQLPORT=6543
MYSQLDATABASE=railway
MYSQLUSERNAME=root
MYSQLPASSWORD=xxxxxx

# Or as URL
DATABASE_URL=mysql://root:pass@host:port/database
```

---

## External Services

### Stripe (Payments)

```env
# Backend
STRIPE_KEY=sk_live_...           # Secret key (server-side)
STRIPE_PUBLISHABLE_KEY=pk_live_... # Public key
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing

# Test mode
STRIPE_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Firebase (Push Notifications)

```env
# Backend - Firebase Admin SDK
FIREBASE_CREDENTIALS={"type":"service_account",...}
# Or path to credentials file
FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json

# Project ID
FIREBASE_PROJECT_ID=taist-app-xxxxx
```

### Twilio (SMS)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### SendGrid (Email)

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.xxxxxxxxxx
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@taist.com
MAIL_FROM_NAME="Taist"
```

### OpenAI (AI Features)

```env
OPENAI_API_KEY=sk-xxxxxxxxxx
OPENAI_MODEL=gpt-5-mini          # Default model for AI features
```

### Google Maps

```env
GOOGLE_MAPS_API_KEY=AIzaxxxxxxxxxx
```

---

## Frontend Configuration

### API Configuration

```env
# Frontend .env
EXPO_PUBLIC_API_URL=https://api.taist.com
EXPO_PUBLIC_API_VERSION=v1
```

### Stripe (React Native)

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Firebase (React Native)

```env
# iOS
EXPO_PUBLIC_FIREBASE_IOS_API_KEY=xxxxxxxxxx
EXPO_PUBLIC_FIREBASE_IOS_APP_ID=1:xxxx:ios:xxxx

# Android
EXPO_PUBLIC_FIREBASE_ANDROID_API_KEY=xxxxxxxxxx
EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID=1:xxxx:android:xxxx
```

### Google Maps (React Native)

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaxxxxxxxxxx
```

### Feature Flags

```env
EXPO_PUBLIC_ENABLE_AI_FEATURES=true
EXPO_PUBLIC_ENABLE_DEV_SCREEN=false
```

---

## Environment Files

### Backend (.env.example)

```env
# Application
APP_NAME=Taist
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=taist_db
DB_USERNAME=root
DB_PASSWORD=

# Cache & Session
CACHE_DRIVER=file
SESSION_DRIVER=file
SESSION_LIFETIME=120

# Queue
QUEUE_CONNECTION=sync

# Stripe
STRIPE_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=

# Firebase
FIREBASE_CREDENTIALS=
FIREBASE_PROJECT_ID=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# SendGrid
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@taist.com
MAIL_FROM_NAME="Taist"

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini

# Google Maps
GOOGLE_MAPS_API_KEY=
```

### Frontend (.env.example)

```env
# API
EXPO_PUBLIC_API_URL=http://localhost:8000/mapi

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Firebase iOS
EXPO_PUBLIC_FIREBASE_IOS_API_KEY=
EXPO_PUBLIC_FIREBASE_IOS_APP_ID=

# Firebase Android
EXPO_PUBLIC_FIREBASE_ANDROID_API_KEY=
EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID=

# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=

# Features
EXPO_PUBLIC_ENABLE_AI_FEATURES=true
EXPO_PUBLIC_ENABLE_DEV_SCREEN=false
```

---

## Environment-Specific Settings

### Development

```env
APP_ENV=local
APP_DEBUG=true
STRIPE_KEY=sk_test_...
```

### Staging

```env
APP_ENV=staging
APP_DEBUG=true
STRIPE_KEY=sk_test_...          # Still test keys
```

### Production

```env
APP_ENV=production
APP_DEBUG=false                  # Never true in production
STRIPE_KEY=sk_live_...          # Live keys
LOG_LEVEL=error                 # Less verbose logging
```

---

## Accessing Configuration

### Backend (Laravel)

```php
// Using env() helper
$stripeKey = env('STRIPE_KEY');

// Using config() (preferred - cached)
$stripeKey = config('services.stripe.key');

// In config/services.php
'stripe' => [
    'key' => env('STRIPE_KEY'),
    'secret' => env('STRIPE_PUBLISHABLE_KEY'),
],
```

### Frontend (Expo)

```typescript
// Access via process.env
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// In constants file
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
```

---

## Security Notes

1. **Never commit .env files** - Add to `.gitignore`
2. **Use .env.example** - Template without secrets
3. **Rotate keys regularly** - Especially after team changes
4. **Different keys per environment** - Test vs production
5. **Limit access** - Only necessary team members
