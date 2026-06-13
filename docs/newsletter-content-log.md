# Newsletter Content Log

Tracks what goes out in each newsletter, so we **never repeat a feature update across
editions** and can keep cadence sane. When drafting the next edition, pull from the
**Backlog** and move items up to **Featured** once that edition is sent.

## Channels

| Channel | Make scenario / location | Cadence |
| --- | --- | --- |
| Customer newsletter | #5233475 | biweekly |
| **Chef Regular** | **#5233482** ("Newsletter - Chef Regular (biweekly)") | biweekly — feature & progress updates |
| **Chef Special** | **#5380856** ("Newsletter - Chef Special (ad-hoc)") | ad-hoc — events & promotions, sent on demand |
| **Chef welcome email** | backend, `resources/views/emails/chef-welcome.blade.php` | triggered automatically when a chef is approved (not a newsletter) |

- Audience preview / who-receives: admin panel → **Marketing → Newsletter Preview**.
- Recipients come from `GET /admin-api-v2/newsletter-recipients?user_type=2` (active/approved chefs only).
- Mirrored in Claude memory (`newsletter_chef_backlog`).

## Rules

- **Never feature the same update in more than one edition.** Check this log first.
- **Regular** = feature & progress updates, biweekly. **Special** = events/promos, ad-hoc.
- Space Regular and Special sends out so chefs don't get two emails back to back (avoid spammy feel).
- Chef copy: use **"order"**, not "booking". No em dashes anywhere. Updates list ~3 items.
- "Featured" only counts once an edition has actually been **sent**.

---

## Chef — Regular (#5233482, biweekly)

### Featured / scheduled

| Edition | Status | Content |
| --- | --- | --- |
| 1 — "Welcome In" | **Scheduled: Sun June 14, 2026, evening ET** | Founder note + funding; 3 updates: minimum order total · arrival & parking details · share-your-profile links |

### Backlog (for Regular #2 onward)

- **Richer notifications + in-app notification center** — order alerts include dish photos; one place for all messages. (PR #21.)
- **Dish photo capture after orders** — chefs are prompted to snap the finished dish for approval/social. (PRs #12, #13.)
- _Add newly shipped chef features here as they reach production (`origin/main`)._

---

## Chef — Special (#5380856, ad-hoc)

### Featured / planned

| Send | Status | Content |
| --- | --- | --- |
| Pool party (Sophia Square) | **Loaded, planned for week of June 15, 2026** | Carmel pool-party chef call — needs 1–2 chefs to serve sample dishes; claim by reply |

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

## Customer newsletter (#5233475)

### Featured

| Edition | Status | Content |
| --- | --- | --- |
| 1 — "Welcome In" | Drafted, not yet sent | Welcome / how-to-order (Download & discount · Browse chefs · Order). Not feature-update style. |

### Backlog (not yet featured)

- _Add customer-facing product updates here as they ship._
