# Taist Monorepo

## Project Structure

- `backend/` — Laravel 8 API (PHP)
- `frontend/` — React Native (Expo) mobile app
- `docs/` — Project documentation

## Key Paths

| What | Path |
| ---- | ---- |
| User model | `backend/app/Listener.php` (table: `tbl_users`) |
| Mobile API controller | `backend/app/Http/Controllers/MapiController.php` |
| Mobile API routes | `backend/routes/mapi.php` |
| Frontend API service | `frontend/app/services/api.ts` |
| Auth config | `backend/config/auth.php` |
| Database schema | `backend/database/taist-schema.sql` |

## Auth System

- Token-based auth via `api_token` field on `tbl_users`
- Mobile API guard: `mapi` (token-based, uses `Listener` model)
- All API requests require `Authorization: Bearer {token}` + hardcoded `apiKey` header
- User types: `1` = customer, `2` = chef
- Verified states: `0` = pending, `1` = active, `2` = denied, `3` = banned

## Maestro E2E Test Users

Pre-seeded accounts for automated UI testing. **Never seed these in production.**

### Seeding

```bash
cd backend
php artisan db:seed --class="Database\Seeders\MaestroTestUserSeeder"
```

The seeder is idempotent (deletes `maestro+*@test.com` users before re-inserting).

### Credentials

**Password for all:** `maestro123`

| ID  | Email                            | Role     | Purpose                        |
| --- | -------------------------------- | -------- | ------------------------------ |
| 100 | `maestro+customer1@test.com`     | Customer | General customer flows         |
| 101 | `maestro+customer2@test.com`     | Customer | Browse/search testing          |
| 102 | `maestro+customer3@test.com`     | Customer | Order flow testing             |
| 103 | `maestro+customer-new@test.com`  | Customer | New user (no address)          |
| 110 | `maestro+chef1@test.com`         | Chef     | Active, has menus + full sched |
| 111 | `maestro+chef2@test.com`         | Chef     | Weekday-only schedule          |
| 112 | `maestro+chef3@test.com`         | Chef     | Narrow hours schedule          |
| 113 | `maestro+chef-pending@test.com`  | Chef     | Unverified / pending           |
| 114 | `maestro+chef-noquiz@test.com`   | Chef     | Quiz not completed             |

### Using in Maestro Flows

Pass credentials via env vars when calling `run_flow`:

```json
{
  "env": {
    "CUSTOMER_EMAIL": "maestro+customer1@test.com",
    "PASSWORD": "maestro123"
  }
}
```

All env vars are defined in `frontend/.maestro/test-users.env.yaml`.

Available vars: `PASSWORD`, `CUSTOMER_EMAIL`, `CUSTOMER2_EMAIL`, `CUSTOMER3_EMAIL`, `CUSTOMER_NEW_EMAIL`, `CHEF_EMAIL`, `CHEF2_EMAIL`, `CHEF3_EMAIL`, `CHEF_PENDING_EMAIL`, `CHEF_NOQUIZ_EMAIL`.

### Files

- Seeder: `backend/database/seeds/MaestroTestUserSeeder.php`
- Env config: `frontend/.maestro/test-users.env.yaml`
- Full docs: `docs/maestro-test-users.md`

## Local Development

- **Laravel backend port: 8002** (port 8000 is used by another local service)
- Start backend: `cd backend && php artisan serve --host=0.0.0.0 --port=8002`
- Frontend local API URLs point to `localhost:8002`

## Database

- Local: MySQL (`taist_local`, root, no password)
- Tables use `tbl_` prefix (e.g., `tbl_users`, `tbl_menus`, `tbl_availabilities`)
- Seeders in `backend/database/seeds/`
- `LocalTestDataSeeder` — manual test data (IDs 1-5)
- `MaestroTestUserSeeder` — automated test data (IDs 100-119)
