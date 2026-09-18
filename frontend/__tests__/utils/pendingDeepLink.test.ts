import {
  PENDING_DEEP_LINK_MAX_AGE_MS,
  clearPendingDeepLink,
  hasPendingDeepLink,
  setPendingDeepLink,
  takePendingDeepLink,
} from '../../app/utils/pendingDeepLink';

/**
 * Tapping a push on a cold start raced the splash: the notification pushed the
 * order/chat screen as soon as LoginAPI dispatched the user, then auto-login
 * finished and called navigate.to*.home(), throwing the user back to the Home
 * tab. The target is parked instead and run once the stack is up.
 */
const NOW = 1_700_000_000_000;

describe('pendingDeepLink', () => {
  beforeEach(() => clearPendingDeepLink());

  it('hands the parked target back to whoever brings the stack up', () => {
    const run = jest.fn();
    setPendingDeepLink(run, NOW);
    expect(hasPendingDeepLink(NOW)).toBe(true);

    takePendingDeepLink(NOW)?.();
    expect(run).toHaveBeenCalledTimes(1);
  });

  // The whole point: it must fire exactly once, or a later consumer would yank
  // the user off whatever they navigated to themselves.
  it('only fires once', () => {
    const run = jest.fn();
    setPendingDeepLink(run, NOW);

    takePendingDeepLink(NOW)?.();
    takePendingDeepLink(NOW)?.();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('drops a target the app never got around to opening', () => {
    const run = jest.fn();
    setPendingDeepLink(run, NOW);

    const late = NOW + PENDING_DEEP_LINK_MAX_AGE_MS + 1;
    expect(hasPendingDeepLink(late)).toBe(false);
    expect(takePendingDeepLink(late)).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it('clears on logout so the next user does not inherit the target', () => {
    setPendingDeepLink(jest.fn(), NOW);
    clearPendingDeepLink();
    expect(hasPendingDeepLink(NOW)).toBe(false);
    expect(takePendingDeepLink(NOW)).toBeNull();
  });

  // Control: nothing parked means nothing to run — the caller navigates
  // normally.
  it('reports nothing pending when none was set', () => {
    expect(hasPendingDeepLink(NOW)).toBe(false);
    expect(takePendingDeepLink(NOW)).toBeNull();
  });
});
