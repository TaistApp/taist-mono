import {
  CLOSED_ORDER_LABELS,
  isClosedOrderStatus,
  orderProgressSteps,
} from '../../app/utils/orderProgress';

/**
 * Tapping an order push dropped the customer back on the Home tab moments
 * after the receipt rendered, so there was nowhere to watch an order from.
 * The receipt now carries the progress; these pin the step maths.
 */
const labels = (status: number) =>
  (orderProgressSteps(status) ?? []).map((s) => `${s.label}:${s.state}`);

describe('orderProgressSteps', () => {
  it('marks Requested as the current step with nothing done yet', () => {
    expect(labels(1)).toEqual([
      'Order requested:current',
      'Order accepted:upcoming',
      'Chef on the way:upcoming',
      'Order complete:upcoming',
    ]);
  });

  it('marks Accepted as current and Requested as done', () => {
    expect(labels(2)).toEqual([
      'Order requested:done',
      'Order accepted:current',
      'Chef on the way:upcoming',
      'Order complete:upcoming',
    ]);
  });

  // Status 7 (On My Way) is numerically higher than 3 (Completed), so the step
  // order has to come from a lookup — comparing the raw status would put a
  // chef who is still driving past "Order complete".
  it('places On My Way before Completed despite the higher status number', () => {
    expect(labels(7)).toEqual([
      'Order requested:done',
      'Order accepted:done',
      'Chef on the way:current',
      'Order complete:upcoming',
    ]);
  });

  it('marks every step done once completed', () => {
    expect(labels(3)).toEqual([
      'Order requested:done',
      'Order accepted:done',
      'Chef on the way:done',
      'Order complete:current',
    ]);
  });

  it('shows no progress bar for an order that ended early', () => {
    expect(orderProgressSteps(4)).toBeNull();
    expect(orderProgressSteps(5)).toBeNull();
    expect(orderProgressSteps(6)).toBeNull();
  });

  // Control: an unknown or missing status renders nothing rather than
  // guessing a step.
  it('returns null for an unknown or missing status', () => {
    expect(orderProgressSteps(0)).toBeNull();
    expect(orderProgressSteps(99)).toBeNull();
    expect(orderProgressSteps(null)).toBeNull();
    expect(orderProgressSteps(undefined)).toBeNull();
  });
});

describe('isClosedOrderStatus', () => {
  it('recognises cancelled, rejected and expired', () => {
    expect(isClosedOrderStatus(4)).toBe(true);
    expect(isClosedOrderStatus(5)).toBe(true);
    expect(isClosedOrderStatus(6)).toBe(true);
    expect(CLOSED_ORDER_LABELS[6]).toMatch(/expired/i);
  });

  // Control: an order still in flight is not closed.
  it('does not treat an in-flight order as closed', () => {
    expect(isClosedOrderStatus(1)).toBe(false);
    expect(isClosedOrderStatus(7)).toBe(false);
    expect(isClosedOrderStatus(3)).toBe(false);
    expect(isClosedOrderStatus(null)).toBe(false);
  });
});
