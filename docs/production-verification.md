# Production Verification System

Reusable system for verifying deployments on staging or production.

## Quick Start

```bash
# Verify production (default)
./scripts/verify-production.sh

# Verify staging
./scripts/verify-production.sh staging
```

The script will:
1. Create temporary test accounts (customer + chef)
2. Run automated URL + API checks
3. Pause for ad-hoc Maestro testing
4. Clean up accounts on exit (Enter or Ctrl+C)

## Prerequisites

- Railway CLI installed and logged in (`npm i -g @railway/cli`)
- Project linked (`cd backend && railway link`)
- `jq` installed (`brew install jq`)
- The `verify:accounts` command deployed to the target environment

## Artisan Command (Standalone Usage)

```bash
# Create temp accounts
php artisan verify:accounts create
php artisan verify:accounts create --json    # for script consumption

# Check if any exist
php artisan verify:accounts status

# Delete all temp accounts
php artisan verify:accounts cleanup
```

Via Railway:
```bash
cd backend
railway run -e production -- php artisan verify:accounts create
railway run -e production -- php artisan verify:accounts cleanup
```

## Account Details

| Account | Email | Location |
|---------|-------|----------|
| Customer | `prodverify+customer@taist.app` | Chicago (41.8838, -87.6278) |
| Chef | `prodverify+chef@taist.app` | Chicago (41.8910, -87.6244) |

- Auto-increment IDs (no hardcoded IDs)
- Chef has full schedule (7 days, 08:00-22:00) + 1 live menu item
- Cleanup finds accounts by email pattern, not stored IDs

## Safety

- Email pattern `prodverify+*@taist.app` cannot collide with real users
- Shell `trap EXIT` guarantees cleanup even on Ctrl+C
- `cleanup` is idempotent - safe to run multiple times
- `status` detects orphaned accounts anytime
- **Daily cron safety net:** Scheduled at 3:00 AM via Laravel Kernel, runs `verify:accounts cleanup --max-age=120` — only removes accounts older than 2 hours, so it won't interfere with an active session
- Cleanup **only** deletes rows matching `prodverify+%@taist.app` — no real user data is ever touched

## What Gets Checked

**Automated (curl):**
- TMA-036: Privacy policy + terms pages (HTTP 200)
- TMA-064: Account deletion page + /contact redirect
- TMA-055: /open/inbox deep link redirect
- TMA-061: Chef search API (chef appears for customer)
- Chef menus + availability API endpoints

**Ad-hoc (Maestro, during pause):**
- TMA-054: Report issue icon + form
- General app navigation
- Whatever else needs checking
