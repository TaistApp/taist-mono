import { IOrder } from '../../app/types/index';
import {
  MISSED_ORDER_WINDOW_SEC,
  countMissedChefOrders,
} from '../../app/utils/orderPartition';

const NOW = 1789227600;
const HOUR = 3600;

const order = (o: Partial<IOrder>): IOrder =>
  ({ order_date: NOW - HOUR, ...o } as IOrder);

/**
 * Chef home has only REQUESTED and ACCEPTED tabs, so a cancelled order — or
 * one auto-cancelled when the acceptance window lapsed — vanishes from the
 * screen the chef is watching, with nothing anywhere to say it existed. The
 * banner counts those so home can point at the Orders tab.
 */
describe('missed chef orders', () => {
  it('counts an order cancelled out from under the chef', () => {
    expect(countMissedChefOrders([order({ status: 4 })], NOW)).toBe(1);
  });

  it('counts a requested order whose acceptance window lapsed', () => {
    const lapsed = order({ status: 1, acceptance_deadline: NOW - 60 });

    expect(countMissedChefOrders([lapsed], NOW)).toBe(1);
  });

  it('ignores orders still visible on the dashboard', () => {
    const live = [
      order({ status: 1, acceptance_deadline: NOW + HOUR }), // still Requested
      order({ status: 2 }), // Accepted
      order({ status: 7 }), // On my way
    ];

    expect(countMissedChefOrders(live, NOW)).toBe(0);
  });

  it('ignores completed orders so the banner is not permanent', () => {
    expect(countMissedChefOrders([order({ status: 3 })], NOW)).toBe(0);
  });

  it('drops cancellations older than the window', () => {
    const old = order({ status: 4, order_date: NOW - MISSED_ORDER_WINDOW_SEC - HOUR });

    expect(countMissedChefOrders([old], NOW)).toBe(0);
  });

  it('ignores an order with no slot time rather than guessing', () => {
    expect(countMissedChefOrders([order({ status: 4, order_date: undefined })], NOW)).toBe(0);
  });

  // Control: a realistic mixed list counts only the two that left the dashboard.
  it('counts only what the dashboard cannot show', () => {
    const mixed = [
      order({ status: 1, acceptance_deadline: NOW + HOUR }),
      order({ status: 2 }),
      order({ status: 3 }),
      order({ status: 4 }),
      order({ status: 1, acceptance_deadline: NOW - 1 }),
    ];

    expect(countMissedChefOrders(mixed, NOW)).toBe(2);
  });
});
