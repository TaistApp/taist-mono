/**
 * Whether a chef can still act on an order request.
 *
 * The countdown already said "Expired — customer will be refunded" while
 * ACCEPT ORDER and REJECT ORDER sat right beneath it. The sweep cancels and
 * refunds the order at that point, so both buttons promised something the chef
 * could no longer deliver.
 */

/** Order status 1 — Requested. Nothing else has an acceptance window. */
const REQUESTED = 1;

/**
 * `timeRemaining` is null when the order carries no deadline at all (older
 * orders, or a response without `deadline_info`). That is not an expiry, so
 * the chef keeps the buttons rather than being locked out of an order nobody
 * is counting down.
 */
export const isAcceptanceExpired = (
  status?: number | null,
  timeRemaining?: number | null,
): boolean =>
  status === REQUESTED && timeRemaining !== null && timeRemaining !== undefined && timeRemaining <= 0;

export const canActOnOrderRequest = (
  status?: number | null,
  timeRemaining?: number | null,
): boolean => status === REQUESTED && !isAcceptanceExpired(status, timeRemaining);
