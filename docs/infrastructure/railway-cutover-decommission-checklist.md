# Railway Cutover + Legacy Decommission Checklist

Last updated: February 19, 2026
Independent audit run on February 20, 2026 (replacing Codex-generated checklist from Feb 18).
Re-verified February 19, 2026 via Railway CLI.

## Goal

Safely move all production traffic to Railway and decommission legacy AWS/CodeUpscale infrastructure. This document tracks what's actually verified vs what still needs work.

---

## BLOCKER Issues Found (Must Fix Before Cutover)

### BLOCKER 1: Production `APP_URL` still points to legacy host

**Current value:** `APP_URL = https://taist.codeupscale.com` (Railway production env)

This means every backend-generated URL in production — Stripe onboarding return/refresh URLs, email links, admin dashboard links, logo URLs in emails — all point to the **old legacy host**, not Railway.

**Impact:** Stripe chef onboarding callbacks go to wrong host. Email "view in admin" links go to wrong host. Any `url()` or `config('app.url')` call returns the legacy domain.

**Fix:** Change Railway production env var:
```
APP_URL = https://api.taist.app
```
(Or the final canonical domain once decided.)

**Affected code paths:**
- `MapiController::_appBaseUrl()` (line 119) — reads `config('app.url')`
- `MapiController::_logoUrl()` (line 134) — builds logo URL from base
- `MapiController::_adminUrl()` (line 139) — builds admin URL from base
- Stripe onboarding `refresh_url` / `return_url` (line 4441-4442)
- All email notifications that include links

### BLOCKER 2: Legal HTML files missing from Railway volume

**What's happening:** Railway volumes are mounted at `/app/public/assets/uploads` and are populated — user photos, appliance icons, and other images all serve correctly (HTTP 200). However, the `html/` subdirectory is missing from the volume, so the legal pages return Laravel's 404 page.

The mobile app opens these via in-app browser (`WebBrowser.openBrowserAsync`):
- `frontend/app/screens/common/privacy/index.tsx:13` → `${HTML_URL}privacy.html`
- `frontend/app/screens/common/terms/index.tsx:13` → `${HTML_URL}terms.html`

**Verified 404s (February 20, 2026):**
- `https://api.taist.app/assets/uploads/html/privacy.html` → 404 (Laravel "Not Found")
- `https://api.taist.app/assets/uploads/html/terms.html` → 404 (Laravel "Not Found")
- `https://api-staging.taist.app/assets/uploads/html/privacy.html` → 404
- `https://api-staging.taist.app/assets/uploads/html/terms.html` → 404

**Verified 200s (volume images work fine):**
- `https://api.taist.app/assets/uploads/images/user_photo_1722428782.jpg` → 200
- `https://api.taist.app/assets/uploads/images/stove.png` → 200
- `https://api.taist.app/assets/uploads/images/logo.png` → 200
- `https://api.taist.app/assets/uploads/images/stripe_guide.jpeg` → 200

**Fix (implemented Feb 19):** Added Laravel `Route::view` routes that serve Blade views at the same URL paths. This eliminates the volume dependency entirely — the pages deploy with the app code.

- Routes: `backend/routes/web.php` — two `Route::view()` entries
- Views: `backend/resources/views/legal/privacy.blade.php` and `terms.blade.php`
- Also fixed: replaced Cloudflare email obfuscation with plain `contact@taist.app` mailto links
- **Status:** Code committed, needs deploy to Railway (both staging and production)

### ~~BLOCKER 3: Production scheduler has ZERO deployments~~ — RESOLVED

**Original concern:** The `scheduler` service in production had never been deployed.

**Resolution (verified Feb 19):** The production scheduler actually runs as the `supportive-recreation` service, not the `scheduler` service. It has:
- Cron schedule: `*/5 * * * *`
- Start command: waits for DB connection, then runs `php artisan schedule:run`
- Full production env vars (DB, Stripe live, Twilio, SafeScreener, etc.)
- Active deployment from `main` branch (latest: Feb 20, status SUCCESS)

The `scheduler` service (with zero production deployments) is the unused one — `supportive-recreation` is doing the work.

**~~Remaining nits on `supportive-recreation`:~~ — FIXED (Feb 19)**
- `APP_URL` updated to `https://api.taist.app`
- `FIREBASE_CREDENTIALS` set to actual JSON (copied from production `taist-mono`)

---

## Warnings (Should Fix)

### WARNING 1: Production `taist-mono` missing `RESEND_API_KEY`

