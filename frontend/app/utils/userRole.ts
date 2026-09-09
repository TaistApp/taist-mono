/**
 * Which stack a signed-in user belongs in.
 *
 * `user_type` has no cast on the Laravel model, and routing call sites were
 * split between `=== 1` and `== 1`. /mapi/login does return a JSON number
 * today (verified against staging), so the strict checks are not currently
 * misfiring — but the auto-login path paired `=== 1` with a bare `else` for
 * chef, meaning ANY unexpected value (a missing field, a null, a future
 * string) would put a customer on the chef stack. Normalize once here so
 * every routing decision agrees, and make chef require a positive signal.
 */
export const USER_TYPE = {
  customer: 1,
  chef: 2,
} as const;

type MaybeUser = { user_type?: unknown } | null | undefined;

/** The user's role as a number, or null when the value isn't one we know. */
export const toUserType = (value: unknown): number | null => {
  const parsed = Number(value);
  return parsed === USER_TYPE.customer || parsed === USER_TYPE.chef ? parsed : null;
};

/**
 * Chef only on an explicit chef signal. Anything unrecognised is treated as a
 * customer: sending a chef to the customer stack is a missing-features
 * annoyance, while sending a customer to the chef stack shows them an account
 * surface that isn't theirs.
 */
export const isChefUser = (user: MaybeUser): boolean =>
  toUserType(user?.user_type) === USER_TYPE.chef;

export const isCustomerUser = (user: MaybeUser): boolean => !isChefUser(user);
