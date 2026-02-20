# Taist Monorepo

A food marketplace connecting customers with local chefs — Laravel API + React Native (Expo) mobile app.

**Keep this file under 100 lines.** Move details to `docs/` and link from here.

## Rules

1. **No task is done until verified** — run commands, tests, or Maestro flows to prove it works
2. **No task is done until documented** — update CLAUDE.md, docs, seeders, and env configs as needed
3. **Keep this file concise** — reference `docs/` for details, don't duplicate

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

- Token-based auth via `api_token` on `tbl_users`
- Mobile API guard: `mapi` (token-based, uses `Listener` model)
- Requests require `Authorization: Bearer {token}` + hardcoded `apiKey` header
- User types: `1` = customer, `2` = chef
- Verified states: `0` = pending, `1` = active, `2` = denied, `3` = banned

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

## Branching & Deployment

- **`staging` branch** → Railway staging environment (auto-deploys on push)
- **`main` branch** → Railway production environment (auto-deploys on push)
- Workflow: feature branches → PR to `staging` → test → PR from `staging` to `main`
- Frontend (Expo/EAS) is deployed separately, not via Railway

## Local Development

- **Backend port: 8005** (8005 standard for local runs)
- Frontend API URLs point to `localhost:8005`

## Maestro Simulator Isolation (Multi-Session)

When multiple Claude Code sessions run Maestro simultaneously:
- **Each session MUST boot its own simulator** — never reuse one that's already booted
- **Always pass `device_id`** to every Maestro MCP tool call and `--device <UDID>` to CLI commands
- Check booted devices first: `xcrun simctl list devices booted`
- To reset app state on a new simulator: `xcrun simctl uninstall <UDID> org.taist.taist` then reinstall
- The app caches login sessions — a freshly booted sim may still be logged in from a prior install

## Database

- Local: MySQL (`taist_local`, root, no password)
- Tables use `tbl_` prefix (e.g., `tbl_users`, `tbl_menus`, `tbl_availabilities`)
- Seeders in `backend/database/seeds/`
