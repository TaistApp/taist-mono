import moment from 'moment-timezone';

import {
  findTodaysFirstActiveOrder,
  isExpiredOrder,
  orderMatchesTab,
} from '../../app/utils/orderPartition';

const NOW = 1_800_000_000;

describe('isExpiredOrder', () => {
  it('treats status 6 as expired', () => {
    expect(isExpiredOrder({ status: 6 }, NOW)).toBe(true);
  });

  it('treats a requested order past its acceptance deadline as expired', () => {
    expect(isExpiredOrder({ status: 1, acceptance_deadline: NOW - 60 }, NOW)).toBe(true);
  });

  it('handles string deadlines from the API', () => {
    expect(isExpiredOrder({ status: 1, acceptance_deadline: `${NOW - 60}` }, NOW)).toBe(true);
  });

  it('control: a requested order inside its window is NOT expired', () => {
    expect(isExpiredOrder({ status: 1, acceptance_deadline: NOW + 600 }, NOW)).toBe(false);
  });

  it('control: accepted/completed orders are never expired', () => {
    expect(isExpiredOrder({ status: 2, acceptance_deadline: NOW - 60 }, NOW)).toBe(false);
    expect(isExpiredOrder({ status: 3 }, NOW)).toBe(false);
  });

  it('a requested order with no deadline is not expired', () => {
    expect(isExpiredOrder({ status: 1 }, NOW)).toBe(false);
  });
});

describe('orderMatchesTab', () => {
  const REQUESTED = { status: 1 };
  const ACCEPTED = { status: 2, status1: 7 };
  const EXPIRED_TAB = { expired: true };

  it('requested tab excludes expired requested orders', () => {
    expect(orderMatchesTab({ status: 1, acceptance_deadline: NOW - 1 }, REQUESTED, NOW)).toBe(false);
  });

  it('requested tab includes live requested orders', () => {
    expect(orderMatchesTab({ status: 1, acceptance_deadline: NOW + 600 }, REQUESTED, NOW)).toBe(true);
  });

  it('expired tab collects both status-6 and deadline-passed orders', () => {
    expect(orderMatchesTab({ status: 6 }, EXPIRED_TAB, NOW)).toBe(true);
    expect(orderMatchesTab({ status: 1, acceptance_deadline: NOW - 1 }, EXPIRED_TAB, NOW)).toBe(true);
    expect(orderMatchesTab({ status: 2 }, EXPIRED_TAB, NOW)).toBe(false);
  });

  it('accepted tab matches secondary status (OnMyWay regression guard)', () => {
    expect(orderMatchesTab({ status: 7 }, ACCEPTED, NOW)).toBe(true);
    expect(orderMatchesTab({ status: 2 }, ACCEPTED, NOW)).toBe(true);
  });
});

describe('findTodaysFirstActiveOrder', () => {
  const tz = 'America/Indiana/Indianapolis';
  const now = moment.tz('2026-08-13 09:00', tz);
  const todayNoon = moment.tz('2026-08-13 12:00', tz).unix();
  const todayThree = moment.tz('2026-08-13 15:00', tz).unix();
  const tomorrowNoon = moment.tz('2026-08-14 12:00', tz).unix();

  it('returns the earliest of today\'s accepted orders', () => {
    const first = findTodaysFirstActiveOrder(
      [
        { id: 2, status: 2, order_date: todayThree, order_date_string: '2026-08-13', timezone: tz },
        { id: 1, status: 7, order_date: todayNoon, order_date_string: '2026-08-13', timezone: tz },
      ],
      now,
    );
    expect(first?.id).toBe(1);
  });

  it('ignores orders on other days and non-active statuses', () => {
    expect(
      findTodaysFirstActiveOrder(
        [
          { id: 1, status: 2, order_date: tomorrowNoon, order_date_string: '2026-08-14', timezone: tz },
          { id: 2, status: 1, order_date: todayNoon, order_date_string: '2026-08-13', timezone: tz },
          { id: 3, status: 3, order_date: todayNoon, order_date_string: '2026-08-13', timezone: tz },
        ],
        now,
      ),
    ).toBeUndefined();
  });

  it('derives the day from the unix order_date when no date string exists', () => {
    const first = findTodaysFirstActiveOrder(
      [{ id: 9, status: 2, order_date: todayNoon, timezone: tz }],
      now,
    );
    expect(first?.id).toBe(9);
  });
});
