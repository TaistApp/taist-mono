# AWS Shutdown Pre-Flight Checklist

**Created:** February 20, 2026
**Purpose:** Final verification before decommissioning AWS EC2 instances and related services.

---

## Item 1: Mail Host Config (AWS SES → Resend)

**Status: DONE** (Fixed Feb 20, 2026)

**What we found:** All 4 Railway services had `MAIL_HOST=email-smtp.us-east-1.amazonaws.com` with AWS IAM credentials. However, the app **does NOT use Laravel SMTP** — it calls the Resend HTTP API directly via Guzzle in `MapiController::_sendEmail()` (line 227). The AWS SES config was dead weight.

**What we did:** Updated all 4 services to Resend SMTP as a sensible fallback:

| Service | Environment | Old MAIL_HOST | New MAIL_HOST |
|---------|-------------|---------------|---------------|
| `taist-mono` | production | `email-smtp.us-east-1.amazonaws.com` | `smtp.resend.com` |
| `taist-mono` | staging | `email-smtp.us-east-1.amazonaws.com` | `smtp.resend.com` |
| `supportive-recreation` | production | `email-smtp.us-east-1.amazonaws.com` | `smtp.resend.com` |
| `scheduler` | staging | `email-smtp.us-east-1.amazonaws.com` | `smtp.resend.com` |

Also updated `MAIL_USERNAME=resend` and `MAIL_PASSWORD={RESEND_API_KEY}` on all 4.

**Used `skipDeploys: true`** to avoid triggering redeployments — these vars aren't actively used, change takes effect on next regular deploy.

**Risk: NONE.** Email sending uses Resend HTTP API, not SMTP. This is just cleanup.

---

## Item 2: Database Data Migration

**Status: VERIFIED** (by user)

Railway MySQL databases are confirmed current with production data.

---

## Item 3: Railway Volume (Uploaded Files)

**Status: VERIFIED** (by user)

Railway volumes contain all uploaded files (user photos, appliance icons, logos, etc.). Confirmed via HTTP 200s on image URLs.

---

## Item 4: Cloudflare / DNS Configuration

**Status: NO ACTION NEEDED**

**What we found:** `api.taist.app` already resolves directly to Railway:
```
api.taist.app → yxcmpbi3.up.railway.app → 151.101.2.15 (Railway edge)
```

Cloudflare is **not** in the path for `api.taist.app`. It was only used for the old `taist.codeupscale.com` domain. The frontend already points to `api.taist.app` for production and `api-staging.taist.app` for staging.

**When AWS is shut down:** The old `taist.codeupscale.com` domain will stop working, but nothing in the app references it anymore. No action needed.

**Optional cleanup:** After AWS shutdown, you can delete the Cloudflare zone for `taist.codeupscale.com` if you manage it.

---

## Item 5: Stripe Dashboard — Webhook Endpoints

**Status: MANUAL CHECK REQUIRED** (you need to do this)

**What the code shows:** There are **zero** Stripe webhook endpoints defined in the codebase — no `/webhook` route, no `webhook_secret` env var in use, no Stripe event handling code.

The only Stripe URLs are **outgoing redirects** for chef Connect onboarding:
- `{APP_URL}/stripe/complete` → redirects to `taistexpo://stripe-complete`
- `{APP_URL}/stripe/refresh` → redirects to `taistexpo://stripe-refresh`

These use `APP_URL` which is already set to Railway.

