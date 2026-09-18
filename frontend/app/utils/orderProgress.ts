/**
 * The four steps a customer's order actually moves through.
 *
 * Tapping an order push used to drop the customer back on the Home tab a
 * moment after the receipt appeared, so there was nowhere to watch an order
 * from. The receipt now carries the progress itself, and nothing navigates
 * away on its own.
 */
export const ORDER_PROGRESS_STEPS = [
  { key: 'requested', label: 'Order requested', status: 1 },
  { key: 'accepted', label: 'Order accepted', status: 2 },
  { key: 'on_my_way', label: 'Chef on the way', status: 7 },
  { key: 'completed', label: 'Order complete', status: 3 },
] as const;

export type OrderProgressState = 'done' | 'current' | 'upcoming';

export type OrderProgressStep = {
  key: string;
  label: string;
  state: OrderProgressState;
};

/**
 * Status numbers in the order they happen. The raw status column is not
 * ordered — Completed is 3 but happens after On My Way (7) — so the step index
 * has to be looked up, never compared numerically.
 */
const STEP_INDEX_BY_STATUS: Record<number, number> = {
  1: 0,
  2: 1,
  7: 2,
  3: 3,
};

/** Orders that ended without being delivered. */
export const CLOSED_ORDER_LABELS: Record<number, string> = {
  4: 'This order was cancelled.',
  5: 'Your chef declined this order.',
  6: 'This order expired before your chef accepted it.',
};

export const isClosedOrderStatus = (status?: number | null): boolean =>
  status != null && status in CLOSED_ORDER_LABELS;

/**
 * Steps for the progress bar, or null when there is no progress to show —
 * an order that was cancelled, declined or expired, and any status the app
 * does not recognise.
 */
export const orderProgressSteps = (
  status?: number | null,
): OrderProgressStep[] | null => {
  if (status == null) return null;
  const currentIndex = STEP_INDEX_BY_STATUS[status];
  if (currentIndex === undefined) return null;

  return ORDER_PROGRESS_STEPS.map((step, idx) => ({
    key: step.key,
    label: step.label,
    state:
      idx < currentIndex ? 'done' : idx === currentIndex ? 'current' : 'upcoming',
  }));
};
