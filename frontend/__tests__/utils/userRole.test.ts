import {
  USER_TYPE,
  isChefUser,
  isCustomerUser,
  toUserType,
} from '../../app/utils/userRole';

/**
 * Auto-login routed with `userType === 1` and a bare `else` for chef, so any
 * user_type that wasn't literally the number 1 — a string "1" from the API, or
 * a response missing the field — dropped a customer onto the chef stack.
 * Chef must require an explicit chef signal.
 */
describe('user role routing', () => {
  it('treats a numeric string user_type as the role it names', () => {
    expect(toUserType('1')).toBe(USER_TYPE.customer);
    expect(toUserType('2')).toBe(USER_TYPE.chef);
  });

  it('sends a customer to the customer stack even when user_type is a string', () => {
    expect(isChefUser({ user_type: '1' })).toBe(false);
    expect(isCustomerUser({ user_type: '1' })).toBe(true);
  });

  it('never routes to chef without an explicit chef signal', () => {
    for (const value of [undefined, null, '', 'chef', 0, 7, {}, NaN]) {
      expect(isChefUser({ user_type: value })).toBe(false);
    }
    expect(isChefUser(undefined)).toBe(false);
    expect(isChefUser(null)).toBe(false);
    expect(isChefUser({})).toBe(false);
  });

  it('rejects unrecognised values rather than guessing a role', () => {
    expect(toUserType(undefined)).toBeNull();
    expect(toUserType('customer')).toBeNull();
    expect(toUserType(3)).toBeNull();
  });

  // Control: a real chef, as a number and as a string, still reaches the chef
  // stack.
  it('routes an explicit chef to the chef stack', () => {
    expect(isChefUser({ user_type: 2 })).toBe(true);
    expect(isChefUser({ user_type: '2' })).toBe(true);
    expect(isCustomerUser({ user_type: 2 })).toBe(false);
  });
});
