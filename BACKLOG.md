# BACKLOG — Taist Mono

Items for future development. Not prioritized for the current sprint.

---

## Chef Onboarding

- **Complete SafeScreener status handler** — `backgroundCheckOrderStatus()` in `MapiController.php` (line 4371) fetches order status from SafeScreener but discards the result. Needs to: parse the response, auto-approve (`is_pending=0, verified=1`) or auto-reject the chef, and send a notification. This would eliminate the manual admin approval step for every new chef. SafeScreener sandbox is free and already hardcoded (`$mode = 'stag'`). Requires a sample status response to determine field names — hit the sandbox API with an existing `order_guid` or check their docs.

- **Make SafeScreener environment configurable** — `sendBackgroundCheckRequest()` (line 4210) has `$mode = 'stag'` hardcoded. Should be driven by an env variable (`SAFESCREENER_MODE=sandbox|production`) so switching to production doesn't require a code change.
