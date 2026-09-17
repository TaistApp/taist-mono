import moment from 'moment';

/**
 * Time-slot rules for the "Request a Dish" path.
 *
 * These mirror the traditional chef-ordering path: the backend drops any
 * same-day slot inside the two-hour lead window (see getTimeSlots /
 * createPoolRequest in MapiController), so the picker must never offer one
 * either. Before this, the dropdown listed 8:00 AM even at 7 PM and the
 * customer only found out after tapping "Send request to chefs".
 */
export const REQUEST_LEAD_HOURS = 2;

/** First and last half-hour slot offered, inclusive. */
export const REQUEST_FIRST_SLOT_HOUR = 8;
export const REQUEST_LAST_SLOT_HOUR = 20;

export type TimeSlot = { key: string; value: string };

/** Every half-hour slot in the serving window, ignoring the calendar. */
export const allRequestTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let h = REQUEST_FIRST_SLOT_HOUR; h <= REQUEST_LAST_SLOT_HOUR; h++) {
    for (const m of [0, 30]) {
      const hhmm = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
      slots.push({ key: hhmm, value: moment(hhmm, 'HH:mm').format('h:mm A') });
    }
  }
  return slots;
};

/**
 * The slots a customer may pick for `day`: everything at least
 * REQUEST_LEAD_HOURS from `now`. Past days yield nothing rather than
 * throwing, so a stale selection can't slip through.
 */
export const requestTimeSlotsForDay = (
  day: moment.Moment,
  now: moment.Moment = moment(),
): TimeSlot[] => {
  const earliest = now.clone().add(REQUEST_LEAD_HOURS, 'hours');
  const date = day.format('YYYY-MM-DD');

  return allRequestTimeSlots().filter(slot =>
    moment(`${date} ${slot.key}`, 'YYYY-MM-DD HH:mm').isSameOrAfter(earliest),
  );
};

/** Whether a previously chosen slot is still selectable for `day`. */
export const isRequestSlotStillValid = (
  day: moment.Moment,
  slot: string,
  now: moment.Moment = moment(),
): boolean =>
  slot !== '' &&
  requestTimeSlotsForDay(day, now).some(option => option.key === slot);
