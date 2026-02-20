# Local Development Quick Start

Your local environment is **fully configured** with database and test data ready to use!

## Start Development

### Terminal 1: Backend
```bash
cd backend
php artisan serve --port=8005
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev:local        # Points to local backend
```

That's it! Backend runs at `http://127.0.0.1:8005`, frontend opens in Expo.

---

## Test Accounts

All passwords are: `password`

### Chefs
- `maria.chef@test.com` - Mexican cuisine (Chicago)
- `james.chef@test.com` - Asian fusion (Chicago)
- `sarah.chef@test.com` - Vegan (Chicago)

### Customers
- `john.customer@test.com` - Chicago customer
- `emily.customer@test.com` - Chicago customer

---

## Environment Switching

```bash
npm run dev:local      # Local backend (development)
npm run dev:staging    # Staging backend (testing)
npm run dev:prod       # Production backend (careful!)
```

---

## What's in the Database

- 58 activated Chicago zip codes
- 3 verified chefs with full profiles
- 9 live menu items ($12-$25 each)
- 8 food categories
- 8 allergens
- 6 appliances
- 7 menu customizations

---

## Database Access

```bash
# Access database
mysql -u root taist_local

# View users
SELECT id, email, user_type FROM tbl_users;

# View menus
SELECT id, title, price FROM tbl_menus;
```

**Connection**: `root@localhost/taist_local` (no password)

---

## Health Check

```bash
# Backend responding?
curl http://127.0.0.1:8005/mapi/get-version

# Should return: {"success":1,"data":[{"version":"1.0.0",...}]}
```

---

## Quick Fixes

### "Port 8005 already in use"
```bash
lsof -i :8005          # Find what's using it
kill -9 <PID>          # Kill it
php artisan serve --port=8005  # Restart
```

### "Can't connect to MySQL"
```bash
brew services start mysql     # macOS
sudo systemctl start mysql    # Linux
```

### "Network request failed" in app
- Ensure backend is running
- Check you ran `npm run dev:local` (not just `npm start`)

---

## Full Documentation

- **Complete Guide**: [local-development.md](./local-development.md)
- **Backend Details**: [backend/README.md](../../backend/README.md)
- **Frontend Details**: [frontend/README.md](../../frontend/README.md)

---

## Common Tasks

### Reset Database
```bash
cd backend
php artisan migrate:fresh
php artisan db:seed --class=LocalTestDataSeeder
```

### Clear Caches
```bash
# Backend
php artisan cache:clear
php artisan config:clear

# Frontend
npm start -- --clear
```

### View Logs
```bash
tail -f backend/storage/logs/laravel.log
```

---

Last updated: December 2, 2025
