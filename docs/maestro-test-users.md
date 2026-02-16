# Maestro Test Users

Pre-seeded accounts for Maestro E2E testing. These users are **local/staging only** and should never be seeded in production.

## Quick Reference

**Password for all accounts:** `maestro123`

### Customers

| ID  | Name             | Email                            | Notes          |
| --- | ---------------- | -------------------------------- | -------------- |
| 100 | Test Customer    | `maestro+customer1@test.com`     | General flows  |
| 101 | Browse Customer  | `maestro+customer2@test.com`     | Browse/search  |
| 102 | Order Customer   | `maestro+customer3@test.com`     | Order flows    |
| 103 | New Customer     | `maestro+customer-new@test.com`  | No address set |

### Chefs (active & verified)

| ID  | Name           | Email                        | Schedule         | Has Menus |
| --- | -------------- | ---------------------------- | ---------------- | --------- |
| 110 | Active Chef    | `maestro+chef1@test.com`     | Every day 8-22   | Yes (2)   |
| 111 | Menu Chef      | `maestro+chef2@test.com`     | Weekdays 10-20   | No        |
| 112 | Schedule Chef  | `maestro+chef3@test.com`     | Every day 12-18  | No        |

### Chefs (edge cases)

| ID  | Name          | Email                              | State                    |
| --- | ------------- | ---------------------------------- | ------------------------ |
| 113 | Pending Chef  | `maestro+chef-pending@test.com`    | Unverified, pending approval |
| 114 | NoQuiz Chef   | `maestro+chef-noquiz@test.com`     | Verified but quiz incomplete |

## Usage

### Seeding locally

```bash
cd backend
php artisan db:seed --class="Database\Seeders\MaestroTestUserSeeder"
```

The seeder is **idempotent** — it deletes all `maestro+*@test.com` users and their related data before re-inserting, so it's safe to re-run anytime to reset state.

### In Maestro flows (via MCP)

Pass credentials as env vars when running flows:

```yaml
# In your flow file, reference with ${CUSTOMER_EMAIL}, ${PASSWORD}, etc.
- tapOn: "Email"
- inputText: ${CUSTOMER_EMAIL}
- tapOn: "Password"
- inputText: ${PASSWORD}
```

When calling `run_flow` via the Maestro MCP tool, pass the env parameter:

```json
{
  "env": {
    "CUSTOMER_EMAIL": "maestro+customer1@test.com",
    "PASSWORD": "maestro123"
  }
}
```

Or use the env file at `frontend/.maestro/test-users.env.yaml` which has all credentials pre-defined.

### Available env vars (from test-users.env.yaml)

```
PASSWORD              maestro123
CUSTOMER_EMAIL        maestro+customer1@test.com
CUSTOMER2_EMAIL       maestro+customer2@test.com
CUSTOMER3_EMAIL       maestro+customer3@test.com
CUSTOMER_NEW_EMAIL    maestro+customer-new@test.com
CHEF_EMAIL            maestro+chef1@test.com
CHEF2_EMAIL           maestro+chef2@test.com
CHEF3_EMAIL           maestro+chef3@test.com
CHEF_PENDING_EMAIL    maestro+chef-pending@test.com
CHEF_NOQUIZ_EMAIL     maestro+chef-noquiz@test.com
```

## Why these users are invisible in production

- The seeder is **never run in production** — only locally or on staging
- All emails use the `maestro+*@test.com` pattern, making them trivial to filter:
  ```sql
  WHERE email NOT LIKE 'maestro+%@test.com'
  ```
- User IDs 100-119 are reserved for Maestro to avoid collisions with real data

## Files

| File | Purpose |
| ---- | ------- |
| `backend/database/seeds/MaestroTestUserSeeder.php` | Seeder class |
| `frontend/.maestro/test-users.env.yaml` | Env vars for Maestro flows |
| `docs/maestro-test-users.md` | This doc |