**What to check in Stripe Dashboard:**
1. Go to https://dashboard.stripe.com/webhooks
2. Look for ANY webhook endpoints configured
3. If any exist pointing to `taist.codeupscale.com` or `18.216.154.184` — **delete them** (the app doesn't handle them anyway)
4. Check both Live and Test modes

**Expected result:** There should be no webhook endpoints, since the code doesn't handle them. If there are any, they're leftover and can be removed.

---

## Item 6: Twilio Dashboard — Callback URLs

**Status: NO ACTION NEEDED** (verified from code)

**What the code shows:** `TwilioService.php` sends SMS but does **not configure any `status_callback` URL**. Twilio is fire-and-forget — the app sends SMS but never receives delivery status callbacks.

```php
$this->client->messages->create($phone, [
    'from' => $this->fromNumber,
    'body' => $message
    // No status_callback configured
]);
```

**Optional check:** Log into Twilio console (https://console.twilio.com) → Phone Numbers → Active Numbers → click the `+13178546026` number. Verify there are no webhook URLs configured pointing to old servers.

---

## Item 7: SafeScreener — Callback URLs

**Status: NO ACTION NEEDED** (verified from code)

**What the code shows:** SafeScreener integration is **polling-based only**. The scheduler runs `background_check_order_status` on a cron to poll SafeScreener's API for status updates. No callback/webhook URLs are registered with SafeScreener.

**Outbound calls:**
- `https://api.instascreen.net/v1/clients/{GUID}/orders/{orderGuid}/status` (polling)
- `https://api.instascreen.net/v1/clients/{GUID}/applicants` (creating)
- `https://api.instascreen.net/v1/clients/{GUID}/orders` (ordering)

No action needed.

---

## Item 8: EC2 .env vs Railway Env Vars

**Status: VERIFIED** (Feb 20, 2026 — SSH inspection)

EC2 production `.env` at `/var/www/html/.env` is bare-bones (old standalone codebase, not the monorepo):

| Variable | EC2 Value | Railway Production |
|----------|-----------|-------------------|
| `APP_ENV` | `local` (misconfigured) | `production` |
| `APP_URL` | `http://localhost` (misconfigured) | `https://api.taist.app` |
| `DB_DATABASE` | `db_taist` on localhost | `railway` on Railway internal MySQL |
| `MAIL_HOST` | AWS SES | `smtp.resend.com` (updated Feb 20) |
| `STRIPE` | **Missing from .env** | Live keys present |
| `TWILIO` | **Missing from .env** | Present |
| `RESEND` | **Missing from .env** | Present |
| `SAFESCREENER` | **Missing from .env** | Present |
| `GOOGLE_MAPS` | **Missing from .env** | Present |
| `OPENAI` | **Missing from .env** | Present |
| `FIREBASE` | Just a database URL | Full service account JSON |

**Conclusion:** Railway has every service configured. EC2 `.env` is missing most API keys (old codebase likely hardcodes them elsewhere). No missing vars on Railway.

---

## Item 9: Server Logs Download

**Status: OPTIONAL** (recommended but not blocking)

To grab logs before shutdown, run on the EC2 server:

```bash
cd /tmp
sudo tar czf taist-logs-$(date +%Y%m%d).tar.gz \
  /var/www/html/storage/logs/ \
  /var/log/httpd/ \
  2>/dev/null
```

Then download from your local machine:
```bash
scp -i ~/.ssh/taist-aws-key.pem ec2-user@18.216.154.184:/tmp/taist-logs-*.tar.gz ~/Desktop/
```

Recommended for compliance/audit trail, but all transaction data is in the database (already on Railway).

---

## Item 10: Cron Jobs on EC2

**Status: VERIFIED** (Feb 20, 2026 — SSH inspection)

EC2 has **one cron job** (on `ec2-user`):
```
0 * * * * wget http://18.216.154.184/mapi/background_check_order_status
```

This is the old-style hourly SafeScreener status poll — the server hitting itself via wget. Railway's `supportive-recreation` scheduler already handles this via the `ProcessExpiredOrders` artisan command.

**EC2 Laravel scheduler is EMPTY** — the old codebase at `/var/www/html/app/Console/Kernel.php` has no scheduled commands. All scheduling was done via this single wget cron.

**EC2 databases:** Only `db_taist` plus system databases. No other application databases.

**No other services or apps running on the server.**

Railway `supportive-recreation` runs every 5 minutes — confirmed acceptable.

---

## Item 11: Set Production RESEND_API_KEY

**Status: SKIPPED** (user handling separately)

Note: It IS already set on production Railway (`re_YyBig3oV_...`). The original checklist may have been outdated on this point.

---

## Summary: Ready to Shut Down?

| Check | Status | Blocker? |
|-------|--------|----------|
| Mail host (AWS SES) | **FIXED** — switched to Resend SMTP | No |
| Database migrated | **VERIFIED** | No |
| Volume files complete | **VERIFIED** | No |
| Cloudflare/DNS | **NO ACTION** — api.taist.app already on Railway | No |
| Stripe webhooks | **CHECK DASHBOARD** — likely none exist | Unlikely |
| Twilio callbacks | **NO ACTION** — no callbacks in code | No |
| SafeScreener callbacks | **NO ACTION** — polling only | No |
| EC2 .env diff | **VERIFIED** — Railway has everything, EC2 is bare-bones | No |
| EC2 cron jobs | **VERIFIED** — only 1 wget cron, Railway handles it | No |
| EC2 databases | **VERIFIED** — only `db_taist`, already on Railway | No |
| EC2 traffic | **VERIFIED** — zero real traffic, only bot scans | No |
| Server logs | **OPTIONAL** — download if needed for compliance | No |

### Verdict

**You are clear to shut down AWS.**

1. ~~Fix mail host~~ DONE (Feb 20)
2. ~~SSH into EC2 to verify~~ DONE (Feb 20) — no traffic, no surprise services
3. Quick-check Stripe Dashboard for stale webhook endpoints (5 min task, likely none)
4. Optionally: download server logs before shutdown

No blockers remain.
