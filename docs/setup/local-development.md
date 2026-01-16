# Local Development Guide

Complete guide for setting up and running Taist locally with test data.

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Prerequisites](#-prerequisites)
- [Database Setup](#-database-setup)
- [Test Accounts](#-test-accounts)
- [Environment Switching](#-environment-switching)
- [Troubleshooting](#-troubleshooting)
- [Database Information](#-database-information)

---

## ⚡ Quick Start

**Already set up?** Just run these:

```bash
# Terminal 1: Backend
cd backend
php artisan serve --port=8000

# Terminal 2: Frontend
cd frontend
npm run dev:local
```

**First time?** Continue reading below.

---

## 📦 Prerequisites

### Backend
- **PHP 8.2+** (installed via Homebrew)
- **Composer** (PHP package manager)
- **MySQL 8.0** (running via `brew services start mysql`)

### Frontend
- **Node.js 18+**
- **npm** or **yarn**
- **Expo CLI** (installed globally or via npx)

### Mobile Testing
- **iOS**: Xcode with iOS Simulator
- **Android**: Android Studio with emulator
- **Physical Device**: Expo Go app installed

---

## 🗄️ Database Setup

The local database is **already configured** with:
- ✅ Exact schema from staging (24 tables)
- ✅ Laravel Passport for API auth
- ✅ Comprehensive test data

### Database Details
- **Host**: 127.0.0.1
- **Database**: taist_local
- **User**: root
- **Password**: (none)

### Access Database
```bash
mysql -u root taist_local
```

### Reset Database (if needed)
```bash
cd backend

# Drop and recreate all tables
mysql -u root taist_local < database/taist-schema.sql

# Repopulate with test data
php artisan db:seed --class=LocalTestDataSeeder
```

---

## 🚀 Starting the Application

### Backend Server

```bash
cd backend
php artisan serve --port=8000
```

**Expected output**:
```
Laravel development server started: http://127.0.0.1:8000
```

**Test it works**:
```bash
curl http://127.0.0.1:8000/mapi/get-version
# Should return: {"success":1,"data":[{"version":"1.0.0",...}]}
```

### Frontend Application

```bash
cd frontend
npm run dev:local
```

This will:
- Start the Expo dev server
- Configure API to point to `http://127.0.0.1:8000`
- Show a QR code to scan with Expo Go app

**Platform-specific commands**:
```bash
npm run ios:local      # Open in iOS Simulator
npm run android:local  # Open in Android Emulator
```

---

## 👤 Test Accounts

All passwords are: **`password`**

### Chefs (user_type = 2)

**Maria Rodriguez** - Mexican Cuisine
- Email: `maria.chef@test.com`
- Phone: `+13125551001`
- Location: 123 W Madison St, Chicago, IL 60602
- Menu Items: 3 (Tacos, Enchiladas, Quesadilla)

**James Chen** - Asian Fusion
- Email: `james.chef@test.com`
- Phone: `+13125551002`
- Location: 456 N State St, Chicago, IL 60610
- Menu Items: 3 (Kung Pao, Pad Thai, Salmon Bowl)

**Sarah Williams** - Vegan
- Email: `sarah.chef@test.com`
- Phone: `+13125551003`
- Location: 789 S Michigan Ave, Chicago, IL 60605
- Menu Items: 3 (Buddha Bowl, Risotto, Jackfruit Tacos)

### Customers (user_type = 1)

**John Smith**
- Email: `john.customer@test.com`
- Phone: `+13125552001`
- Location: 321 E Ohio St, Chicago, IL 60611

**Emily Johnson**
- Email: `emily.customer@test.com`
- Phone: `+13125552002`
- Location: 654 W Randolph St, Chicago, IL 60661

---

## 🌍 Environment Switching

The frontend supports three environments:

| Environment | Backend URL | Usage |
|------------|-------------|-------|
| **local** | http://localhost:8000 | Development on your machine |
| **staging** | https://taist-mono-staging.up.railway.app | Testing before production |
| **production** | https://taist-mono-production.up.railway.app | Live application |

### Switch Environments

```bash
# Local (development)
npm run dev:local
npm run ios:local
npm run android:local

# Staging (testing)
npm run dev:staging
npm run ios:staging
npm run android:staging

# Production (careful!)
npm run dev:prod
npm run ios:prod
npm run android:prod
```

### How It Works

The environment is set via the `APP_ENV` environment variable:

```javascript
// frontend/app/services/api.ts
const APP_ENV = process.env.APP_ENV || 'local';

if (APP_ENV === 'local') {
  BASE_URL = 'http://localhost:8000/mapi/';
} else if (APP_ENV === 'staging') {
  BASE_URL = 'https://taist-mono-staging.up.railway.app/mapi/';
} else {
  BASE_URL = 'https://taist-mono-production.up.railway.app/mapi/';
}
```

---

## 📊 Test Data Summary

### Users
- **3 Chefs**: All verified, active, with complete profiles and availability
- **2 Customers**: Ready to place orders

### Menu System
- **9 Menu Items**: $12-$25 price range
- **8 Categories**: Mexican, Asian, Vegan, Italian, American, Indian, Mediterranean, BBQ
- **7 Customizations**: Add-ons for select menu items
- **8 Allergens**: Gluten, Dairy, Eggs, Peanuts, Tree Nuts, Soy, Fish, Shellfish
- **6 Appliances**: Oven, Microwave, Stovetop, Air Fryer, Instant Pot, Grill

### Service Areas
- **58 Activated ZIP Codes**: Chicago area (60601-60714)

### Menu Items by Chef

**Maria Rodriguez (Mexican)**
- Authentic Chicken Tacos (3 pack) - $15
- Beef Enchiladas with Red Sauce - $22
- Veggie Quesadilla - $12

**James Chen (Asian)**
- Kung Pao Chicken - $18
- Pad Thai - $20
- Teriyaki Salmon Bowl - $25

**Sarah Williams (Vegan)**
- Buddha Bowl - $16
- Vegan Mushroom Risotto - $19
- Jackfruit Tacos (3 pack) - $14

---

## 🗂️ Database Schema

The database contains 24 tables matching staging exactly:

### Core Tables
- `tbl_users` - Customers and chefs
- `tbl_menus` - Menu items
- `tbl_orders` - Customer orders
- `tbl_categories` - Food categories
- `tbl_customizations` - Menu add-ons

### Support Tables
- `tbl_allergens` - Allergen information
- `tbl_appliances` - Kitchen equipment
- `tbl_zipcodes` - Service areas
- `tbl_availabilities` - Chef schedules
- `tbl_reviews` - Ratings and reviews
- `tbl_conversations` - Chat messages
- `tbl_transactions` - Payment records
- `tbl_payment_method_listener` - Stripe payment methods

### Auth Tables
- `oauth_*` - Laravel Passport tables
- `notifications` - Push notifications

### Inspect Tables
```sql
-- View all tables
SHOW TABLES;

-- Check users
SELECT id, first_name, last_name, email, user_type, verified FROM tbl_users;

-- Check menus
SELECT id, user_id, title, price, is_live FROM tbl_menus;

-- Check activated zipcodes
SELECT * FROM tbl_zipcodes;
```

---

## 🐛 Troubleshooting

### Backend won't start

**"Port 8000 already in use"**
```bash
lsof -i :8000
kill -9 <PID>
php artisan serve --port=8000
```

**"Can't connect to MySQL"**
```bash
# Check MySQL is running
brew services list

# Start MySQL
brew services start mysql

# Test connection
mysql -u root -p
```

**PHP version issues**
```bash
# Check PHP version (should be 8.2.x)
php -v

# If wrong version, switch to PHP 8.2
brew link php@8.2 --force
```

### Frontend can't reach backend

**"Network request failed"**
1. Verify backend is running: `curl http://127.0.0.1:8000/mapi/get-version`
2. Ensure you ran `npm run dev:local` (not just `npm start`)
3. Check Metro bundler shows "Environment: local"

**Physical device can't connect**

Your device needs to use your computer's IP address, not "localhost":

```bash
# Find your computer's IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Example output: inet 192.168.1.100
```

Then temporarily update the API URL:
```typescript
// frontend/app/services/api.ts
// Change localhost to your IP:
BASE_URL: 'http://192.168.1.100:8000/mapi/',
```

Or set `LOCAL_IP` in `frontend/app.json`:
```json
{
  "expo": {
    "extra": {
      "LOCAL_IP": "192.168.1.100"
    }
  }
}
```

### Database issues

**"Table doesn't exist"**
```bash
cd backend
mysql -u root taist_local < database/taist-schema.sql
php artisan db:seed --class=LocalTestDataSeeder
```

**Need fresh start**
```bash
# Drop database
mysql -u root -e "DROP DATABASE IF EXISTS taist_local; CREATE DATABASE taist_local;"

# Reimport schema
mysql -u root taist_local < backend/database/taist-schema.sql

# Seed data
cd backend
php artisan passport:install
php artisan db:seed --class=LocalTestDataSeeder
```

### App crashes or weird behavior

**Clear all caches**
```bash
# Backend
cd backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear
composer dump-autoload

# Frontend
cd frontend
npm start -- --clear
rm -rf node_modules/.cache
```

---

## 🔧 Common Tasks

### View Logs

```bash
# Backend logs (real-time)
tail -f backend/storage/logs/laravel.log

# Frontend logs (Metro bundler shows in terminal)
```

### Database Management

```bash
# Access database
mysql -u root taist_local

# Export database
mysqldump -u root taist_local > backup.sql

# Import database
mysql -u root taist_local < backup.sql

# Reset with fresh data
php artisan migrate:fresh
php artisan db:seed --class=LocalTestDataSeeder
```

### Testing API Endpoints

```bash
# Get version
curl http://127.0.0.1:8000/mapi/get-version

# Login (get auth token)
curl -X POST http://127.0.0.1:8000/mapi/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.customer@test.com","password":"password"}'

# Get allergens (requires auth)
curl http://127.0.0.1:8000/mapi/get_allergens \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📝 Important Notes

### PHP Version
- Backend uses **PHP 8.2+** with Laravel 8
- Staging/production use the same PHP version

### Database Schema
- Schema exported directly from staging
- All timestamps stored as `varchar(50)` in "Y-m-d H:i:s" format
- No foreign key constraints (legacy design)

### API Authentication
- Most endpoints require authentication via `auth:mapi` middleware
- Public endpoints: `register`, `login`, `forgot`, `reset_password`, `verify_phone`, `get-version`
- Auth uses Laravel Passport (OAuth2)

### File Storage
- User photos: `backend/public/assets/uploads/images/`
- Menu images: Same directory
- Logs: `backend/storage/logs/`

---

## 🎯 Testing New Features

### Test the New Signup Flow (TMA-002)

1. Start both backend and frontend locally
2. Open app in Expo
3. Navigate to signup
4. Complete the multi-step flow:
   - Basic Profile (name, email, phone)
   - Location (ZIP code with GPS)
   - Preferences (dietary, notifications)
   - Permissions (location, notifications)
5. Verify user created in database:
   ```sql
   SELECT * FROM tbl_users ORDER BY id DESC LIMIT 1;
   ```

### Test Address Collection

1. Login as customer without address
2. Add items to cart
3. Go to checkout
4. Address collection modal should appear
5. Fill in address with GPS assistance
6. Verify saved in database:
   ```sql
   SELECT id, email, address, city, state, zip FROM tbl_users WHERE id = YOUR_ID;
   ```

---

## Getting Help

1. **Check the quick guide**: [quick-start.md](./quick-start.md)
2. **Review backend logs**: `tail -f backend/storage/logs/laravel.log`
3. **Test API manually**: Use `curl` commands above
4. **Inspect database**: Use MySQL queries above
5. **Check environment**: Verify "Environment: local" in Metro bundler

Common issues are usually:
- MySQL not running
- Wrong database credentials
- Backend not started
- Wrong environment selected
- Port conflicts

---

## Additional Resources

- [Quick Reference](./quick-start.md)
- [Backend README](../../backend/README.md)
- [Frontend README](../../frontend/README.md)

---

Your local environment is fully configured and ready for development!

---

*Last updated: December 2, 2025*
