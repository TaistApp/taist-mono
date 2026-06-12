# Newsletter Content Log

Tracks which product updates have been featured in each newsletter edition, so we
**never repeat the same feature update across newsletters**. When drafting the next
edition, pull from the **Backlog** and move items up to **Featured** once that edition
is sent.

- Customer newsletter: Make scenario **#5233475**
- Chef newsletter: Make scenario **#5233482**
- Audience preview / who-receives: admin panel → **Marketing → Newsletter Preview**
- Mirrored in Claude memory (`newsletter_chef_backlog`).

## Rules

- **Never feature the same update in more than one newsletter edition.** Check this log first.
- Chef copy: use **"order"**, not "booking".
- No em dashes in any newsletter copy (use periods/commas).
- Keep the updates list to ~3 items per edition.
- "Featured" only counts once an edition has actually been **sent**.

---

## Chef newsletter (#5233482)

### Featured

| Edition | Status | Updates featured |
| --- | --- | --- |
| 1 — "Welcome In" (first chef newsletter) | Drafted, not yet sent | Minimum order total · Arrival & parking details · Share-your-profile links |
| 2 — "Pool party in Carmel" (event edition) | Planned, draft below | Sophia Square pool-party chef call (hero) · Richer notifications + notification center (single update) |

### Backlog (not yet featured)

- **Dish photo capture after orders** — chefs are prompted to snap the finished dish for approval/social. (PRs #12, #13.)
- _Add newly shipped chef features here as they reach production (`origin/main`)._

### Edition 2 draft — pool-party event edition

Centered on a marketing event that needs one or two chefs. Send after edition 1, with
enough lead time before the event. Load into Make scenario #5233482 once edition 1 has
been sent (the scenario can only hold one edition at a time).

**Event facts (confirmed by Dayne, 2026-06-12):**
- Pool party at **Sophia Square Apartments, Carmel, IN**
- **Thursday, July 16**, 5:30 to 8:00 pm ET
- Chef **arrival and setup at 4:30 pm ET**
- Need **one or two chefs** to provide **sample dishes** for residents

**Subject:** `Chef {{2.first_name}}, want to cook at our Carmel pool party?`

**Preheader:** `We need one or two chefs to serve sample dishes on July 16.`

**Tag line:** `YOU'RE INVITED`

**Heading:** `Hey Chef {{2.first_name}}, we have a gig for you.`

**Body copy:**

> This update is a fun one. Taist is teaming up with Sophia Square Apartments in
> Carmel for their summer pool party, and we want Taist chefs front and center.
>
> We're looking for one or two chefs to serve sample dishes to residents. It's a
> chance to put your food in front of a crowd of potential customers, with Taist
> handling the promotion.
>
> **Details box (orange border, centered):**
> Thursday, July 16 · 5:30 to 8:00 pm ET
> Sophia Square Apartments, Carmel, IN
> Arrive 4:30 pm ET for setup
>
> **Numbered list (why do it):**
> 1. **Meet a crowd of potential customers.** Residents taste your food and meet you in person.
> 2. **Show off your signature dishes.** You pick what to serve. We'll feature it on our socials.
> 3. **First come, first served.** Only one or two spots. Reply to this email to claim one.
>
> **One quick app update while we have you:** order alerts now include dish photos,
> and the new notification center keeps all your messages in one place, so you never
> miss an order. *(This uses the "Richer notifications" backlog item.)*
>
> Want the spot? Just hit reply and tell us what you'd love to serve. We read every one.

**CTA button:** keep `Cook with Taist →` linking to https://taist.app/cook-with-taist, or
swap to a `mailto:contact@taist.app` "Claim a spot" button (decide at load time).

House-style check: no em dashes, "order" not "booking", event is the hero with a single
backlog update featured.

---

## Customer newsletter (#5233475)

### Featured

| Edition | Status | Content |
| --- | --- | --- |
| 1 — "Welcome In" (first customer newsletter) | Drafted, not yet sent | Welcome / how-to-order (Download & discount · Browse chefs · Order). Not feature-update style. |

### Backlog (not yet featured)

- _Add customer-facing product updates here as they ship._
