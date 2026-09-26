# Paid Ads (Instagram + Facebook)

Customer-only paid ads, drafted and approved the same way as the newsletters
(see `newsletter-content-log.md`). No chef or recruiting ads.

## How it works

- **Where:** admin panel → Marketing → **Ads**. Batches, the idea backlog, and automation settings.
- **Weekly batches:** each batch holds up to 5 ads (default 3). A new batch goes live every `cadence_days` (default 7) at the go-live time (default 10:00 ET) and runs `run_days` (default 14), so two batches overlap at any time.
- **48-hour preview:** every scheduled batch is emailed to `ADS_PREVIEW_EMAIL` (default dayne@taist.app) 48 hours before go-live. Each ad is shown as an Instagram feed mockup, with **Edit in admin** and **Pause this batch** links. No action = it is approved at go-live. A batch can't be scheduled with less than 48 hours' notice, and a late preview pushes go-live back so the full window always applies.
- **Approval (manual launch for now):** at go-live the batch becomes **ready to launch** and Dayne gets a "Ready to launch" email with the copy. Create the ads in Ads Manager, then click **Mark launched** in the admin (optionally paste each Meta ad ID). When `run_days` is up the batch ends and a "Turn off ads" reminder goes out.
- **Automatic cadence:** once a batch is approved, the next one is drafted from the top of the idea backlog and scheduled `cadence_days` later. If the backlog is empty it stays an unscheduled draft and Dayne gets an "Ads need content" email. The first batch is always scheduled by hand.
- **Images:** an idea without an image gets a random chef dish photo that is admin-approved **and** queued for social (`tbl_dish_photos`). A photo isn't reused in ads within 60 days. Ads keep their own record in `tbl_ads`, so they never touch the organic posting ledger (`social_posted_receipts`).
- **Never repeat:** ideas are marked used when their batch is approved.
- **Content checks:** the editor and preview email flag copy that breaks the Taist rules (shared with taist-social): no em dashes, never "free" (except "free to download"), no Zionsville, no "no parking" claims, no "lowkey"/"stupid", no competitor names, and discount codes must exist and be valid. They also flag Meta's recommended lengths (primary text 125, headline 40, description 30).
- **Runner:** `php artisan ads:run` every 15 minutes (production only unless `ADS_AUTOMATION=true`). `--dry-run` shows what would happen.
- **Env vars:** `ADS_AUTOMATION`, `ADS_PREVIEW_EMAIL`, `ADS_NOTICE_MINUTES` (non-production only, shortens the 48h window for testing), plus the existing `RESEND_API_KEY`.

## Relationship to organic posting

Organic posts (feed, Stories, Reels) run from the `taist-social` repo through Make.com
and are unaffected. Paid ads should run as ad-only posts in Ads Manager, never as
boosted feed posts, so the organic Instagram grid colour steering isn't disturbed.

## Meta account status (Sept 26, 2026)

- Business portfolio **"taist"** (ID `721114992618593`), likely the "TAIST INC." portfolio that was in business verification on 2026-06-07 (outcome not confirmed).
- Facebook Page `111916651258217`, Instagram @taist.team `17841448434123490`.
- **No ad account** found under the portfolio yet, no pixel/dataset, no payment method.
- The Make "Taist Instagram" connection (8437279) already has `ads_management`, but only the organic scenarios use it.

## Not built yet

1. Publishing through the Meta Marketing API (upload as paused at preview time, switch on at go-live). Needs an ad account, a system user token, and the customer ad set ID.
2. Conversion tracking (Facebook SDK app events or Conversions API) so Meta can optimise for installs/orders.
3. Pulling results back in and auto-pausing weak ads.