The backend sends emails via the Resend API (`MapiController` line 231-233):
```php
$response = $client->post('https://api.resend.com/emails', [
    'headers' => [
        'Authorization' => 'Bearer ' . env('RESEND_API_KEY'),
```

**Staging has it** (set as env var in Railway).
**Production does NOT have it.**

**Impact:** Any email sent via Resend (appears to be admin notification emails) will fail silently in production.

**Fix:** Set `RESEND_API_KEY` in Railway production env for `taist-mono` service. Get the production Resend key from whoever manages the Resend account (staging key should NOT be used for production).

### ~~WARNING 2: Production missing `ADMIN_TIMEZONE`~~ — FIXED

**Fix applied Feb 19:** Set `ADMIN_TIMEZONE=America/Los_Angeles` on production `taist-mono` via Railway CLI.

### ~~WARNING 3: Staging scheduler Firebase credentials are malformed~~ — FIXED

**Fix applied Feb 19:** Re-set `FIREBASE_CREDENTIALS` on staging `scheduler` service with clean JSON copied from production `taist-mono` via Railway CLI. Previous value had encoding/control character issues.

### ~~WARNING 4: `supportive-recreation` is an unknown/empty service~~ — RESOLVED

**Original concern:** Appeared to have only Railway system vars.

**Resolution (verified Feb 19):** `supportive-recreation` is the **production scheduler** service. It has full production env vars, a `*/5 * * * *` cron schedule, and active deployments from `main`. See BLOCKER 3 resolution above.

The unused service is actually `scheduler` (which has zero production deployments and only reminder config vars). Consider deleting the empty `scheduler` service from production to avoid confusion.

### ~~WARNING 5: `SENDGRID_API_KEY` present but unused~~ — FIXED

**Fix applied Feb 19:** Removed `SENDGRID_API_KEY` from production `taist-mono`, staging `taist-mono`, production `supportive-recreation`, and staging `scheduler` via Railway CLI.

---

## Verified OK

### Codebase: No legacy host/IP references in runtime code

Grep audit on February 20, 2026 confirmed **zero matches** for:
- `cloudupscale` / `codeupscale` — in any `.php`, `.ts`, `.tsx`, `.js`, `.env` file
- `18.216.154.184` / `18.118.114.98` / `54.243.117.197` / `13.223.25.84` — old EC2/Kestrel IPs
- `api.taist.app` — not referenced in any runtime code

The Codex checklist (Phase A) said this was completed Feb 18 — this audit independently confirms it.

### Frontend API URLs point to Railway

`frontend/app/services/api.ts` correctly uses:
- **Staging:** `https://api-staging.taist.app/mapi/`
- **Production:** `https://api.taist.app/mapi/`
- **Local:** `http://localhost:8005/mapi/`

All image, HTML, and static asset URLs also point to Railway.

### Backend URLs are env-driven

`MapiController` uses `_appBaseUrl()` which reads `config('app.url')` (i.e., `APP_URL` env var). No hardcoded domains. Stripe onboarding throws a RuntimeException if `APP_URL` is missing. This is correct — the only problem is the production env var value itself (see BLOCKER 1).

### Railway API is live and healthy

Verified February 20, 2026:
- `https://api-staging.taist.app/mapi/get-version` → HTTP 200, `server: railway-edge`, PHP 8.2.30
- `https://api.taist.app/mapi/get-version` → HTTP 200, `server: railway-edge`, PHP 8.2.30, returns version 29.0.0

### Railway volumes are populated (images work)

- **Staging volume:** `taist-mono-volume` mounted at `/app/public/assets/uploads`
- **Production volume:** `taist-mono-volume-iu45` mounted at `/app/public/assets/uploads`
- User photos, appliance icons, logos, stripe guide — all serving HTTP 200
- Only the `html/` subdirectory is missing (see BLOCKER 2)

### Staging env vars are complete

Staging `taist-mono` service has all required secrets:
Stripe (test), Twilio, Firebase, Resend, SafeScreener (sandbox), Google Maps, OpenAI, SMTP (AWS SES), `APP_URL` correct.

### Production env vars mostly complete

Production `taist-mono` service has:
Stripe (live), Twilio, Firebase, SafeScreener (production JWT), Google Maps, OpenAI, SMTP (AWS SES).
**Missing:** `RESEND_API_KEY` (see Warning 1). `ADMIN_TIMEZONE` now set (Feb 19).
**~~Wrong:~~ `APP_URL`** — fixed Feb 19, now `https://api.taist.app`. Custom domain `api.taist.app` also configured on Railway.

