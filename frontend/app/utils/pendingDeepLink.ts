/**
 * A deep-link target parked until the app is ready to show it.
 *
 * Tapping a push on a cold start raced the splash: `getInitialNotification()`
 * resolved as soon as `LoginAPI` dispatched the user, so the notification
 * pushed the order/chat screen while auto-login was still fetching categories
 * and zip codes. `performAutoLogin` then finished and called
 * `navigate.to*.home()`, throwing the user out of the screen they had just
 * tapped into and back to the Home tab — after a multi-second pause staring at
 * a half-rendered screen.
 *
 * Rather than racing, the notification hands its target over and whoever brings
 * the authorized stack up runs it once the stack is in place.
 */

/** Drop a target the app never got around to opening — it is stale by now. */
export const PENDING_DEEP_LINK_MAX_AGE_MS = 2 * 60 * 1000;

type Pending = { run: () => void; storedAt: number };

let pending: Pending | null = null;

export const setPendingDeepLink = (run: () => void, now: number = Date.now()) => {
  pending = { run, storedAt: now };
};

export const clearPendingDeepLink = () => {
  pending = null;
};

export const hasPendingDeepLink = (now: number = Date.now()): boolean =>
  pending !== null && now - pending.storedAt <= PENDING_DEEP_LINK_MAX_AGE_MS;

/**
 * Hand back the parked target, clearing it either way so a stale one can never
 * fire later and yank the user off whatever they are looking at.
 */
export const takePendingDeepLink = (
  now: number = Date.now(),
): (() => void) | null => {
  const current = pending;
  pending = null;
  if (!current) return null;
  if (now - current.storedAt > PENDING_DEEP_LINK_MAX_AGE_MS) return null;
  return current.run;
};

/**
 * Run the parked target, if any. Called right after the authorized stack is
 * up; the tab navigation has to settle first or the push lands on a screen
 * that is about to be replaced.
 */
export const runPendingDeepLink = (delayMs: number = 0): boolean => {
  const run = takePendingDeepLink();
  if (!run) return false;
  setTimeout(() => {
    try {
      run();
    } catch (error) {
      console.warn('Pending deep link failed:', error);
    }
  }, delayMs);
  return true;
};
