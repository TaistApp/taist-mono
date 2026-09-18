import {
  canActOnOrderRequest,
  isAcceptanceExpired,
} from '../../app/utils/acceptanceWindow';

/**
 * Build 68 showed "Time to Accept — Expired / Order expired, customer will be
 * refunded" with ACCEPT ORDER and REJECT ORDER still sitting underneath it.
 * The sweep has already cancelled and refunded by then.
 */
describe('isAcceptanceExpired', () => {
  it('is expired once the countdown hits zero', () => {
    expect(isAcceptanceExpired(1, 0)).toBe(true);
    expect(isAcceptanceExpired(1, -30)).toBe(true);
  });

  it('is not expired while time remains', () => {
    expect(isAcceptanceExpired(1, 1)).toBe(false);
    expect(isAcceptanceExpired(1, 1800)).toBe(false);
  });

  // A missing deadline is not an expiry — locking the chef out of an order
  // nobody is counting down would be worse than the bug.
  it('treats a missing deadline as still open', () => {
    expect(isAcceptanceExpired(1, null)).toBe(false);
    expect(isAcceptanceExpired(1, undefined)).toBe(false);
  });

  // Control: only a Requested order has an acceptance window at all.
  it('never reports expiry for an order past the request stage', () => {
    expect(isAcceptanceExpired(2, 0)).toBe(false);
    expect(isAcceptanceExpired(7, -100)).toBe(false);
    expect(isAcceptanceExpired(3, 0)).toBe(false);
  });
});

describe('canActOnOrderRequest', () => {
  it('lets the chef accept or reject inside the window', () => {
    expect(canActOnOrderRequest(1, 600)).toBe(true);
    expect(canActOnOrderRequest(1, null)).toBe(true);
  });

  it('hides the buttons once the window has closed', () => {
    expect(canActOnOrderRequest(1, 0)).toBe(false);
  });

  // Control: an accepted order has no accept/reject buttons to begin with.
  it('is false for any other status', () => {
    expect(canActOnOrderRequest(2, 600)).toBe(false);
    expect(canActOnOrderRequest(undefined, 600)).toBe(false);
  });
});
