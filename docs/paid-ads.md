# Paid Ads (Instagram + Facebook)

Customer-only paid ads, drafted and approved the same way as the newsletters
(see `newsletter-content-log.md`). No chef or recruiting ads.

## How it works

- **Where:** admin panel → Marketing → **Ads**. Batches, the idea list, and automation settings.
- **Weekly batches:** each batch holds up to 5 ads (default 3). A new batch goes live every `cadence_days` (default 7) at the go-live time (default 10:00 ET) and runs `run_days` (default 14), so two batches overlap at any time.
- **Fully automatic through the Meta Marketing API.** Nobody works in Ads Manager:
  1. **48 hours before go-live** the batch's ads are created in Meta, **paused**, inside the customer ad set, and the preview is emailed to `ADS_PREVIEW_EMAIL` (default dayne@taist.app). The email shows each ad as an Instagram feed mockup with **Edit in admin** and **Pause this batch** links, and lists anything Meta refused. Creating them early means Meta's review happens inside the 48-hour window.
  2. **Edits** made after that are re-uploaded automatically before go-live (the old Meta ad is archived). Pausing, unscheduling or deleting a batch archives its Meta ads.
  3. **At go-live** the ads are switched on and Dayne gets an "Ads live" email. It is all or nothing: if Meta isn't connected, an upload fails, Meta rejected an ad, or switching on fails, no ad stays on, the batch goes back to a draft, and Dayne gets an "Ads NOT live" email with the reasons.
  4. **After `run_days`** the ads are paused automatically. A live batch can also be stopped early from the admin.
- **Budget and targeting** live on the one customer ad set (`META_ADSET_ID`). The pipeline only creates ads inside it and switches them on and off. It never creates campaigns or ad sets and never changes budgets.
- **Automatic cadence:** once a batch goes live, the next one is drafted and scheduled `cadence_days` later. Content comes from the top of the **idea list**. The first batch is always scheduled by hand.
- **Where ideas come from:** the idea list is hand-written: five starter ideas are seeded by the migration, and more are added in the admin. Nothing generates them automatically.
- **Recycling when the idea list is empty:** the next batch promotes the best organic Instagram posts of the last **30 days** that have never been an ad, ranked by likes + comments (newest first on a tie). The post runs as-is, so its likes and comments carry over and nothing new appears on the feed. **Menu Item posts are skipped** because their photo may be AI-generated: an image post published within 6 hours of a `menu-item` receipt (recorded by the taist-social Content Publisher in `social_posted_receipts`) counts as a Menu Item post. If that ledger can't be read, only Reels are recycled. If nothing qualifies, the batch stays an unscheduled draft and Dayne gets an "Ads need content" email.
- **Images:** an idea without an image gets a real chef dish photo (taken by the chef at the end of an order) that is admin-approved **and** queued for social (`tbl_dish_photos`). No AI-generated images are used. A photo isn't reused in ads within 60 days. Ads keep their own record in `tbl_ads`, so they never touch the organic posting ledger.
- **Never repeat:** ideas are marked used when their batch goes live; recycled posts are never recycled twice.
- **Content checks:** the editor and preview email flag copy that breaks the Taist rules (shared with taist-social): no em dashes, never "free" (except "free to download"), no Zionsville, no "no parking" claims, no "lowkey"/"stupid", no competitor names, and discount codes must exist and be valid. They also flag Meta's recommended lengths (primary text 125, headline 40, description 30). Recycled posts are not checked; they already ran organically.
- **Runner:** `php artisan ads:run` every 15 minutes (production only unless `ADS_AUTOMATION=true`). `--dry-run` shows what would happen.
- **Env vars:**
  - `ADS_AUTOMATION`, `ADS_PREVIEW_EMAIL`, `ADS_NOTICE_MINUTES` (non-production only, shortens the 48h window for testing), plus the existing `RESEND_API_KEY`.
  - `META_ACCESS_TOKEN` (system user token with `ads_management`, `pages_read_engagement`, `instagram_basic`), `META_AD_ACCOUNT_ID`, `META_ADSET_ID`.
  - `META_PAGE_ID` (default `111916651258217`), `META_INSTAGRAM_USER_ID` (default `17841448434123490`), `META_GRAPH_VERSION` (default `v23.0`).

## Relationship to organic posting

Organic posts (feed, Stories, Reels) run from the `taist-social` repo through Make.com
and are unaffected. New ads are ad-only creatives, so they never appear on the Page or
the @taist.team grid (the organic grid colour steering isn't disturbed). Recycled posts
promote a post that is already on the grid, without adding anything new.

## Meta account status (Sept 26, 2026)

- Business portfolio **"taist"** (ID `721114992618593`), likely the "TAIST INC." portfolio that was in business verification on 2026-06-07 (outcome not confirmed).
- Facebook Page `111916651258217`, Instagram @taist.team `17841448434123490`.
- **No ad account** found under the portfolio yet, no pixel/dataset, no payment method.
- The Make "Taist Instagram" connection (8437279) already has `ads_management`, but only the organic scenarios use it.

## Not built yet

1. Conversion tracking (Facebook SDK app events or Conversions API) so Meta can optimise for installs/orders.
2. Pulling results back in and auto-pausing weak ads.