---

## Execution Plan

### Phase 1: Fix Blockers (do these BEFORE any cutover)

| # | Task | Detail | Status |
|---|------|--------|--------|
| 1a | Fix production `APP_URL` | Change from `https://taist.codeupscale.com` to `https://api.taist.app` in Railway env | **DONE** (Feb 19) |
| 1b | Serve legal pages via Laravel routes | Added `Route::view` routes in `web.php` for `/assets/uploads/html/privacy.html` and `terms.html`, backed by Blade views in `resources/views/legal/`. Pages deploy with the app — no volume dependency. Needs deploy to Railway. | **CODE DONE** — deploy pending |
| 1c | Deploy production scheduler | Production scheduler runs as `supportive-recreation` service (cron `*/5 * * * *`, full env vars, active deployments from `main`). | **DONE** (was already running) |
| 1d | Set production `RESEND_API_KEY` | Get production Resend API key and set it in Railway production env | NOT DONE |
| 1e | Fix `supportive-recreation` env nits | Updated `APP_URL` to Railway URL and `FIREBASE_CREDENTIALS` to actual JSON | **DONE** (Feb 19) |

### Phase 2: Verify After Blocker Fixes

```bash
# Verify APP_URL is correct
curl -sS https://api.taist.app/mapi/get-version

# Verify uploaded files are accessible
curl -sSI https://api.taist.app/assets/uploads/html/privacy.html | head -5
curl -sSI https://api.taist.app/assets/uploads/html/terms.html | head -5
curl -sSI https://api-staging.taist.app/assets/uploads/html/privacy.html | head -5

# Verify scheduler is running in production (check Railway dashboard logs for scheduler service)
# Should see "Running scheduled command" entries every 5 minutes
```

### Phase 3: Domain Decision

- [x] Decide canonical production API domain — custom domain `api.taist.app` is configured on Railway (`RAILWAY_PUBLIC_DOMAIN=api.taist.app`)
- [ ] Update `APP_URL` to `https://api.taist.app` (currently still `https://api.taist.app`)
- [ ] Update frontend `api.ts` to use `https://api.taist.app/mapi/` for production
- [ ] Update `supportive-recreation` `APP_URL` to match

### Phase 4: Legacy Shutdown (Staged)

- [ ] Confirm Stripe webhook endpoint is targeting Railway production host (check Stripe dashboard)
- [ ] Freeze legacy staging host first; monitor 48hrs for breakage
- [ ] Keep DNS + instance in stopped state (not deleted) for rollback window
- [ ] After clean period, cut legacy production host
- [ ] Remove stale DNS records and release unused IP/resources
- [ ] Clean up unused `scheduler` service in production (the real scheduler is `supportive-recreation`)
- [x] Remove `SENDGRID_API_KEY` from all services (done Feb 19)

---

## Railway Service Inventory (February 20, 2026)

| Service | Purpose | Staging | Production |
|---------|---------|---------|------------|
| `taist-mono` | Laravel API backend | Deployed, healthy (branch: `staging`) | Deployed, healthy (branch: `main`) |
| `supportive-recreation` | **Production scheduler** (cron `*/5 * * * *`) | N/A | Deployed, running (branch: `main`) |
| `scheduler` | Staging scheduler (cron `*/5 * * * *`) | Deployed, running (branch: `staging`) | Unused (zero deployments) — consider deleting |
| `MySQL-Y2bE` | Staging MySQL | Active | N/A |
| `MySQL-9ud3` | Production MySQL | N/A | Active |

## Quick Reference: Endpoints Checked February 20, 2026

| URL | Status | Server |
|-----|--------|--------|
| `https://api-staging.taist.app/mapi/get-version` | 200 | `railway-edge`, PHP 8.2.30 |
| `https://api.taist.app/mapi/get-version` | 200 | `railway-edge`, PHP 8.2.30 |
| `https://api.taist.app/assets/uploads/images/user_photo_*.jpg` | 200 | railway-edge (volume images work) |
| `https://api.taist.app/assets/uploads/images/stove.png` | 200 | railway-edge |
| `https://api.taist.app/assets/uploads/html/privacy.html` | **404** | railway-edge (html/ subdir missing from volume) |
| `https://api.taist.app/assets/uploads/html/terms.html` | **404** | railway-edge (html/ subdir missing from volume) |
| `https://api.taist.app/assets/images/logo-2.png` | 200 | railway-edge (static, not volume) |
