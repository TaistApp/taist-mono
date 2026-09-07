import moment from 'moment';

import {
  allRequestTimeSlots,
  isRequestSlotStillValid,
  requestTimeSlotsForDay,
} from '../../app/utils/requestTimes';

/**
 * Request a Dish used to offer every slot from 8:00 AM regardless of the
 * clock, so at 7 PM a customer could pick "8:00 AM today" and only learn it
 * was impossible after the request was submitted. These lock the picker to
 * the same 2-hour lead rule the chef ordering path enforces server-side.
 */
describe('request-a-dish time slots', () => {
  const at = (iso: string) => moment(iso, 'YYYY-MM-DD HH:mm');

  it('offers the full serving window on a future day', () => {
    const now = at('2026-09-07 19:00');

    const slots = requestTimeSlotsForDay(at('2026-09-08 00:00'), now);

    expect(slots).toHaveLength(allRequestTimeSlots().length);
    expect(slots[0].key).toBe('08:00');
    expect(slots[slots.length - 1].key).toBe('20:30');
  });

  it('drops today\'s slots that have already passed', () => {
    const now = at('2026-09-07 13:00');

    const keys = requestTimeSlotsForDay(at('2026-09-07 00:00'), now).map(s => s.key);

    expect(keys).not.toContain('08:00');
    expect(keys).not.toContain('12:30');
  });

  it('also drops slots inside the two-hour lead window', () => {
    const now = at('2026-09-07 13:00');

    const keys = requestTimeSlotsForDay(at('2026-09-07 00:00'), now).map(s => s.key);

    // 14:30 is 90 minutes out — too soon for a chef to cook it.
    expect(keys).not.toContain('14:00');
    expect(keys).not.toContain('14:30');
    expect(keys[0]).toBe('15:00');
  });

  it('offers nothing once the last slot is inside the lead window', () => {
    const now = at('2026-09-07 19:30');

    expect(requestTimeSlotsForDay(at('2026-09-07 00:00'), now)).toEqual([]);
  });

  it('rejects a slot that is no longer selectable for the chosen day', () => {
    const now = at('2026-09-07 13:00');

    expect(isRequestSlotStillValid(at('2026-09-07 00:00'), '08:00', now)).toBe(false);
    expect(isRequestSlotStillValid(at('2026-09-07 00:00'), '', now)).toBe(false);
  });

  // Control: the same slot on tomorrow's date stays perfectly valid.
  it('keeps a slot that is still reachable', () => {
    const now = at('2026-09-07 13:00');

    expect(isRequestSlotStillValid(at('2026-09-08 00:00'), '08:00', now)).toBe(true);
    expect(isRequestSlotStillValid(at('2026-09-07 00:00'), '18:00', now)).toBe(true);
  });
});
