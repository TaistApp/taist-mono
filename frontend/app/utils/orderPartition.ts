import moment from 'moment-timezone';

import { IOrder } from '../types/index';

// ORDER STATUS: 1 Requested, 2 Accepted, 3 Completed, 4 Cancelled, 5 Rejected, 6 Expired, 7 OnMyWay

/**
 * An order is "expired" for chef-list purposes when the acceptance window has
 * closed without the chef acting: explicit status 6, or a still-Requested
 * order whose acceptance deadline is in the past (the 5-minute expiry sweep
 * hasn't caught it yet). These must not clutter the active Requested list —
 * the chef can no longer act on them.
 */
export const isExpiredOrder = (order: IOrder, nowSec: number = Math.floor(Date.now() / 1000)): boolean => {
  if (order.status === 6) {
    return true;
  }
  return (
    order.status === 1 &&
    !!order.acceptance_deadline &&
    nowSec > parseInt(order.acceptance_deadline.toString(), 10)
  );
};

/**
 * True when the order matches the tab's status (or secondary status1), with
 * expired orders routed exclusively to the EXPIRED tab.
 */
export const orderMatchesTab = (
  order: IOrder,
  tab: { status?: number; status1?: number; expired?: boolean } | undefined,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean => {
  if (!tab) return false;
  const expired = isExpiredOrder(order, nowSec);
  if (tab.expired) {
    return expired;
  }
  if (expired) {
    return false;
  }
  return order.status === tab.status || (!!tab.status1 && order.status === tab.status1);
};

/**
 * The chef's first still-active order (Accepted or OnMyWay) scheduled for
 * today in the order's own timezone — the one the app should open to on the
 * day of the order. Returns undefined when today has no active orders.
 *
 * `now` is injectable for tests.
 */
export const findTodaysFirstActiveOrder = (
  orders: IOrder[],
  now: moment.Moment = moment(),
): IOrder | undefined => {
  const todays = orders.filter(o => {
    if (o.status !== 2 && o.status !== 7) {
      return false;
    }
    const tz = o.timezone || moment.tz.guess();
    const dayStr =
      (o as any).order_date_new ||
      o.order_date_string ||
      (o.order_date ? moment(o.order_date * 1000).tz(tz).format('YYYY-MM-DD') : '');
    return !!dayStr && dayStr === now.clone().tz(tz).format('YYYY-MM-DD');
  });
  todays.sort((a, b) => (a.order_date ?? 0) - (b.order_date ?? 0));
  return todays[0];
};
