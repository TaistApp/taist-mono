# Newsletter Content Log

Tracks what goes out in each newsletter, so we **never repeat a feature update across
editions** and can keep cadence sane. When drafting the next edition, pull from the
**Backlog** and move items up to **Featured** once that edition is sent.

## How newsletters are sent (since Sept 2026)

Newsletters run from the backend, not Make.com:

- **Write / edit / schedule:** admin panel → Marketing → **Newsletters** (form editor with live preview and test send).
- **Who receives it:** admin panel → Marketing → **Newsletter Audience** (filter per audience; unsubscribed addresses are always excluded).
- **48-hour preview:** every scheduled edition is emailed to `NEWSLETTER_PREVIEW_EMAIL` (default dayne@taist.app) 48 hours before it sends, with **Edit in admin** and **Pause this send** links. No action = it sends on time. An edition can't be scheduled with less than 48 hours' notice, and a late preview pushes the send back so the full 48 hours always apply.
- **Automatic cadence:** after a *regular* edition sends, the next one is auto-drafted from that audience's **backlog** (top 5 unused updates) and scheduled `cadence_days` later (default 14) at 10:00 ET. If the backlog is empty, it's left as an unscheduled draft and Dayne gets a "needs content" email. The first edition per audience is always scheduled by hand.
- **Never repeat:** when an edition sends, the backlog items it featured are marked used.
- **Unsubscribe:** every email has a footer unsubscribe link plus `List-Unsubscribe` / one-click headers (RFC 8058). Opt-outs are stored in `tbl_newsletter_unsubscribes`.
- **Runner:** `php artisan newsletter:run` every 15 minutes (production only unless `NEWSLETTER_AUTOSEND=true`). `--dry-run` shows what would happen.
- **Env vars:** `NEWSLETTER_PREVIEW_EMAIL`, `NEWSLETTER_AUTOSEND`, plus the existing `RESEND_API_KEY`. The CAN-SPAM footer address defaults to 7701 Creekside Dr, Fishers, IN 46038 (`NEWSLETTER_MAILING_ADDRESS` overrides it).
- **Testing on staging:** outside production, scheduled sends go **only** to `NEWSLETTER_TEST_RECIPIENTS` (nobody if unset), and `NEWSLETTER_NOTICE_MINUTES` shortens the 48h window. Production ignores both.

The old Make scenarios (#5233475 customer, #5233482 Chef Regular, #5380856 Chef Special) are **retired**: they're inactive and have no unsubscribe link, so don't run them.

| Channel | Where | Cadence |
| --- | --- | --- |
| Customer newsletter | Admin → Newsletters → Customers | biweekly, auto after the first send |
| **Chef Regular** | Admin → Newsletters → Chefs (regular) | biweekly, auto after the first send |
| **Chef Special** | Admin → Newsletters → Chefs → "Special (one-off)" | ad-hoc, scheduled by hand |
| **Chef welcome email** | backend, `resources/views/emails/chef-welcome.blade.php` | triggered automatically when a chef is approved (not a newsletter) |

- Mirrored in Claude memory (`newsletter_chef_backlog`).

## Rules

- **Never feature the same update in more than one edition.** Check this log first.
- **Regular** = feature & progress updates, biweekly. **Special** = events/promos, ad-hoc.
- Space Regular and Special sends out so chefs don't get two emails back to back (avoid spammy feel).
- Chef copy: use **"order"**, not "booking". No em dashes anywhere. Updates list up to 5 items.
- "Featured" only counts once an edition has actually been **sent**.

---

## Chef — Regular (biweekly)

### Featured / sent

| Edition | Status | Content |
| --- | --- | --- |
| 1 — "Welcome In" | **SENT June 15, 2026 ET** to 10 active chefs (Dayne BCC'd) | Founder note + funding; 3 updates: minimum order total · arrival & parking details · share-your-profile links |

**Used updates — do NOT repeat in any future edition:** minimum order total, arrival & parking details, share-your-profile links.

| 2 — "What's New" | **Drafted in admin (seeded Sept 2026), not yet scheduled** | 5 updates: one-tap Stripe payouts setup · step-by-step order reminders (ingredients, On My Way, wrap-up + dish photo) · missed/cancelled orders flagged on home + notification · chat alerts that always arrive · Pause account. (Discount funding deliberately not featured.) |

### Backlog

The live backlog is in the admin panel (Newsletters → Chefs → Update backlog). Seeded with: review
notifications, customer name + unit number on orders, Meal Prep category, dish photos after orders. Dish-request ("pool") ordering is deliberately left out until it's enabled in
production.

---

## Chef — Special (ad-hoc)

### Featured / planned

| Send | Status | Content |
| --- | --- | --- |
| Pool party (Sophia Square) | **NOT SENT — handled via manual outreach instead (2026-06-16).** Kept in Make #5380856 as a reusable template for a future company/event. | Carmel pool-party chef call — needs 1–2 chefs to serve sample dishes; claim by reply |

**Event facts (confirmed by Dayne, 2026-06-12):**
- **Sophia Square Apartments, Carmel, IN** — Thursday, **July 16**, 5:30 to 8:00 pm ET; chef arrival/setup **4:30 pm ET**.
- Need **1–2 chefs** to provide **sample dishes**. Chefs claim a spot by replying to the email.
- Subject: `Chef {{2.first_name}}, want to cook at our Carmel pool party?`
- Event-only (no feature update — those belong in Regular).

---

## Chef welcome email (triggered, not a newsletter)

Sent automatically via Resend the moment an admin approves a chef (`changeChefStatus`,
status=1), unless **Silent Activate** is used. Evergreen content: congrats + next steps
(finish profile/menu, set availability, share profile). Template:
`backend/resources/views/emails/chef-welcome.blade.php`.

---

## Customer newsletter (biweekly)

### Featured

| Edition | Status | Content |
| --- | --- | --- |
| 1 — "Welcome In" | Drafted in admin (seeded from the unsent Make draft), not yet scheduled. Uses **TAIST30** (EARLYTAIST expired); the editor warns if a mentioned code is inactive. | Welcome / how-to-order (Download & discount · Browse chefs · Order). Not feature-update style. |

### Backlog

Live in the admin panel (Newsletters → Customers → Update backlog). Seeded with: new checkout,
chat push alerts, easier password resets, "order from similar chefs" after a declined order.
