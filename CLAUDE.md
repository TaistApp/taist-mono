# Taist Monorepo

A food marketplace connecting customers with local chefs — Laravel API + React Native (Expo) mobile app.

**Keep this file under 100 lines.** Move details to `docs/` and link from here.

## Rules

1. **No task is done until verified** — run commands, tests, or Maestro flows to prove it works
2. **No task is done until documented** — update CLAUDE.md, docs, seeders, and env configs as needed
3. **Keep this file concise** — reference `docs/` for details, don't duplicate

## Project Structure

- `backend/` — Laravel 8 API (PHP)
- `backend/admin-panel/` — Admin panel SPA (React + Vite + shadcn/ui), auto-built on Railway deploy via `railpack.json`
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

- Token-based auth via `api_token` on `tbl_users`
- Mobile API guard: `mapi` (token-based, uses `Listener` model)
- Requests require `Authorization: Bearer {token}` + hardcoded `apiKey` header
- User types: `1` = customer, `2` = chef
- Verified states: `0` = pending, `1` = active, `2` = denied, `3` = banned

## Timestamp Convention (CRITICAL)

**Railway runs in UTC.** Never use `date('l', $timestamp)` or `date('Y-m-d', $timestamp)` for availability or scheduling — evening US orders resolve to the wrong day. Use `order_date_string` (YYYY-MM-DD) and `order_time_string` (HH:mm) string fields instead. Full details: `docs/features/chef-availability-system.md` (Timestamp Convention section).

## Maestro E2E Testing

**Never seed in production.** Full details: `docs/maestro-test-users.md` | Conventions: `docs/maestro-conventions.md`

- Seed: `php artisan db:seed --class="Database\Seeders\MaestroTestUserSeeder"` (idempotent)
- Env vars: `frontend/.maestro/test-users.env.yaml`

## Production Verification

Reusable system for post-deploy checks. Full details: `docs/production-verification.md`

- Creates temp accounts (`prodverify+*@taist.app`), runs checks, **always cleans up**
- Run: `./scripts/verify-production.sh [staging|production]`
- Manual: `php artisan verify:accounts create|cleanup|status`
- Daily 3am cron catches orphaned accounts older than 2 hours

## Commands

| Action | Command |
| ------ | ------- |
| Start backend | `cd backend && php artisan serve --host=0.0.0.0 --port=8005` |
| Run migrations | `cd backend && php artisan migrate` |
| Seed test users | `cd backend && php artisan db:seed --class="Database\Seeders\MaestroTestUserSeeder"` |
| Start frontend (local) | `cd frontend && npm run dev:local` |
| Start frontend (staging) | `cd frontend && npm run start` |
| Lint frontend | `cd frontend && npm run lint` |
| Run Maestro tests | `maestro test frontend/.maestro/` |
| Verify production | `./scripts/verify-production.sh production` |
| Verify staging | `./scripts/verify-production.sh staging` |
| Create verify accounts | `cd backend && php artisan verify:accounts create` |
| Cleanup verify accounts | `cd backend && php artisan verify:accounts cleanup` |
| Build admin panel locally | `cd backend/admin-panel && npm run build` |

## EAS Build Commands

Slash commands for building and deploying the mobile app. Auto-bumps build numbers, builds on EAS, submits iOS to TestFlight/App Store, and posts Android APKs to Slack.

| Command | What it does |
| ------- | ------------ |
| `/build preview` | Both platforms, iOS → TestFlight, Android APK → #android-builds |
| `/build preview-ios` | iOS only → TestFlight |
| `/build preview-android` | Android only → #android-builds |
| `/build production` | Both platforms, iOS → App Store |
| `/build production-ios` | iOS only → App Store |
| `/build production-android` | Android only |

Details: `.claude/commands/build.md` | Polling script: `scripts/wait-for-eas-build.sh`

## Branching & Deployment

- **`staging` branch** → Railway staging environment (auto-deploys on push)
- **`main` branch** → Railway production environment (auto-deploys on push)
- Workflow: feature branches → PR to `staging` → test → PR from `staging` to `main`
- Frontend (Expo/EAS) is deployed separately, not via Railway
- **Admin panel** auto-builds on Railway deploy via `backend/railpack.json` — no need to commit built assets

## Local Development

- **Backend port: 8005** (8005 standard for local runs)
- Frontend API URLs point to `localhost:8005`

## Maestro Session Lock (CRITICAL for Multi-Session)

Maestro's driver uses a shared port (7001) — **only one session can use Maestro MCP at a time.** Full protocol: `docs/maestro-session-lock.md`

**Before ANY Maestro MCP tool call:**
1. Check lock: `cat /tmp/maestro-session.lock 2>/dev/null`
2. If locked and < 15 min old → wait 2 min, retry up to 5 times, then ask user
3. If no lock or stale (> 15 min) → acquire: `echo "$(date +%s)|<description>" > /tmp/maestro-session.lock`
4. Refresh the lock timestamp on each Maestro tool call
5. **Release when done:** `rm -f /tmp/maestro-session.lock`

**Other Maestro notes:**
- Always pass `device_id` to every Maestro MCP tool call and `--device <UDID>` to CLI commands
- Check booted devices: `xcrun simctl list devices booted`
- Reset app state: `xcrun simctl uninstall <UDID> org.taist.taist` then reinstall

## Database

- Local: MySQL (`taist_local`, root, no password)
- Tables use `tbl_` prefix (e.g., `tbl_users`, `tbl_menus`, `tbl_availabilities`)
- Seeders in `backend/database/seeds/`
